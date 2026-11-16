/**
 * Materyal ile ilgili görev kapsamlı depolar: görevlendirme belgesi, OCR alanı,
 * beklenen materyal, materyal ve türetilmiş çıktı.
 */
import type { Database } from "../db/database.ts";
import type {
  AssignmentDocument,
  DerivedArtifact,
  ExpectedMaterial,
  ExpectedMaterialStatus,
  ExtractedField,
  Material,
  MaterialKind,
  MaterialStatus,
  ExtractionStatus,
  FieldConfirmation,
} from "../../domain/types.ts";
import { ScopedRepository, TaskScope, fromBool, toBool, jsonParse, jsonStringify } from "./base.ts";

// ---------------------------------------------------------------------------
// Görevlendirme belgesi
// ---------------------------------------------------------------------------

export class AssignmentRepository extends ScopedRepository {
  constructor(db: Database, scope: TaskScope) {
    super(db, scope);
  }

  insert(document: AssignmentDocument): void {
    this.assertOwnership(document.taskId, "AssignmentDocument", document.assignmentId);
    this.db
      .prepare(
        `INSERT INTO assignment_document (assignment_id, task_id, material_id, document_type,
                                          page_count, received_at, extraction_status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        document.assignmentId,
        this.taskId,
        document.materialId,
        document.documentType,
        document.pageCount,
        document.receivedAt,
        document.extractionStatus,
      );
  }

  findById(assignmentId: string): AssignmentDocument | null {
    const row = this.db
      .prepare("SELECT * FROM assignment_document WHERE assignment_id = ? AND task_id = ?")
      .get(assignmentId, this.taskId) as
      | {
          assignment_id: string;
          task_id: string;
          material_id: string;
          document_type: string;
          page_count: number;
          received_at: string;
          extraction_status: string;
        }
      | undefined;
    if (!row) return null;
    return {
      assignmentId: row.assignment_id,
      taskId: row.task_id,
      materialId: row.material_id,
      documentType: row.document_type,
      pageCount: row.page_count,
      receivedAt: row.received_at,
      extractionStatus: row.extraction_status as ExtractionStatus,
    };
  }

  listAll(): AssignmentDocument[] {
    const rows = this.db
      .prepare("SELECT assignment_id FROM assignment_document WHERE task_id = ? ORDER BY received_at")
      .all(this.taskId) as { assignment_id: string }[];
    return rows
      .map((row) => this.findById(row.assignment_id))
      .filter((item): item is AssignmentDocument => item !== null);
  }
}

// ---------------------------------------------------------------------------
// OCR / çıkarım alanı
// ---------------------------------------------------------------------------

export class ExtractedFieldRepository extends ScopedRepository {
  constructor(db: Database, scope: TaskScope) {
    super(db, scope);
  }

  insert(field: ExtractedField): void {
    this.assertOwnership(field.taskId, "ExtractedField", field.fieldId);
    this.db
      .prepare(
        `INSERT INTO extracted_field (field_id, task_id, assignment_id, key, value, source_page,
                                      source_region, confidence, confirmation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        field.fieldId,
        this.taskId,
        field.assignmentId,
        field.key,
        field.value,
        field.sourcePage,
        field.sourceRegion,
        field.confidence,
        field.confirmation,
      );
  }

  private map(row: Record<string, unknown>): ExtractedField {
    return {
      fieldId: row.field_id as string,
      taskId: row.task_id as string,
      assignmentId: row.assignment_id as string,
      key: row.key as string,
      value: row.value as string,
      sourcePage: row.source_page as number,
      sourceRegion: row.source_region as string,
      confidence: row.confidence as number,
      confirmation: row.confirmation as FieldConfirmation,
    };
  }

  findById(fieldId: string): ExtractedField | null {
    const row = this.db
      .prepare("SELECT * FROM extracted_field WHERE field_id = ? AND task_id = ?")
      .get(fieldId, this.taskId) as Record<string, unknown> | undefined;
    return row ? this.map(row) : null;
  }

  listAll(): ExtractedField[] {
    const rows = this.db
      .prepare("SELECT * FROM extracted_field WHERE task_id = ? ORDER BY rowid")
      .all(this.taskId) as Record<string, unknown>[];
    return rows.map((row) => this.map(row));
  }

  /** Teyit bekleyen alanlar; okunamayan alanlar burada görünür (bkz. MIH-REQ-DOC-003). */
  listPendingConfirmation(): ExtractedField[] {
    return this.listAll().filter((field) => field.confirmation === "teyit-bekliyor");
  }

  updateValue(fieldId: string, value: string, confirmation: FieldConfirmation): void {
    const existing = this.findById(fieldId);
    if (!existing) {
      throw new Error(`Alan bulunamadı veya bu göreve ait değil: ${fieldId}`);
    }
    this.db
      .prepare("UPDATE extracted_field SET value = ?, confirmation = ? WHERE field_id = ? AND task_id = ?")
      .run(value, confirmation, fieldId, this.taskId);
  }

  listConfirmedValues(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const field of this.listAll()) {
      if (field.confirmation === "teyit-edildi" || field.confirmation === "otomatik") {
        result[field.key] = field.value;
      }
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Beklenen materyal
// ---------------------------------------------------------------------------

export class ExpectedMaterialRepository extends ScopedRepository {
  constructor(db: Database, scope: TaskScope) {
    super(db, scope);
  }

  insert(item: ExpectedMaterial): void {
    this.assertOwnership(item.taskId, "ExpectedMaterial", item.expectedId);
    this.db
      .prepare(
        `INSERT INTO expected_material (expected_id, task_id, label, kind, source_note, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(item.expectedId, this.taskId, item.label, item.kind, item.sourceNote, item.status);
  }

  listAll(): ExpectedMaterial[] {
    const rows = this.db
      .prepare("SELECT * FROM expected_material WHERE task_id = ? ORDER BY rowid")
      .all(this.taskId) as {
      expected_id: string;
      task_id: string;
      label: string;
      kind: string;
      source_note: string;
      status: string;
    }[];
    return rows.map((row) => ({
      expectedId: row.expected_id,
      taskId: row.task_id,
      label: row.label,
      kind: row.kind,
      sourceNote: row.source_note,
      status: row.status as ExpectedMaterialStatus,
    }));
  }

  updateStatus(expectedId: string, status: ExpectedMaterialStatus): void {
    this.db
      .prepare("UPDATE expected_material SET status = ? WHERE expected_id = ? AND task_id = ?")
      .run(status, expectedId, this.taskId);
  }
}

// ---------------------------------------------------------------------------
// Materyal
// ---------------------------------------------------------------------------

export class MaterialRepository extends ScopedRepository {
  constructor(db: Database, scope: TaskScope) {
    super(db, scope);
  }

  insert(material: Material): void {
    this.assertOwnership(material.taskId, "Material", material.materialId);
    this.db
      .prepare(
        `INSERT INTO material (material_id, task_id, original_name, stored_name, mime_type, size_bytes,
                               sha256, received_at, kind, status, duplicate_of, supersedes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        material.materialId,
        this.taskId,
        material.originalName,
        material.storedName,
        material.mimeType,
        material.sizeBytes,
        material.sha256,
        material.receivedAt,
        material.kind,
        material.status,
        material.duplicateOfId ?? null,
        material.supersedesId ?? null,
      );
  }

  private map(row: Record<string, unknown>): Material {
    return {
      materialId: row.material_id as string,
      taskId: row.task_id as string,
      originalName: row.original_name as string,
      storedName: row.stored_name as string,
      mimeType: row.mime_type as string,
      sizeBytes: row.size_bytes as number,
      sha256: row.sha256 as string,
      receivedAt: row.received_at as string,
      kind: row.kind as MaterialKind,
      status: row.status as MaterialStatus,
      duplicateOfId: (row.duplicate_of as string | null) ?? undefined,
      supersedesId: (row.supersedes as string | null) ?? undefined,
    };
  }

  findById(materialId: string): Material | null {
    const row = this.db
      .prepare("SELECT * FROM material WHERE material_id = ? AND task_id = ?")
      .get(materialId, this.taskId) as Record<string, unknown> | undefined;
    return row ? this.map(row) : null;
  }

  findBySha(sha256: string): Material | null {
    const row = this.db
      .prepare("SELECT * FROM material WHERE sha256 = ? AND task_id = ?")
      .get(sha256, this.taskId) as Record<string, unknown> | undefined;
    return row ? this.map(row) : null;
  }

  listAll(): Material[] {
    const rows = this.db
      .prepare("SELECT * FROM material WHERE task_id = ? ORDER BY received_at")
      .all(this.taskId) as Record<string, unknown>[];
    return rows.map((row) => this.map(row));
  }

  updateStatus(materialId: string, status: MaterialStatus): void {
    const existing = this.findById(materialId);
    if (!existing) throw new Error(`Materyal bulunamadı veya bu göreve ait değil: ${materialId}`);
    this.db
      .prepare("UPDATE material SET status = ? WHERE material_id = ? AND task_id = ?")
      .run(status, materialId, this.taskId);
  }
}

// ---------------------------------------------------------------------------
// Türetilmiş çıktı
// ---------------------------------------------------------------------------

export class DerivedArtifactRepository extends ScopedRepository {
  constructor(db: Database, scope: TaskScope) {
    super(db, scope);
  }

  insert(artifact: DerivedArtifact): void {
    this.assertOwnership(artifact.taskId, "DerivedArtifact", artifact.artifactId);
    this.db
      .prepare(
        `INSERT INTO derived_artifact (artifact_id, task_id, source_material_id, job_id, kind,
                                       params_json, sha256, created_at, reversible)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        artifact.artifactId,
        this.taskId,
        artifact.sourceMaterialId,
        artifact.jobId ?? null,
        artifact.kind,
        jsonStringify(artifact.paramsJson ? jsonParse(artifact.paramsJson) : {}),
        artifact.sha256,
        artifact.createdAt,
        fromBool(artifact.reversible),
      );
  }

  listAll(): DerivedArtifact[] {
    const rows = this.db
      .prepare("SELECT * FROM derived_artifact WHERE task_id = ? ORDER BY created_at")
      .all(this.taskId) as Record<string, unknown>[];
    return rows.map((row) => ({
      artifactId: row.artifact_id as string,
      taskId: row.task_id as string,
      sourceMaterialId: row.source_material_id as string,
      jobId: (row.job_id as string | null) ?? undefined,
      kind: row.kind as string,
      paramsJson: row.params_json as string,
      sha256: row.sha256 as string,
      createdAt: row.created_at as string,
      reversible: toBool(row.reversible),
    }));
  }
}
