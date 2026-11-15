/**
 * Rapor derleme, kalite kontrolü ve dışa aktarma kullanım senaryoları
 * (bkz. MIH-REQ-RPT-001 … 009, MIH-REQ-QLT-001 … 004).
 *
 * Tek kanonik `ReportDocument` oluşturulur; A4 önizleme ve DOCX çıktısı aynı
 * revizyondan üretilir. Uzman onayı ayrı bir olaydır; eksik veriyle rapor
 * tamamlanmış gösterilemez.
 */
import { computeQualityChecks, reportStatusFromChecks } from "../../domain/qualityChecks.ts";
import type {
  ReportDocument,
  ReportRevision,
  ReportSourceVersions,
} from "../../domain/types.ts";
import { buildReportViewModel } from "../reportBuilder.ts";
import type { ReportViewModel } from "../reportViewModel.ts";
import type { TaskBundle } from "../taskBundle.ts";
import { audit, type Actor, type AppContext, type TaskRepositories } from "../context.ts";
import { loadTaskBundle } from "./loadTaskBundle.ts";

export interface BuildReportResult {
  report: ReportDocument;
  revision: ReportRevision;
  viewModel: ReportViewModel;
  bundle: TaskBundle;
}

/**
 * Raporu derler: `ReportDocument` yoksa oluşturur, yeni revizyon ekler ve
 * kalite kontrollerini gerçek veriden hesaplar.
 */
export function buildReport(
  ctx: AppContext,
  repos: TaskRepositories,
  actor: Actor,
  taskId: string,
  reason: string,
): BuildReportResult {
  const bundle = loadTaskBundle(ctx, repos, taskId);
  const now = ctx.clock.now();

  let report = repos.reports.findByTask();
  if (!report) {
    report = {
      reportId: ctx.ids.next("rapor"),
      taskId,
      status: "taslak",
      currentRevisionId: "",
      synthetic: true,
      createdAt: now,
      updatedAt: now,
    };
    repos.reports.insert(report);
  }

  const sourceVersions: ReportSourceVersions = {
    materialIds: bundle.materials.map((item) => item.materialId),
    audioIds: bundle.audios.map((item) => item.audioId),
    transcriptVersionIds: bundle.transcriptVersions.map((item) => item.versionId),
    questionIds: bundle.questions.map((item) => item.questionId),
    answerIds: bundle.answers.map((item) => `${item.answerId}@v${item.version}`),
    evidenceIds: bundle.evidence.map((item) => item.evidenceId),
    findingIds: bundle.findings.map((item) => item.findingId),
  };

  const revisionNo = repos.reports.nextRevisionNo(report.reportId);
  const revision: ReportRevision = {
    revisionId: ctx.ids.next("revizyon"),
    taskId,
    reportId: report.reportId,
    revisionNo,
    reason,
    createdBy: actor.name,
    createdAt: now,
    sourceVersions,
  };
  repos.reports.insertRevision(revision);

  const viewModel = buildReportViewModel(bundle, {
    revisionNo,
    revisionId: revision.revisionId,
    generatedAt: now,
    expertName: actor.name,
  });

  const checks = computeQualityChecks({
    taskId,
    reportId: report.reportId,
    revisionId: revision.revisionId,
    now,
    assignmentConfirmed: bundle.fields.every((field) => field.confirmation !== "teyit-bekliyor"),
    materials: bundle.materials,
    audios: bundle.audios,
    transcriptVersions: bundle.transcriptVersions,
    segments: bundle.latestSegments,
    questions: bundle.questions,
    answers: bundle.answers,
    evidence: bundle.evidence,
    findings: bundle.findings,
    findingEvidence: bundle.findingEvidence,
    approved: bundle.approved,
  });
  repos.reports.replaceQualityChecks(checks);

  const status = reportStatusFromChecks(checks, bundle.approved);
  repos.reports.updateStatus(status, revision.revisionId, now);

  audit(repos, ctx, taskId, actor, "rapor-derlendi", "ReportDocument", report.reportId, {
    revisionNo,
    reason,
    status,
    blocking: checks.filter((check) => check.status === "engel").length,
  });

  return {
    report: { ...report, status, currentRevisionId: revision.revisionId, updatedAt: now },
    revision,
    viewModel,
    bundle,
  };
}

/** Raporu A4 önizleme/çıktı için hazırlar; yeni revizyon üretmez. */
export function previewReport(
  ctx: AppContext,
  repos: TaskRepositories,
  taskId: string,
): { viewModel: ReportViewModel; bundle: TaskBundle } {
  const report = repos.reports.findByTask();
  if (!report || !report.currentRevisionId) {
    throw new Error("Rapor henüz derlenmedi; önce rapor oluşturulmalıdır.");
  }
  const revision = repos.reports.findRevision(report.currentRevisionId);
  if (!revision) {
    throw new Error("Rapor revizyonu bulunamadı.");
  }
  const bundle = loadTaskBundle(ctx, repos, taskId);
  const viewModel = buildReportViewModel(bundle, {
    revisionNo: revision.revisionNo,
    revisionId: revision.revisionId,
    generatedAt: revision.createdAt,
    expertName: revision.createdBy,
  });
  return { viewModel, bundle };
}

/**
 * Uzman onayı. Otomatik kontrol geçmiş olsa bile onay yerine geçmez
 * (bkz. MIH-REQ-QLT-003, MIH-REQ-QLT-004). Engel varsa onay reddedilir.
 */
export function approveReport(
  ctx: AppContext,
  repos: TaskRepositories,
  actor: Actor,
  taskId: string,
  note: string,
): void {
  const report = repos.reports.findByTask();
  if (!report) {
    throw new Error("Onaylanacak rapor bulunamadı.");
  }
  const checks = repos.reports.listQualityChecks(report.reportId);
  const blocking = checks.filter((check) => check.status === "engel");
  if (blocking.length > 0) {
    throw new Error(
      `Rapor onaylanamaz: ${blocking.length} engelleyici kontrol var ` +
        `(${blocking.map((check) => check.label).join(", ")}).`,
    );
  }
  const now = ctx.clock.now();
  repos.reports.insertApproval({
    approvalId: ctx.ids.next("onay"),
    taskId,
    reportId: report.reportId,
    kind: "rapor-onayı",
    actorName: actor.name,
    actorRole: actor.role,
    occurredAt: now,
    note,
  });
  repos.reports.updateStatus("onaylandı", report.currentRevisionId, now);
  repos.tasks.updateStatus(taskId, "tamamlandı", now);
  audit(repos, ctx, taskId, actor, "rapor-onaylandi", "ReportDocument", report.reportId, { note });
}
