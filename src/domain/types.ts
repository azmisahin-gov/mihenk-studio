/**
 * Alan modeli varlıkları.
 *
 * Bu katman hiçbir dış bağımlılık kullanmaz (bkz. ADR-002). Tüm kimlikler ve
 * zamanlar düz veri olarak taşınır; üretimi altyapı katmanının sorumluluğundadır.
 *
 * Kimlik adları kaynak kodla birebir eşleştiği için çevrilmez (bkz. DIL-ILKESI.md).
 */

/** Görev kimliği. Her alt kayıt bu kimliği taşır (bkz. MIH-REQ-TSK-001). */
export type TaskId = string;

/** Zaman damgası biçimi: ISO 8601 UTC. */
export type IsoTimestamp = string;

/** Ses zaman ekseni birimi: milisaniye (bkz. MIH-REQ-AUD-002). */
export type Milliseconds = number;

export const SYNTHETIC_NOTICE = "SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR" as const;

// ---------------------------------------------------------------------------
// Görev
// ---------------------------------------------------------------------------

export const TASK_STATUSES = [
  "taslak",
  "incelemede",
  "beklemede",
  "rapor-hazırlanıyor",
  "uzman-onayı-bekliyor",
  "tamamlandı",
  "arşivlendi",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  taskId: TaskId;
  title: string;
  caseNumber: string;
  authority: string;
  dueDate: string;
  status: TaskStatus;
  kind: string;
  /** Bu görevin sentetik örnek olduğunu belirtir (bkz. MIH-REQ-SNT-003). */
  synthetic: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Görevlendirme belgesi ve OCR alanı
// ---------------------------------------------------------------------------

export type ExtractionStatus = "bekliyor" | "çalışıyor" | "tamamlandı" | "uyarı" | "başarısız";
export type FieldConfirmation = "otomatik" | "teyit-bekliyor" | "teyit-edildi" | "reddedildi";

export interface AssignmentDocument {
  assignmentId: string;
  taskId: TaskId;
  materialId: string;
  documentType: string;
  pageCount: number;
  receivedAt: IsoTimestamp;
  extractionStatus: ExtractionStatus;
}

export interface ExtractedField {
  fieldId: string;
  taskId: TaskId;
  assignmentId: string;
  key: string;
  value: string;
  /** Kaynak belge sayfası (bkz. MIH-REQ-DOC-002). */
  sourcePage: number;
  sourceRegion: string;
  /** 0 ile 1 arası çıkarım güveni. */
  confidence: number;
  confirmation: FieldConfirmation;
}

// ---------------------------------------------------------------------------
// Materyal
// ---------------------------------------------------------------------------

export const EXPECTED_MATERIAL_STATUSES = ["bekleniyor", "alındı", "sorunlu", "yinelenen"] as const;
export type ExpectedMaterialStatus = (typeof EXPECTED_MATERIAL_STATUSES)[number];

export interface ExpectedMaterial {
  expectedId: string;
  taskId: TaskId;
  label: string;
  kind: string;
  sourceNote: string;
  status: ExpectedMaterialStatus;
}

export const MATERIAL_STATUSES = ["bekleniyor", "alındı", "doğrulandı", "sorunlu", "yinelenen"] as const;
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];

export type MaterialKind = "görevlendirme-belgesi" | "ses" | "görüntü" | "diğer";

export interface Material {
  materialId: string;
  taskId: TaskId;
  originalName: string;
  /** Depodaki ad. Özgün ad korunur (bkz. MIH-REQ-MAT-002). */
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  /** Özgün dosyanın kriptografik özeti. */
  sha256: string;
  receivedAt: IsoTimestamp;
  kind: MaterialKind;
  status: MaterialStatus;
  duplicateOfId?: string;
  supersedesId?: string;
}

/** Kaynaktan türetilmiş dosya; kaynağına ve işine bağlıdır (bkz. MIH-REQ-MAT-002). */
export interface DerivedArtifact {
  artifactId: string;
  taskId: TaskId;
  sourceMaterialId: string;
  jobId?: string;
  kind: string;
  paramsJson: string;
  sha256: string;
  createdAt: IsoTimestamp;
  reversible: boolean;
}

