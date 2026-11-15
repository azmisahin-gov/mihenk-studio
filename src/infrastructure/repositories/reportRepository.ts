/**
 * Rapor, kalite kontrolü ve onay depoları (görev kapsamlı).
 *
 * Bir görevin tek `ReportDocument` kaydı olur (bkz. MIH-REQ-RPT-001).
 * Revizyonlar değişmezdir; her içerik değişikliği yeni revizyon üretir.
 */
import type { Database } from "../db/database.ts";
import type {
  ApprovalEvent,
  ApprovalKind,
  QualityCheck,
  QualityCheckStatus,
  ReportAppendix,
  ReportDocument,
  ReportRevision,
  ReportStatus,
  ReportSourceVersions,
} from "../../domain/types.ts";
import { ScopedRepository, TaskScope, fromBool, jsonParse, jsonStringify, toBool } from "./base.ts";

export class ReportRepository extends ScopedRepository {
  constructor(db: Database, scope: TaskScope) {
    super(db, scope);
  }

  findByTask(): ReportDocument | null {
    const row = this.db
      .prepare("SELECT * FROM report_document WHERE task_id = ?")
      .get(this.taskId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      reportId: row.report_id as string,
      taskId: row.task_id as string,
      status: row.status as ReportStatus,
      currentRevisionId: row.current_revision_id as string,
      synthetic: toBool(row.synthetic),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  insert(document: ReportDocument): void {
    this.assertOwnership(document.taskId, "ReportDocument", document.reportId);
    this.db
      .prepare(
        `INSERT INTO report_document (report_id, task_id, status, current_revision_id, synthetic,
                                      created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        document.reportId,
        this.taskId,
        document.status,
        document.currentRevisionId,
        fromBool(document.synthetic),
        document.createdAt,
        document.updatedAt,
      );
  }

  updateStatus(status: ReportStatus, currentRevisionId: string, updatedAt: string): void {
    this.db
      .prepare(
        "UPDATE report_document SET status = ?, current_revision_id = ?, updated_at = ? WHERE task_id = ?",
      )
      .run(status, currentRevisionId, updatedAt, this.taskId);
  }

  nextRevisionNo(reportId: string): number {
    const row = this.db
      .prepare("SELECT MAX(revision_no) AS max_no FROM report_revision WHERE report_id = ? AND task_id = ?")
      .get(reportId, this.taskId) as { max_no: number | null } | undefined;
    return (row?.max_no ?? 0) + 1;
  }

  insertRevision(revision: ReportRevision): void {
    this.assertOwnership(revision.taskId, "ReportRevision", revision.revisionId);
    this.db
      .prepare(
        `INSERT INTO report_revision (revision_id, task_id, report_id, revision_no, reason, created_by,
                                      created_at, source_versions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        revision.revisionId,
        this.taskId,
        revision.reportId,
        revision.revisionNo,
        revision.reason,
        revision.createdBy,
        revision.createdAt,
        jsonStringify(revision.sourceVersions),
      );
  }

  private mapRevision(row: Record<string, unknown>): ReportRevision {
    return {
      revisionId: row.revision_id as string,
      taskId: row.task_id as string,
      reportId: row.report_id as string,
      revisionNo: row.revision_no as number,
      reason: row.reason as string,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
      sourceVersions: jsonParse<ReportSourceVersions>(row.source_versions as string),
    };
  }

  listRevisions(reportId: string): ReportRevision[] {
    const rows = this.db
      .prepare("SELECT * FROM report_revision WHERE report_id = ? AND task_id = ? ORDER BY revision_no")
      .all(reportId, this.taskId) as Record<string, unknown>[];
    return rows.map((row) => this.mapRevision(row));
  }

  findRevision(revisionId: string): ReportRevision | null {
    const row = this.db
      .prepare("SELECT * FROM report_revision WHERE revision_id = ? AND task_id = ?")
      .get(revisionId, this.taskId) as Record<string, unknown> | undefined;
    return row ? this.mapRevision(row) : null;
  }

  insertAppendix(appendix: ReportAppendix): void {
    this.assertOwnership(appendix.taskId, "ReportAppendix", appendix.appendixId);
    this.db
      .prepare(
        `INSERT INTO report_appendix (appendix_id, task_id, report_id, revision_id, title, idx,
                                      content, source_refs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        appendix.appendixId,
        this.taskId,
        appendix.reportId,
        appendix.revisionId,
        appendix.title,
        appendix.order,
        jsonStringify(appendix.content),
        jsonStringify(appendix.sourceRefs),
      );
  }

  listAppendices(reportId: string): ReportAppendix[] {
    const rows = this.db
      .prepare("SELECT * FROM report_appendix WHERE report_id = ? AND task_id = ? ORDER BY idx")
      .all(reportId, this.taskId) as Record<string, unknown>[];
    return rows.map((row) => ({
      appendixId: row.appendix_id as string,
      taskId: row.task_id as string,
      reportId: row.report_id as string,
      revisionId: row.revision_id as string,
      title: row.title as string,
      order: row.idx as number,
      content: jsonParse<ReportAppendix["content"]>(row.content as string),
      sourceRefs: jsonParse<string[]>(row.source_refs as string),
    }));
  }

  replaceQualityChecks(checks: QualityCheck[]): void {
    this.db.prepare("DELETE FROM quality_check WHERE task_id = ?").run(this.taskId);
    const stmt = this.db.prepare(
      `INSERT INTO quality_check (check_id, task_id, report_id, revision_id, code, label, status,
                                  detail, computed_at, computed_from)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const check of checks) {
      this.assertOwnership(check.taskId, "QualityCheck", check.checkId);
      stmt.run(
        check.checkId,
        this.taskId,
        check.reportId,
        check.revisionId,
        check.code,
        check.label,
        check.status,
        check.detail,
        check.computedAt,
        jsonStringify(check.computedFrom),
      );
    }
  }

  listQualityChecks(reportId: string): QualityCheck[] {
    const rows = this.db
      .prepare("SELECT * FROM quality_check WHERE report_id = ? AND task_id = ? ORDER BY rowid")
      .all(reportId, this.taskId) as Record<string, unknown>[];
    return rows.map((row) => ({
      checkId: row.check_id as string,
      taskId: row.task_id as string,
      reportId: row.report_id as string,
      revisionId: row.revision_id as string,
      code: row.code as string,
      label: row.label as string,
      status: row.status as QualityCheckStatus,
      detail: row.detail as string,
      computedAt: row.computed_at as string,
      computedFrom: jsonParse<string[]>(row.computed_from as string),
    }));
  }

  insertApproval(event: ApprovalEvent): void {
    this.assertOwnership(event.taskId, "ApprovalEvent", event.approvalId);
    this.db
      .prepare(
        `INSERT INTO approval_event (approval_id, task_id, report_id, kind, actor_name, actor_role,
                                     occurred_at, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        event.approvalId,
        this.taskId,
        event.reportId,
        event.kind,
        event.actorName,
        event.actorRole,
        event.occurredAt,
        event.note,
      );
  }

  listApprovals(reportId: string): ApprovalEvent[] {
    const rows = this.db
      .prepare("SELECT * FROM approval_event WHERE report_id = ? AND task_id = ? ORDER BY occurred_at")
      .all(reportId, this.taskId) as Record<string, unknown>[];
    return rows.map((row) => ({
      approvalId: row.approval_id as string,
      taskId: row.task_id as string,
      reportId: row.report_id as string,
      kind: row.kind as ApprovalKind,
      actorName: row.actor_name as string,
      actorRole: row.actor_role as string,
      occurredAt: row.occurred_at as string,
      note: row.note as string,
    }));
  }

  hasApproval(reportId: string, kind: ApprovalKind): boolean {
    const row = this.db
      .prepare("SELECT COUNT(*) AS total FROM approval_event WHERE report_id = ? AND task_id = ? AND kind = ?")
      .get(reportId, this.taskId, kind) as { total: number };
    return row.total > 0;
  }
}
