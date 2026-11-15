/**
 * Kalıcı iş kuyruğu ve denetim izi depoları (bkz. ADR-007, MIH-REQ-JOB-001).
 */
import type { Database } from "../db/database.ts";
import type { AuditEvent, JobKind, JobStatus, ProcessingJob } from "../../domain/types.ts";
import { fromBool, toBool } from "./base.ts";

interface JobRow {
  job_id: string;
  task_id: string;
  kind: string;
  status: string;
  idempotency_key: string;
  attempt: number;
  max_attempts: number;
  progress: number;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  cancel_requested: number;
}

function mapJob(row: JobRow): ProcessingJob {
  return {
    jobId: row.job_id,
    taskId: row.task_id,
    kind: row.kind as JobKind,
    status: row.status as JobStatus,
    idempotencyKey: row.idempotency_key,
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    progress: row.progress,
    errorCode: row.error_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at,
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
    cancelRequested: toBool(row.cancel_requested),
  };
}

export class JobRepository {
  constructor(private readonly db: Database) {}

  /**
   * İş oluşturur veya var olanı döndürür (idempotency). Aynı görev ve
   * idempotency anahtarıyla ikinci tetikleme yeni iş açmaz
   * (bkz. MIH-REQ-JOB-003).
   */
  enqueue(job: ProcessingJob): { job: ProcessingJob; created: boolean } {
    const existing = this.findByIdempotencyKey(job.taskId, job.idempotencyKey);
    if (existing) {
      return { job: existing, created: false };
    }
    this.db
      .prepare(
        `INSERT INTO processing_job (job_id, task_id, kind, status, idempotency_key, attempt,
                                     max_attempts, progress, error_code, error_message, created_at,
                                     started_at, finished_at, cancel_requested)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        job.jobId,
        job.taskId,
        job.kind,
        job.status,
        job.idempotencyKey,
        job.attempt,
        job.maxAttempts,
        job.progress,
        job.errorCode ?? null,
        job.errorMessage ?? null,
        job.createdAt,
        job.startedAt ?? null,
        job.finishedAt ?? null,
        fromBool(job.cancelRequested),
      );
    return { job, created: true };
  }

  findById(jobId: string): ProcessingJob | null {
    const row = this.db.prepare("SELECT * FROM processing_job WHERE job_id = ?").get(jobId) as
      | JobRow
      | undefined;
    return row ? mapJob(row) : null;
  }

  findByIdempotencyKey(taskId: string, key: string): ProcessingJob | null {
    const row = this.db
      .prepare("SELECT * FROM processing_job WHERE task_id = ? AND idempotency_key = ?")
      .get(taskId, key) as JobRow | undefined;
    return row ? mapJob(row) : null;
  }

  listByTask(taskId: string): ProcessingJob[] {
    const rows = this.db
      .prepare("SELECT * FROM processing_job WHERE task_id = ? ORDER BY created_at")
      .all(taskId) as JobRow[];
    return rows.map(mapJob);
  }

  listAll(): ProcessingJob[] {
    const rows = this.db.prepare("SELECT * FROM processing_job ORDER BY created_at").all() as JobRow[];
    return rows.map(mapJob);
  }

  updateStatus(
    jobId: string,
    status: JobStatus,
    patch: Partial<Pick<ProcessingJob, "progress" | "errorCode" | "errorMessage" | "finishedAt" | "startedAt">> = {},
  ): void {
    const current = this.findById(jobId);
    if (!current) throw new Error(`İş bulunamadı: ${jobId}`);
    this.db
      .prepare(
        `UPDATE processing_job SET status = ?, progress = ?, error_code = ?, error_message = ?,
                                   started_at = ?, finished_at = ?
         WHERE job_id = ?`,
      )
      .run(
        status,
        patch.progress ?? current.progress,
        patch.errorCode ?? current.errorCode ?? null,
        patch.errorMessage ?? current.errorMessage ?? null,
        patch.startedAt ?? current.startedAt ?? null,
        patch.finishedAt ?? current.finishedAt ?? null,
        jobId,
      );
  }

  requestCancel(jobId: string): void {
    this.db.prepare("UPDATE processing_job SET cancel_requested = 1 WHERE job_id = ?").run(jobId);
  }

  incrementAttempt(jobId: string): number {
    this.db.prepare("UPDATE processing_job SET attempt = attempt + 1 WHERE job_id = ?").run(jobId);
    return this.findById(jobId)?.attempt ?? 0;
  }

  /**
   * Uygulama açılışında kurtarma: yarıda kalmış işler yeniden denetim bekliyor
   * durumuna alınır (bkz. MIH-REQ-PLT-004). Kaynak veya çıktı silinmez.
   */
  recoverStalledJobs(): number {
    const stalled = this.db
      .prepare("SELECT job_id FROM processing_job WHERE status = 'çalışıyor'")
      .all() as { job_id: string }[];
    for (const row of stalled) {
      this.updateStatus(row.job_id, "yeniden-denetim-bekliyor", { progress: 0 });
    }
    return stalled.length;
  }
}

export class AuditRepository {
  constructor(private readonly db: Database) {}

  append(event: AuditEvent): void {
    this.db
      .prepare(
        `INSERT INTO audit_event (event_id, task_id, at, actor, action, entity_type, entity_id, detail_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        event.eventId,
        event.taskId,
        event.at,
        event.actor,
        event.action,
        event.entityType,
        event.entityId,
        event.detailJson,
      );
  }

  listByTask(taskId: string): AuditEvent[] {
    const rows = this.db
      .prepare("SELECT * FROM audit_event WHERE task_id = ? ORDER BY at")
      .all(taskId) as Record<string, unknown>[];
    return rows.map((row) => ({
      eventId: row.event_id as string,
      taskId: row.task_id as string,
      at: row.at as string,
      actor: row.actor as string,
      action: row.action as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      detailJson: row.detail_json as string,
    }));
  }
}