// ---------------------------------------------------------------------------
// Ses kaydı
// ---------------------------------------------------------------------------

export interface AudioRecord {
  audioId: string;
  taskId: TaskId;
  materialId: string;
  durationMs: Milliseconds;
  sampleRateHz: number;
  channels: number;
  codec: string;
  originNote: string;
  sha256: string;
}

// ---------------------------------------------------------------------------
// Arka plan işleri
// ---------------------------------------------------------------------------

export const JOB_STATUSES = [
  "bekliyor",
  "çalışıyor",
  "tamamlandı",
  "uyarı",
  "başarısız",
  "iptal-edildi",
  "yeniden-denetim-bekliyor",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export type JobKind = "ocr" | "asr" | "ses-işleme" | "rapor-dışa-aktarma" | "tohumlama";

export interface ProcessingJob {
  jobId: string;
  taskId: TaskId;
  kind: JobKind;
  status: JobStatus;
  /** Aynı işin iki kez uygulanmasını engeller (bkz. MIH-REQ-JOB-003). */
  idempotencyKey: string;
  attempt: number;
  maxAttempts: number;
  progress: number;
  errorCode?: string;
  errorMessage?: string;
  createdAt: IsoTimestamp;
  startedAt?: IsoTimestamp;
  finishedAt?: IsoTimestamp;
  cancelRequested: boolean;
}

// ---------------------------------------------------------------------------
// Transkript
// ---------------------------------------------------------------------------

export const TRANSCRIPT_VERSION_KINDS = ["ham-asr", "insan-düzeltmesi"] as const;
export type TranscriptVersionKind = (typeof TRANSCRIPT_VERSION_KINDS)[number];

export type TranscriptSource = "asr-motoru" | "insan-uzman";

/** Değiştirilemez transkript sürümü (bkz. MIH-REQ-TRN-003). */
export interface TranscriptVersion {
  versionId: string;
  taskId: TaskId;
  audioId: string;
  kind: TranscriptVersionKind;
  source: TranscriptSource;
  createdBy: string;
  createdAt: IsoTimestamp;
  /** Önceki sürüm; ham sürüm için tanımsızdır. */
  previousVersionId?: string;
  note: string;
}

export const REVIEW_STATES = ["bekliyor", "incelendi", "düzeltildi"] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

export interface TranscriptSegment {
  segmentId: string;
  taskId: TaskId;
  versionId: string;
  audioId: string;
  index: number;
  startMs: Milliseconds;
  endMs: Milliseconds;
  /** Kayıt içi anonim grup etiketi; kimlik tespiti değildir (bkz. MIH-REQ-AUD-004). */
  speakerLabel: string;
  text: string;
  /** Duyulamayan içerik işareti; metin uydurulmaz (bkz. MIH-REQ-TRN-005). */
  uncertain: boolean;
  reviewState: ReviewState;
  /** İnceleme önceliği nedeni; belirsizlikten ayrıdır (bkz. MIH-REQ-TRN-007). */
  priorityReason: string | null;
  note: string;
}

// ---------------------------------------------------------------------------
// Soru, yanıt, dayanak, bulgu
// ---------------------------------------------------------------------------

export interface Question {
  questionId: string;
  taskId: TaskId;
  index: number;
  text: string;
  sourceFieldId?: string;
  sourceNote: string;
}

export const ANSWER_STATUSES = ["boş", "taslak", "tamamlandı"] as const;
export type AnswerStatus = (typeof ANSWER_STATUSES)[number];

export interface Answer {
  answerId: string;
  taskId: TaskId;
  questionId: string;
  text: string;
  status: AnswerStatus;
  version: number;
  answeredBy: string;
  updatedAt: IsoTimestamp;
}

/** Belge sayfası/alanı veya ses segmenti/zaman aralığı dayanağı (bkz. MIH-REQ-QST-003). */
export type EvidenceRef =
  | {
      evidenceId: string;
      taskId: TaskId;
      kind: "belge";
      materialId: string;
      page: number;
      region: string;
      note: string;
      createdAt: IsoTimestamp;
    }
  | {
      evidenceId: string;
      taskId: TaskId;
      kind: "ses-segmenti";
      audioId: string;
      segmentId: string;
      startMs: Milliseconds;
      endMs: Milliseconds;
      note: string;
      createdAt: IsoTimestamp;
    };

export type EvidenceKind = EvidenceRef["kind"];

export const FINDING_SEVERITIES = ["düşük", "orta", "yüksek"] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export const FINDING_STATUSES = ["taslak", "doğrulandı", "geri çekildi"] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export interface Finding {
  findingId: string;
  taskId: TaskId;
  code: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  status: FindingStatus;
  createdAt: IsoTimestamp;
}

export interface FindingEvidence {
  findingId: string;
  evidenceId: string;
  taskId: TaskId;
}

// ---------------------------------------------------------------------------
// Rapor
// ---------------------------------------------------------------------------

export const REPORT_STATUSES = [
  "taslak",
  "eksik",
  "incelemede",
  "uzman-onayı-bekliyor",
  "onaylandı",
  "arşivlendi",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface ReportDocument {
  reportId: string;
  taskId: TaskId;
  status: ReportStatus;
  currentRevisionId: string;
  synthetic: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** Rapor revizyonu; hangi kaynak sürümlerini kullandığını gösterir (bkz. MIH-REQ-RPT-008). */
export interface ReportRevision {
  revisionId: string;
  taskId: TaskId;
  reportId: string;
  revisionNo: number;
  reason: string;
  createdBy: string;
  createdAt: IsoTimestamp;
  sourceVersions: ReportSourceVersions;
}

export interface ReportSourceVersions {
  materialIds: string[];
  audioIds: string[];
  transcriptVersionIds: string[];
  questionIds: string[];
  answerIds: string[];
  evidenceIds: string[];
  findingIds: string[];
}

export interface ReportAppendix {
  appendixId: string;
  taskId: TaskId;
  reportId: string;
  revisionId: string;
  title: string;
  order: number;
  /** Ek gövdesi: başlık + satırlar. */
  content: { heading: string; lines: string[] }[];
  sourceRefs: string[];
}

// ---------------------------------------------------------------------------
// Kalite kontrolü ve onay
// ---------------------------------------------------------------------------

export const QUALITY_CHECK_STATUSES = ["geçti", "uyarı", "engel", "bekliyor"] as const;
export type QualityCheckStatus = (typeof QUALITY_CHECK_STATUSES)[number];

export interface QualityCheck {
  checkId: string;
  taskId: TaskId;
  reportId: string;
  revisionId: string;
  code: string;
  label: string;
  status: QualityCheckStatus;
  detail: string;
  computedAt: IsoTimestamp;
  /** Sonucun hangi verilerden türediği (bkz. MIH-REQ-QLT-001). */
  computedFrom: string[];
}

export type ApprovalKind = "rapor-onayı" | "alan-teyidi" | "bulgu-doğrulaması";

export interface ApprovalEvent {
  approvalId: string;
  taskId: TaskId;
  reportId: string;
  kind: ApprovalKind;
  actorName: string;
  actorRole: string;
  occurredAt: IsoTimestamp;
  note: string;
}

// ---------------------------------------------------------------------------
// Denetim izi
// ---------------------------------------------------------------------------

export interface AuditEvent {
  eventId: string;
  taskId: TaskId;
  at: IsoTimestamp;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  detailJson: string;
}

// ---------------------------------------------------------------------------
// Profil, modül, motor
// ---------------------------------------------------------------------------

export interface ExpertProfile {
  profileId: string;
  displayName: string;
  profession: string;
  registryNo: string;
  workingLanguage: string;
  status: string;
}

export interface Module {
  moduleId: string;
  code: string;
  name: string;
  description: string;
  status: string;
}

export const ENGINE_STATUSES = ["doğrulanmamış", "test-bekliyor", "doğrulanmış", "devre-dışı"] as const;
export type EngineStatus = (typeof ENGINE_STATUSES)[number];

export interface EngineProfile {
  engineId: string;
  moduleId: string;
  name: string;
  version: string;
  status: EngineStatus;
  /** Ağ erişimi gerektiriyorsa açıkça işaretlenir (bkz. MIH-REQ-PLT-003). */
  networkRequired: boolean;
  paramsJson: string;
}
