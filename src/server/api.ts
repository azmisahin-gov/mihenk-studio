/**
 * Yerel servis API'si (bkz. ADR-001, ADR-019).
 *
 * Arayüz bu servis üzerinden uygulama kullanım senaryolarına erişir. Servis
 * yalnızca `127.0.0.1` üzerinde dinler ve rastgele bir belirteçle korunur.
 * Ağ üzerinden dışarıya veri gönderilmez (bkz. MIH-REQ-PLT-002).
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import type { AppContext } from "../application/context.ts";
import { DEFAULT_ACTOR, audit, repositoriesFor, type Actor } from "../application/context.ts";
import { createTaskDraft, confirmField, startTask } from "../application/usecases/createTaskDraft.ts";
import { saveTranscriptCorrection, markSegmentReviewed } from "../application/usecases/saveTranscriptCorrection.ts";
import {
  createEvidence,
  createFinding,
  linkAnswerEvidence,
  saveAnswer,
  verifyFinding,
} from "../application/usecases/answerEvidenceFinding.ts";
import { approveReport, buildReport, previewReport } from "../application/usecases/buildReport.ts";
import { cancelExportJob, exportReportDocx } from "../application/usecases/exportReport.ts";
import { loadTaskBundle } from "../application/usecases/loadTaskBundle.ts";
import { computeQualityChecks, summarizeChecks } from "../domain/qualityChecks.ts";
import { listStaticScreens } from "./staticScreens.ts";
import { GOLDEN_ASSIGNMENT } from "../infrastructure/seed/goldenScenario.ts";
import type { Task } from "../domain/types.ts";
import type { TaskBundle } from "../application/taskBundle.ts";

export interface ServerOptions {
  ctx: AppContext;
  /** Arayüz derlemesinin bulunduğu klasör; yoksa API yine çalışır. */
  uiRoot?: string;
  actor?: Actor;
  /** Belirteç doğrulamasını kapatır (yalnızca testler için). */
  disableAuth?: boolean;
}

interface ApiResponse {
  status: number;
  body?: unknown;
  bytes?: Uint8Array;
  contentType?: string;
  headers?: Record<string, string>;
}

export function createApiServer(options: ServerOptions): { server: Server; token: string } {
  const token = randomBytes(24).toString("hex");
  const actor = options.actor ?? DEFAULT_ACTOR;
  const server = createServer((req, res) => {
    void handle(req, res, options, actor, token);
  });
  return { server, token };
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString("utf8");
  return text.trim().length === 0 ? {} : (JSON.parse(text) as Record<string, unknown>);
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  options: ServerOptions,
  actor: Actor,
  token: string,
): Promise<void> {
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname.startsWith("/api/")) {
      if (!options.disableAuth) {
        const provided = req.headers["x-mihenk-token"];
        if (provided !== token) {
          sendJson(res, 401, { error: "Yetkisiz istek: yerel servis belirteci geçersiz." });
          return;
        }
      }
      const result = await route(req, url, options.ctx, actor);
      if (result.bytes) {
        res.writeHead(result.status, {
          "content-type": result.contentType ?? "application/octet-stream",
          ...(result.headers ?? {}),
        });
        res.end(Buffer.from(result.bytes));
        return;
      }
      sendJson(res, result.status, result.body ?? {});
      return;
    }
    serveStatic(res, url.pathname, options.uiRoot, token);
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(payload);
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function serveStatic(res: ServerResponse, pathname: string, uiRoot?: string, token?: string): void {
  if (!uiRoot) {
    sendJson(res, 404, { error: "Arayüz derlemesi bulunamadı. `npm run build:ui` çalıştırın." });
    return;
  }
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const candidate = resolve(uiRoot, relative);
  const rootResolved = resolve(uiRoot);
  if (!candidate.startsWith(rootResolved)) {
    sendJson(res, 403, { error: "Geçersiz yol." });
    return;
  }
  const target = existsSync(candidate) ? candidate : join(rootResolved, "index.html");
  if (!existsSync(target)) {
    sendJson(res, 404, { error: "Dosya bulunamadı." });
    return;
  }
  let bytes = readFileSync(target);
  // Yerel servis belirteci arayüze yalnızca aynı makineden sunulan sayfada verilir.
  if (token && extname(target) === ".html") {
    const injected = Buffer.from(bytes)
      .toString("utf8")
      .replace("</head>", `<script>window.__MIHENK_TOKEN__ = ${JSON.stringify(token)};</script></head>`);
    bytes = Buffer.from(injected, "utf8");
  }
  res.writeHead(200, { "content-type": MIME[extname(target)] ?? "application/octet-stream" });
  res.end(bytes);
}

