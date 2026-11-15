/**
 * Soru, yanıt, dayanak ve bulgu depoları (görev kapsamlı).
 */
import type { Database } from "../db/database.ts";
import type {
  Answer,
  AnswerStatus,
  EvidenceRef,
  Finding,
  FindingSeverity,
  FindingStatus,
  Question,
} from "../../domain/types.ts";
import { ScopedRepository, TaskScope } from "./base.ts";

export class QuestionRepository extends ScopedRepository {
  constructor(db: Database, scope: TaskScope) {
    super(db, scope);
  }

  insert(question: Question): void {
    this.assertOwnership(question.taskId, "Question", question.questionId);
    this.db
      .prepare(
        `INSERT INTO question (question_id, task_id, idx, text, source_field_id, source_note)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        question.questionId,
        this.taskId,
        question.index,
        question.text,
        question.sourceFieldId ?? null,
        question.sourceNote,
      );
  }

  listAll(): Question[] {
    const rows = this.db
      .prepare("SELECT * FROM question WHERE task_id = ? ORDER BY idx")
      .all(this.taskId) as Record<string, unknown>[];
    return rows.map((row) => ({
      questionId: row.question_id as string,
      taskId: row.task_id as string,
      index: row.idx as number,
      text: row.text as string,
      sourceFieldId: (row.source_field_id as string | null) ?? undefined,
      sourceNote: row.source_note as string,
    }));
  }

  findById(questionId: string): Question | null {
    const row = this.db
      .prepare("SELECT * FROM question WHERE question_id = ? AND task_id = ?")
      .get(questionId, this.taskId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      questionId: row.question_id as string,
      taskId: row.task_id as string,
      index: row.idx as number,
      text: row.text as string,
      sourceFieldId: (row.source_field_id as string | null) ?? undefined,
      sourceNote: row.source_note as string,
    };
  }
}

export class AnswerRepository extends ScopedRepository {
  constructor(db: Database, scope: TaskScope) {
    super(db, scope);
  }

  upsert(answer: Answer): void {
    this.assertOwnership(answer.taskId, "Answer", answer.answerId);
    const existing = this.findByQuestion(answer.questionId);
    if (existing) {
      this.db
        .prepare(
          `UPDATE answer SET text = ?, status = ?, version = ?, answered_by = ?, updated_at = ?
           WHERE answer_id = ? AND task_id = ?`,
        )
        .run(
          answer.text,
          answer.status,
          answer.version,
          answer.answeredBy,
          answer.updatedAt,
          existing.answerId,
          this.taskId,
        );
      return;
    }
    this.db
      .prepare(
        `INSERT INTO answer (answer_id, task_id, question_id, text, status, version, answered_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        answer.answerId,
        this.taskId,
        answer.questionId,
        answer.text,
        answer.status,
        answer.version,
        answer.answeredBy,
        answer.updatedAt,
      );
  }

  private map(row: Record<string, unknown>): Answer {
    return {
      answerId: row.answer_id as string,
      taskId: row.task_id as string,
      questionId: row.question_id as string,
      text: row.text as string,
      status: row.status as AnswerStatus,
      version: row.version as number,
      answeredBy: row.answered_by as string,
      updatedAt: row.updated_at as string,
    };
  }

  findByQuestion(questionId: string): Answer | null {
    const row = this.db
      .prepare("SELECT * FROM answer WHERE question_id = ? AND task_id = ?")
      .get(questionId, this.taskId) as Record<string, unknown> | undefined;
    return row ? this.map(row) : null;
  }

  findById(answerId: string): Answer | null {
    const row = this.db
      .prepare("SELECT * FROM answer WHERE answer_id = ? AND task_id = ?")
      .get(answerId, this.taskId) as Record<string, unknown> | undefined;
    return row ? this.map(row) : null;
  }

  listAll(): Answer[] {
    const rows = this.db
      .prepare("SELECT * FROM answer WHERE task_id = ? ORDER BY rowid")
      .all(this.taskId) as Record<string, unknown>[];
    return rows.map((row) => this.map(row));
  }
}

export class EvidenceRepository extends ScopedRepository {
  constructor(db: Database, scope: TaskScope) {
    super(db, scope);
  }

