/**
 * Görev oluşturma kullanım senaryosu (bkz. MIH-REQ-TSK-004, MIH-REQ-DOC-001).
 *
 * İlk görevlendirme belgesi alımında benzersiz taslak görev oluşturulur.
 * Okunamayan veya çelişkili alanlar tahmin edilmez; teyit kuyruğuna alınır
 * (bkz. MIH-REQ-DOC-003). Eksik materyal görev oluşturmayı engellemez
 * (bkz. MIH-REQ-TSK-005).
 */
import { assertMaterialIntegrity } from "../../domain/validation.ts";
import type { ExpectedMaterial, ExtractedField, Material, Task } from "../../domain/types.ts";
import { audit, type Actor, type AppContext, type TaskRepositories } from "../context.ts";

export interface AssignmentFieldInput {
  key: string;
  value: string;
  sourcePage: number;
  sourceRegion: string;
  confidence: number;
  /** Okunamayan/çelişkili alanlar için true; değer boş bırakılabilir. */
  uncertain?: boolean;
}

export interface CreateTaskDraftInput {
  /** Önceden üretilmiş görev kimliği; verilmezse yeni kimlik üretilir. */
  taskId?: string;
  title: string;
  caseNumber: string;
  authority: string;
  dueDate: string;
  kind: string;
  documentName: string;
  documentBytes: Uint8Array;
  documentMimeType: string;
  documentType: string;
  pageCount: number;
  fields: AssignmentFieldInput[];
  expectedMaterials: { label: string; kind: string; sourceNote: string }[];
}

export interface CreateTaskDraftResult {
  task: Task;
  material: Material;
  fields: ExtractedField[];
  pendingConfirmation: ExtractedField[];
  expectedMaterials: ExpectedMaterial[];
}

export function createTaskDraft(
  ctx: AppContext,
  repos: TaskRepositories,
  actor: Actor,
  input: CreateTaskDraftInput,
): CreateTaskDraftResult {
  const now = ctx.clock.now();
  const taskId = input.taskId ?? ctx.ids.next("gorev");

  const task: Task = {
    taskId,
    title: input.title,
    caseNumber: input.caseNumber,
    authority: input.authority,
    dueDate: input.dueDate,
    status: "taslak",
    kind: input.kind,
    synthetic: true,
    createdAt: now,
    updatedAt: now,
  };
  repos.tasks.insert(task);

  const stored = ctx.files.storeBytes(taskId, input.documentName, input.documentBytes, input.documentMimeType);
  const material: Material = {
    materialId: ctx.ids.next("materyal"),
    taskId,
    originalName: input.documentName,
    storedName: stored.storedName,
    mimeType: input.documentMimeType,
    sizeBytes: stored.sizeBytes,
    sha256: stored.sha256,
    receivedAt: now,
    kind: "görevlendirme-belgesi",
    status: "alındı",
  };
  assertMaterialIntegrity(material);
  repos.materials.insert(material);

  const assignmentId = ctx.ids.next("gorevlendirme");
  repos.assignments.insert({
    assignmentId,
    taskId,
    materialId: material.materialId,
    documentType: input.documentType,
    pageCount: input.pageCount,
    receivedAt: now,
    extractionStatus: "uyarı",
  });

  // Alanlar: belirsiz olanlar teyit kuyruğuna gider, tahmin edilmez.
  const fields: ExtractedField[] = input.fields.map((field) => {
    const uncertain = field.uncertain === true || field.value.trim().length === 0;
    return {
      fieldId: ctx.ids.next("alan"),
      taskId,
      assignmentId,
      key: field.key,
      value: uncertain ? "" : field.value,
      sourcePage: field.sourcePage,
      sourceRegion: field.sourceRegion,
      confidence: uncertain ? Math.min(field.confidence, 0.5) : field.confidence,
      confirmation: uncertain ? "teyit-bekliyor" : "otomatik",
    };
  });
  for (const field of fields) repos.fields.insert(field);

  const expectedMaterials: ExpectedMaterial[] = input.expectedMaterials.map((item) => ({
    expectedId: ctx.ids.next("beklenen"),
    taskId,
    label: item.label,
    kind: item.kind,
    sourceNote: item.sourceNote,
    status: "bekleniyor",
  }));
  for (const item of expectedMaterials) repos.expectedMaterials.insert(item);

  audit(repos, ctx, taskId, actor, "gorev-taslagi-olusturuldu", "Task", taskId, {
    materialId: material.materialId,
    fieldCount: fields.length,
    pendingConfirmation: fields.filter((field) => field.confirmation === "teyit-bekliyor").length,
  });

  return {
    task,
    material,
    fields,
    pendingConfirmation: fields.filter((field) => field.confirmation === "teyit-bekliyor"),
    expectedMaterials,
  };
}

/** Alan teyidi; okunamayan alan insan tarafından doldurulur (bkz. MIH-REQ-DOC-003). */
export function confirmField(
  ctx: AppContext,
  repos: TaskRepositories,
  actor: Actor,
  taskId: string,
  fieldId: string,
  value: string,
): void {
  repos.fields.updateValue(fieldId, value, "teyit-edildi");
  audit(repos, ctx, taskId, actor, "alan-teyit-edildi", "ExtractedField", fieldId, { value });
}

/** Görevi incelemeye açar; taslak durumundan geçiş zorunludur. */
export function startTask(
  ctx: AppContext,
  repos: TaskRepositories,
  actor: Actor,
  taskId: string,
): void {
  repos.tasks.updateStatus(taskId, "incelemede", ctx.clock.now());
  audit(repos, ctx, taskId, actor, "gorev-incelemeye-alindi", "Task", taskId);
}
