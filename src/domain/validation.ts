/**
 * Alan doğrulamaları.
 *
 * Bu doğrulamalar arayüzden ve veri tabanından bağımsızdır; birim testleriyle
 * doğrudan sınanır (bkz. ADR-002, ADR-009).
 */
import type {
  AudioRecord,
  EvidenceRef,
  Finding,
  Material,
  QualityCheck,
  TranscriptSegment,
} from "./types.ts";

export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainValidationError";
  }
}

function fail(message: string): never {
  throw new DomainValidationError(message);
}

// ---------------------------------------------------------------------------
// Materyal
// ---------------------------------------------------------------------------

export function assertMaterialIntegrity(material: Material): void {
  if (!material.sha256 || material.sha256.length !== 64) {
    fail(`Materyal özeti geçersiz: ${material.materialId}`);
  }
  if (material.sizeBytes < 0) {
    fail(`Materyal boyutu negatif olamaz: ${material.materialId}`);
  }
  if (material.status === "yinelenen" && !material.duplicateOfId && !material.supersedesId) {
    fail(`Yinelenen materyal, kaynağına bağlı olmalıdır: ${material.materialId}`);
  }
}

// ---------------------------------------------------------------------------
// Ses ve transkript
// ---------------------------------------------------------------------------

export function assertAudioRecord(audio: AudioRecord): void {
  if (audio.durationMs <= 0) {
    fail(`Ses kaydı süresi pozitif olmalıdır: ${audio.audioId}`);
  }
  if (!Number.isInteger(audio.durationMs)) {
    fail(`Ses kaydı süresi milisaniye tamsayı olmalıdır: ${audio.audioId}`);
  }
}

/**
 * Segment zamanları kaydın zaman ekseninde olmalıdır (bkz. MIH-REQ-AUD-002).
 * Zaman ekseni milisaniyedir; saniye/dakika biçimi yalnızca gösterimde kullanılır.
 */
export function assertSegmentTimeline(segment: TranscriptSegment, audio: AudioRecord): void {
  if (segment.taskId !== audio.taskId) {
    fail(`Segment ile ses kaydı aynı göreve ait değil: ${segment.segmentId}`);
  }
  if (segment.audioId !== audio.audioId) {
    fail(`Segment, kayıt kimliğiyle eşleşmiyor: ${segment.segmentId}`);
  }
  if (segment.startMs < 0 || segment.endMs <= segment.startMs) {
    fail(`Segment zaman aralığı geçersiz: ${segment.segmentId}`);
  }
  if (segment.endMs > audio.durationMs) {
    fail(
      `Segment bitişi kayıt süresini aşıyor: ${segment.segmentId} ` +
        `(${segment.endMs} ms > ${audio.durationMs} ms)`,
    );
  }
}

export function assertSegmentsWithinAudio(segments: TranscriptSegment[], audio: AudioRecord): void {
  for (const segment of segments) {
    assertSegmentTimeline(segment, audio);
  }
}

// ---------------------------------------------------------------------------
// Dayanak ve bulgu
// ---------------------------------------------------------------------------

/**
 * Dayanak yalnızca işaret değildir; gerçek bir hedefe bağlı olmalıdır
 * (bkz. MIH-REQ-QST-003).
 */
export function assertEvidenceTarget(evidence: EvidenceRef): void {
  if (evidence.kind === "belge") {
    if (!evidence.materialId) {
      fail(`Belge dayanağı materyal kimliği taşımalıdır: ${evidence.evidenceId}`);
    }
    if (!Number.isInteger(evidence.page) || evidence.page < 1) {
      fail(`Belge dayanağı geçerli sayfa numarası taşımalıdır: ${evidence.evidenceId}`);
    }
    return;
  }
  if (!evidence.audioId || !evidence.segmentId) {
    fail(`Ses dayanağı kayıt ve segment kimliği taşımalıdır: ${evidence.evidenceId}`);
  }
  if (evidence.startMs < 0 || evidence.endMs <= evidence.startMs) {
    fail(`Ses dayanağı zaman aralığı geçersiz: ${evidence.evidenceId}`);
  }
}

/** Kanıtsız bulgu üretimi kabul edilmez (bkz. MIH-REQ-QST-006). */
export function assertFindingHasEvidence(finding: Finding, evidenceIds: readonly string[]): void {
  if (finding.status === "geri çekildi") return;
  if (evidenceIds.length === 0) {
    fail(`Bulgu en az bir dayanak taşımalıdır: ${finding.findingId}`);
  }
}

/** Dayanağın bulguyla aynı göreve ait olduğunu doğrular. */
export function assertEvidenceBelongsToTask(evidence: EvidenceRef, taskId: string): void {
  if (evidence.taskId !== taskId) {
    fail(
      `Dayanak göreve ait değil: ${evidence.evidenceId} ` +
        `(beklenen ${taskId}, bulunan ${evidence.taskId})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Kalite kontrolü
// ---------------------------------------------------------------------------

/**
 * Kanıtlanmayan kontrol otomatik geçti sayılmaz (bkz. MIH-REQ-QLT-002).
 * "geçti" sonucu ancak sonucun hangi verilerden türediği belirtilmişse geçerlidir.
 */
export function assertQualityCheckGrounded(check: QualityCheck): void {
  if (check.status === "geçti" && check.computedFrom.length === 0) {
    fail(`Kanıtsız kalite kontrolü geçti sayılamaz: ${check.checkId} (${check.code})`);
  }
}

export function hasBlockingCheck(checks: readonly QualityCheck[]): boolean {
  return checks.some((check) => check.status === "engel");
}
