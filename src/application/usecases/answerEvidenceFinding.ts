/**
 * Yanıt, dayanak ve bulgu kullanım senaryoları
 * (bkz. MIH-REQ-QST-002 … 007).
 *
 * Dayanak gerçek bir hedefe bağlanır; dayanaksız bulgu oluşturulamaz. Her
 * değişiklik denetim izine yazılır ve rapor revizyonu gerektirir.
 */
import { assertEvidenceTarget, assertFindingHasEvidence } from "../../domain/validation.ts";
import type { Answer, EvidenceRef, Finding, FindingSeverity } from "../../domain/types.ts";
import { audit, type Actor, type AppContext, type TaskRepositories } from "../context.ts";

// ---------------------------------------------------------------------------
// Yanıt
// ---------------------------------------------------------------------------

export interface SaveAnswerInput {
  questionId: string;
  text: string;
  /** true ise yanıt tamamlanmış sayılır; aksi hâlde taslak kalır. */
  complete: boolean;
}

export function saveAnswer(
  ctx: AppContext,
  repos: TaskRepositories,
  actor: Actor,
  taskId: string,
  input: SaveAnswerInput,
): Answer {
  const question = repos.questions.findById(input.questionId);
  if (!question) {
    throw new Error(`Soru bulunamadı veya bu göreve ait değil: ${input.questionId}`);
  }
  const existing = repos.answers.findByQuestion(input.questionId);
  const trimmed = input.text.trim();
  const status = input.complete && trimmed.length > 0 ? "tamamlandı" : trimmed.length > 0 ? "taslak" : "boş";
  const answer: Answer = {
    answerId: existing?.answerId ?? ctx.ids.next("yanit"),
    taskId,
    questionId: input.questionId,
    text: trimmed,
    status,
    version: (existing?.version ?? 0) + 1,
    answeredBy: actor.name,
    updatedAt: ctx.clock.now(),
  };
  repos.answers.upsert(answer);
  audit(repos, ctx, taskId, actor, "yanit-kaydedildi", "Answer", answer.answerId, {
    questionId: input.questionId,
    version: answer.version,
    status: answer.status,
  });
  return answer;
}

// ---------------------------------------------------------------------------
// Dayanak
// ---------------------------------------------------------------------------

export type CreateEvidenceInput =
  | { kind: "belge"; materialId: string; page: number; region: string; note: string }
  | { kind: "ses-segmenti"; audioId: string; segmentId: string; note: string };

export interface CreateEvidenceResult {
  evidence: EvidenceRef;
}

export function createEvidence(
  ctx: AppContext,
  repos: TaskRepositories,
  actor: Actor,
  taskId: string,
  input: CreateEvidenceInput,
): EvidenceRef {
  const now = ctx.clock.now();
  let evidence: EvidenceRef;

  if (input.kind === "belge") {
    const material = repos.materials.findById(input.materialId);
    if (!material) {
      throw new Error(`Belge dayanağı için materyal bulunamadı: ${input.materialId}`);
    }
    evidence = {
      evidenceId: ctx.ids.next("dayanak"),
      taskId,
      kind: "belge",
      materialId: input.materialId,
      page: input.page,
      region: input.region,
      note: input.note,
      createdAt: now,
    };
  } else {
    const segment = repos.transcripts.findSegmentById(input.segmentId);
    if (!segment) {
      throw new Error(`Ses dayanağı için segment bulunamadı: ${input.segmentId}`);
    }
    if (segment.audioId !== input.audioId) {
      throw new Error(
        `Segment, belirtilen kayda ait değil: segment ${segment.audioId}, istenen ${input.audioId}`,
      );
    }
    evidence = {
      evidenceId: ctx.ids.next("dayanak"),
      taskId,
      kind: "ses-segmenti",
      audioId: segment.audioId,
      segmentId: segment.segmentId,
      startMs: segment.startMs,
      endMs: segment.endMs,
      note: input.note,
      createdAt: now,
    };
  }

  assertEvidenceTarget(evidence);
  repos.evidence.insert(evidence);
  audit(repos, ctx, taskId, actor, "dayanak-olusturuldu", "EvidenceRef", evidence.evidenceId, {
    kind: evidence.kind,
  });
  return evidence;
}

export function linkAnswerEvidence(
  ctx: AppContext,
  repos: TaskRepositories,
  actor: Actor,
  taskId: string,
  answerId: string,
  evidenceId: string,
): void {
  repos.evidence.linkAnswer(answerId, evidenceId);
  audit(repos, ctx, taskId, actor, "yanit-dayanak-baglandi", "Answer", answerId, { evidenceId });
}

// ---------------------------------------------------------------------------
// Bulgu
// ---------------------------------------------------------------------------

export interface CreateFindingInput {
  code: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  evidenceIds: string[];
  relatedQuestionIds?: string[];
}

export function createFinding(
  ctx: AppContext,
  repos: TaskRepositories,
  actor: Actor,
  taskId: string,
  input: CreateFindingInput,
): Finding {
  const finding: Finding = {
    findingId: ctx.ids.next("bulgu"),
    taskId,
    code: input.code,
    title: input.title,
    description: input.description,
    severity: input.severity,
    status: "taslak",
    createdAt: ctx.clock.now(),
  };

  // Dayanaklar bu göreve ait olmalı ve en az bir dayanak zorunludur.
  for (const evidenceId of input.evidenceIds) {
    const evidence = repos.evidence.findById(evidenceId);
    if (!evidence) {
      throw new Error(`Bulgu dayanağı bulunamadı veya bu göreve ait değil: ${evidenceId}`);
    }
  }
  assertFindingHasEvidence(finding, input.evidenceIds);

  repos.findings.insert(finding);
  for (const evidenceId of input.evidenceIds) {
    repos.findings.linkEvidence(finding.findingId, evidenceId);
  }

  audit(repos, ctx, taskId, actor, "bulgu-olusturuldu", "Finding", finding.findingId, {
    code: finding.code,
    evidenceCount: input.evidenceIds.length,
    relatedQuestionIds: input.relatedQuestionIds ?? [],
  });
  return finding;
}

/** Bulgu doğrulaması; yalnızca insan tarafından yapılır (bkz. MIH-REQ-QLT-003). */
export function verifyFinding(
  ctx: AppContext,
  repos: TaskRepositories,
  actor: Actor,
  taskId: string,
  findingId: string,
  note: string,
): void {
  const finding = repos.findings.findById(findingId);
  if (!finding) {
    throw new Error(`Bulgu bulunamadı veya bu göreve ait değil: ${findingId}`);
  }
  const evidenceIds = repos.findings
    .listEvidenceLinks()
    .filter((link) => link.findingId === findingId)
    .map((link) => link.evidenceId);
  assertFindingHasEvidence(finding, evidenceIds);
  ctx.db
    .prepare("UPDATE finding SET status = 'doğrulandı' WHERE finding_id = ? AND task_id = ?")
    .run(findingId, taskId);
  audit(repos, ctx, taskId, actor, "bulgu-dogrulandi", "Finding", findingId, { note });
}