  insert(evidence: EvidenceRef): void {
    this.assertOwnership(evidence.taskId, "EvidenceRef", evidence.evidenceId);
    if (evidence.kind === "belge") {
      this.db
        .prepare(
          `INSERT INTO evidence_ref (evidence_id, task_id, kind, material_id, page, region,
                                     audio_id, segment_id, start_ms, end_ms, note, created_at)
           VALUES (?, ?, 'belge', ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)`,
        )
        .run(
          evidence.evidenceId,
          this.taskId,
          evidence.materialId,
          evidence.page,
          evidence.region,
          evidence.note,
          evidence.createdAt,
        );
      return;
    }
    this.db
      .prepare(
        `INSERT INTO evidence_ref (evidence_id, task_id, kind, material_id, page, region,
                                   audio_id, segment_id, start_ms, end_ms, note, created_at)
         VALUES (?, ?, 'ses-segmenti', NULL, NULL, NULL, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        evidence.evidenceId,
        this.taskId,
        evidence.audioId,
        evidence.segmentId,
        evidence.startMs,
        evidence.endMs,
        evidence.note,
        evidence.createdAt,
      );
  }

  private map(row: Record<string, unknown>): EvidenceRef {
    const base = {
      evidenceId: row.evidence_id as string,
      taskId: row.task_id as string,
      note: row.note as string,
      createdAt: row.created_at as string,
    };
    if (row.kind === "belge") {
      return {
        ...base,
        kind: "belge",
        materialId: row.material_id as string,
        page: row.page as number,
        region: row.region as string,
      };
    }
    return {
      ...base,
      kind: "ses-segmenti",
      audioId: row.audio_id as string,
      segmentId: row.segment_id as string,
      startMs: row.start_ms as number,
      endMs: row.end_ms as number,
    };
  }

  findById(evidenceId: string): EvidenceRef | null {
    const row = this.db
      .prepare("SELECT * FROM evidence_ref WHERE evidence_id = ? AND task_id = ?")
      .get(evidenceId, this.taskId) as Record<string, unknown> | undefined;
    return row ? this.map(row) : null;
  }

  listAll(): EvidenceRef[] {
    const rows = this.db
      .prepare("SELECT * FROM evidence_ref WHERE task_id = ? ORDER BY created_at, rowid")
      .all(this.taskId) as Record<string, unknown>[];
    return rows.map((row) => this.map(row));
  }

  /** Bir dayanağın bağlı olduğu yanıtlar; yanıt-dayanak ilişkisi ayrı tabloda tutulur. */
  linkAnswer(answerId: string, evidenceId: string): void {
    const answer = this.db
      .prepare("SELECT answer_id FROM answer WHERE answer_id = ? AND task_id = ?")
      .get(answerId, this.taskId);
    const evidence = this.db
      .prepare("SELECT evidence_id FROM evidence_ref WHERE evidence_id = ? AND task_id = ?")
      .get(evidenceId, this.taskId);
    if (!answer || !evidence) {
      throw new Error(`Yanıt veya dayanak bu göreve ait değil: ${answerId} / ${evidenceId}`);
    }
    this.db
      .prepare("INSERT OR IGNORE INTO answer_evidence (answer_id, evidence_id, task_id) VALUES (?, ?, ?)")
      .run(answerId, evidenceId, this.taskId);
  }

  listAnswerLinks(): { answerId: string; evidenceId: string }[] {
    const rows = this.db
      .prepare("SELECT answer_id, evidence_id FROM answer_evidence WHERE task_id = ?")
      .all(this.taskId) as { answer_id: string; evidence_id: string }[];
    return rows.map((row) => ({ answerId: row.answer_id, evidenceId: row.evidence_id }));
  }

  listForAnswer(answerId: string): EvidenceRef[] {
    const rows = this.db
      .prepare(
        `SELECT e.* FROM evidence_ref e
         JOIN answer_evidence ae ON ae.evidence_id = e.evidence_id
         WHERE ae.answer_id = ? AND e.task_id = ?`,
      )
      .all(answerId, this.taskId) as Record<string, unknown>[];
    return rows.map((row) => this.map(row));
  }
}

export class FindingRepository extends ScopedRepository {
  constructor(db: Database, scope: TaskScope) {
    super(db, scope);
  }

  insert(finding: Finding): void {
    this.assertOwnership(finding.taskId, "Finding", finding.findingId);
    this.db
      .prepare(
        `INSERT INTO finding (finding_id, task_id, code, title, description, severity, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        finding.findingId,
        this.taskId,
        finding.code,
        finding.title,
        finding.description,
        finding.severity,
        finding.status,
        finding.createdAt,
      );
  }

  private map(row: Record<string, unknown>): Finding {
    return {
      findingId: row.finding_id as string,
      taskId: row.task_id as string,
      code: row.code as string,
      title: row.title as string,
      description: row.description as string,
      severity: row.severity as FindingSeverity,
      status: row.status as FindingStatus,
      createdAt: row.created_at as string,
    };
  }

  findById(findingId: string): Finding | null {
    const row = this.db
      .prepare("SELECT * FROM finding WHERE finding_id = ? AND task_id = ?")
      .get(findingId, this.taskId) as Record<string, unknown> | undefined;
    return row ? this.map(row) : null;
  }

  listAll(): Finding[] {
    const rows = this.db
      .prepare("SELECT * FROM finding WHERE task_id = ? ORDER BY rowid")
      .all(this.taskId) as Record<string, unknown>[];
    return rows.map((row) => this.map(row));
  }

  linkEvidence(findingId: string, evidenceId: string): void {
    const finding = this.db
      .prepare("SELECT finding_id FROM finding WHERE finding_id = ? AND task_id = ?")
      .get(findingId, this.taskId);
    const evidence = this.db
      .prepare("SELECT evidence_id FROM evidence_ref WHERE evidence_id = ? AND task_id = ?")
      .get(evidenceId, this.taskId);
    if (!finding || !evidence) {
      throw new Error(`Bulgu veya dayanak bu göreve ait değil: ${findingId} / ${evidenceId}`);
    }
    this.db
      .prepare("INSERT OR IGNORE INTO finding_evidence (finding_id, evidence_id, task_id) VALUES (?, ?, ?)")
      .run(findingId, evidenceId, this.taskId);
  }

  listEvidenceLinks(): { findingId: string; evidenceId: string }[] {
    const rows = this.db
      .prepare("SELECT finding_id, evidence_id FROM finding_evidence WHERE task_id = ?")
      .all(this.taskId) as { finding_id: string; evidence_id: string }[];
    return rows.map((row) => ({ findingId: row.finding_id, evidenceId: row.evidence_id }));
  }
}