async function route(
  req: IncomingMessage,
  url: URL,
  ctx: AppContext,
  actor: Actor,
): Promise<ApiResponse> {
  const method = req.method ?? "GET";
  const parts = url.pathname.split("/").filter(Boolean); // ["api", ...]

  if (parts[1] === "health") {
    return { status: 200, body: { ok: true, schema: "mihenk-studio", synthetic: true } };
  }

  if (parts[1] === "meta" && method === "GET") {
    return {
      status: 200,
      body: {
        screens: listStaticScreens(),
        goldenScenario: {
          title: GOLDEN_ASSIGNMENT.title,
          caseNumber: GOLDEN_ASSIGNMENT.caseNumber,
          authority: GOLDEN_ASSIGNMENT.authority,
        },
      },
    };
  }

  if (parts[1] === "tasks" && parts.length === 2 && method === "GET") {
    const tasks = repositoriesFor(ctx, "kapsam-dışı").tasks.listAll();
    return {
      status: 200,
      body: tasks.map((task) => {
        const repos = repositoriesFor(ctx, task.taskId);
        const bundle = loadTaskBundle(ctx, repos, task.taskId);
        return summarizeTask(task, bundle);
      }),
    };
  }

  // Görev oluşturma: belge içeriği sentetik metin olarak gönderilir.
  if (parts[1] === "tasks" && parts.length === 2 && method === "POST") {
    const body = await readJson(req);
    const taskId = ctx.ids.next("gorev");
    const repos = repositoriesFor(ctx, taskId);
    const documentText = String(body.documentText ?? "Sentetik görevlendirme belgesi");
    const created = createTaskDraft(ctx, repos, actor, {
      taskId,
      title: String(body.title ?? "Yeni sentetik görev"),
      caseNumber: String(body.caseNumber ?? "2026/0000 S. (SENTETİK)"),
      authority: String(body.authority ?? "Örnek Merci (SENTETİK)"),
      dueDate: String(body.dueDate ?? "01 Aralık 2026"),
      kind: String(body.kind ?? "Sentetik"),
      documentName: String(body.documentName ?? "Sentetik_Gorevlendirme.pdf"),
      documentBytes: new TextEncoder().encode(documentText),
      documentMimeType: "application/pdf",
      documentType: "Görevlendirme yazısı (sentetik)",
      pageCount: Number(body.pageCount ?? 1),
      fields: Array.isArray(body.fields)
        ? (body.fields as Record<string, unknown>[]).map((field) => ({
            key: String(field.key ?? "Alan"),
            value: String(field.value ?? ""),
            sourcePage: Number(field.sourcePage ?? 1),
            sourceRegion: String(field.sourceRegion ?? "belge gövdesi"),
            confidence: Number(field.confidence ?? 0.8),
            uncertain: field.uncertain === true,
          }))
        : [],
      expectedMaterials: Array.isArray(body.expectedMaterials)
        ? (body.expectedMaterials as Record<string, unknown>[]).map((item) => ({
            label: String(item.label ?? "Materyal"),
            kind: String(item.kind ?? "ses"),
            sourceNote: String(item.sourceNote ?? "Sentetik"),
          }))
        : [],
    });
    return {
      status: 201,
      body: {
        taskId: created.task.taskId,
        pendingConfirmation: created.pendingConfirmation.length,
        fieldCount: created.fields.length,
      },
    };
  }

  if (parts[1] === "tasks" && parts.length >= 3) {
    const taskId = parts[2] as string;
    const repos = repositoriesFor(ctx, taskId);
    const task = repos.tasks.findById(taskId);
    if (!task) return { status: 404, body: { error: `Görev bulunamadı: ${taskId}` } };
    const section = parts[3];

    if (!section && method === "GET") {
      const bundle = loadTaskBundle(ctx, repos, taskId);
      return { status: 200, body: { summary: summarizeTask(task, bundle), bundle: serializeBundle(bundle) } };
    }

    if (section === "start" && method === "POST") {
      startTask(ctx, repos, actor, taskId);
      return { status: 200, body: { ok: true } };
    }

    if (section === "fields" && parts[4] && parts[5] === "confirm" && method === "POST") {
      const body = await readJson(req);
      confirmField(ctx, repos, actor, taskId, parts[4], String(body.value ?? ""));
      return { status: 200, body: { ok: true } };
    }

    if (section === "answers" && method === "POST") {
      const body = await readJson(req);
      const answer = saveAnswer(ctx, repos, actor, taskId, {
        questionId: String(body.questionId ?? ""),
        text: String(body.text ?? ""),
        complete: body.complete === true,
      });
      return { status: 200, body: { answerId: answer.answerId, status: answer.status, version: answer.version } };
    }

    if (section === "answers" && parts[4] && parts[5] === "evidence" && method === "POST") {
      const body = await readJson(req);
      linkAnswerEvidence(ctx, repos, actor, taskId, parts[4], String(body.evidenceId ?? ""));
      return { status: 200, body: { ok: true } };
    }

    if (section === "evidence" && method === "POST") {
      const body = await readJson(req);
      const kind = String(body.kind ?? "ses-segmenti");
      const evidence =
        kind === "belge"
          ? createEvidence(ctx, repos, actor, taskId, {
              kind: "belge",
              materialId: String(body.materialId ?? ""),
              page: Number(body.page ?? 1),
              region: String(body.region ?? ""),
              note: String(body.note ?? ""),
            })
          : createEvidence(ctx, repos, actor, taskId, {
              kind: "ses-segmenti",
              audioId: String(body.audioId ?? ""),
              segmentId: String(body.segmentId ?? ""),
              note: String(body.note ?? ""),
            });
      return { status: 201, body: { evidenceId: evidence.evidenceId, kind: evidence.kind } };
    }

    if (section === "findings" && method === "POST") {
      const body = await readJson(req);
      const finding = createFinding(ctx, repos, actor, taskId, {
        code: String(body.code ?? "B-XX"),
        title: String(body.title ?? "Bulgu"),
        description: String(body.description ?? ""),
        severity: (body.severity as "düşük" | "orta" | "yüksek") ?? "orta",
        evidenceIds: Array.isArray(body.evidenceIds) ? (body.evidenceIds as string[]) : [],
      });
      return { status: 201, body: { findingId: finding.findingId } };
    }

    if (section === "findings" && parts[4] && parts[5] === "verify" && method === "POST") {
      const body = await readJson(req);
      verifyFinding(ctx, repos, actor, taskId, parts[4], String(body.note ?? ""));
      return { status: 200, body: { ok: true } };
    }

    if (section === "transcript" && parts[4] === "corrections" && method === "POST") {
      const body = await readJson(req);
      const result = saveTranscriptCorrection(ctx, repos, actor, taskId, {
        audioId: String(body.audioId ?? ""),
        note: String(body.note ?? ""),
        corrections: Array.isArray(body.corrections)
          ? (body.corrections as Record<string, unknown>[]).map((item) => ({
              segmentId: String(item.segmentId ?? ""),
              text: String(item.text ?? ""),
              uncertain: item.uncertain === true,
              priorityReason: (item.priorityReason as string | null) ?? null,
            }))
          : [],
      });
      return { status: 200, body: { versionId: result.version.versionId, kind: result.version.kind } };
    }

    if (section === "transcript" && parts[4] === "review" && method === "POST") {
      const body = await readJson(req);
      markSegmentReviewed(ctx, repos, actor, taskId, String(body.segmentId ?? ""));
      return { status: 200, body: { ok: true } };
    }

    if (section === "report" && parts.length === 4 && method === "GET") {
      const { viewModel } = previewReport(ctx, repos, taskId);
      const report = repos.reports.findByTask();
      const checks = report ? repos.reports.listQualityChecks(report.reportId) : [];
      const approvals = report ? repos.reports.listApprovals(report.reportId) : [];
      return {
        status: 200,
        body: {
          viewModel,
          checks,
          summary: summarizeChecks(checks),
          status: report?.status ?? "taslak",
          revisionNo: report ? repos.reports.listRevisions(report.reportId).length : 0,
          approvals,
        },
      };
    }

    if (section === "report" && parts[4] === "build" && method === "POST") {
      const body = await readJson(req);
      const result = buildReport(ctx, repos, actor, taskId, String(body.reason ?? "Rapor yeniden derlendi"));
      return {
        status: 200,
        body: { reportId: result.report.reportId, revisionId: result.revision.revisionId, status: result.report.status },
      };
    }

    if (section === "report" && parts[4] === "approve" && method === "POST") {
      const body = await readJson(req);
      approveReport(ctx, repos, actor, taskId, String(body.note ?? ""));
      return { status: 200, body: { ok: true } };
    }

    if (section === "report" && parts[4] === "export" && method === "POST") {
      const body = await readJson(req);
      const result = await exportReportDocx(ctx, repos, actor, taskId, {
        idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
        simulateFailure: body.simulateFailure === true,
      });
      return {
        status: 200,
        bytes: result.bytes,
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers: {
          // RFC 5987: ASCII yedek ad + UTF-8 tam ad birlikte verilir.
          "content-disposition":
            `attachment; filename="${asciiFileName(result.fileName)}"; ` +
            `filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
          "x-mihenk-job-id": result.jobId,
          "x-mihenk-page-count": String(result.pageCountHint),
          // HTTP başlıkları yalnızca ASCII taşır; Türkçe uyarı yüzde kodlamayla verilir.
          "x-mihenk-notice": encodeURIComponent(result.notice),
        },
      };
    }

    if (section === "jobs" && parts.length === 4 && method === "GET") {
      return { status: 200, body: repos.jobs.listByTask(taskId) };
    }

    if (section === "jobs" && parts[4] && parts[5] === "cancel" && method === "POST") {
      cancelExportJob(ctx, repos, actor, taskId, parts[4]);
      return { status: 200, body: { ok: true } };
    }

    if (section === "audit" && method === "GET") {
      return { status: 200, body: repos.audit.listByTask(taskId) };
    }
  }

  return { status: 404, body: { error: `Bilinmeyen uç nokta: ${req.method} ${url.pathname}` } };
}

function summarizeTask(
  task: Task,
  bundle: TaskBundle,
): Record<string, unknown> {
  return {
    taskId: task.taskId,
    title: task.title,
    caseNumber: task.caseNumber,
    authority: task.authority,
    dueDate: task.dueDate,
    status: task.status,
    kind: task.kind,
    synthetic: task.synthetic,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    counts: {
      materials: bundle.materials.length,
      audios: bundle.audios.length,
      questions: bundle.questions.length,
      answers: bundle.answers.filter((answer) => answer.status === "tamamlandı").length,
      evidence: bundle.evidence.length,
      findings: bundle.findings.length,
      segments: bundle.latestSegments.length,
      pendingConfirmation: bundle.fields.filter((field) => field.confirmation === "teyit-bekliyor").length,
      unreviewedSegments: bundle.latestSegments.filter((segment) => segment.reviewState === "bekliyor").length,
    },
    approved: bundle.approved,
  };
}

function serializeBundle(bundle: import("../application/taskBundle.ts").TaskBundle): unknown {
  const lookupMaterials = new Map(bundle.materials.map((item) => [item.materialId, item.originalName]));
  const lookupAudios = new Map(
    bundle.audios.map((audio) => [audio.audioId, lookupMaterials.get(audio.materialId) ?? audio.audioId]),
  );
  return {
    task: bundle.task,
    assignments: bundle.assignments,
    fields: bundle.fields,
    expectedMaterials: bundle.expectedMaterials,
    materials: bundle.materials,
    audios: bundle.audios.map((audio) => ({
      ...audio,
      fileName: lookupMaterials.get(audio.materialId) ?? audio.audioId,
    })),
    transcriptVersions: bundle.transcriptVersions,
    latestSegments: bundle.latestSegments,
    rawSegments: bundle.rawSegments,
    questions: bundle.questions,
    answers: bundle.answers,
    evidence: bundle.evidence.map((item) => ({
      ...item,
      label:
        item.kind === "belge"
          ? `${lookupMaterials.get(item.materialId) ?? item.materialId} · Sayfa ${item.page}`
          : `${lookupAudios.get(item.audioId) ?? item.audioId} · ${formatMs(item.startMs)}–${formatMs(item.endMs)}`,
    })),
    findings: bundle.findings,
    findingEvidence: bundle.findingEvidence,
    answerEvidence: bundle.answerEvidence,
    approved: bundle.approved,
  };
}

/** ASCII olmayan karakterleri yedek ada çevirir; tam ad `filename*` ile verilir. */
function asciiFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(ms % 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export { computeQualityChecks, audit };
