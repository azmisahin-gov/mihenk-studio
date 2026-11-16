/**
 * Görev veri paketi.
 *
 * Rapor derlemesi, kalite kontrolü ve arayüz aynı paketi kullanır; böylece
 * önizleme, çıktı ve kontroller aynı kaynak veriden türetilir.
 */
import type {
  Answer,
  AssignmentDocument,
  AudioRecord,
  EvidenceRef,
  ExpectedMaterial,
  ExtractedField,
  Finding,
  Material,
  Question,
  Task,
  TranscriptSegment,
  TranscriptVersion,
} from "../domain/types.ts";

export interface TaskBundle {
  task: Task;
  assignments: AssignmentDocument[];
  fields: ExtractedField[];
  expectedMaterials: ExpectedMaterial[];
  materials: Material[];
  audios: AudioRecord[];
  transcriptVersions: TranscriptVersion[];
  /** Her kaydın en güncel sürümüne ait segmentler. */
  latestSegments: TranscriptSegment[];
  /** Ham ASR sürümlerine ait segmentler. */
  rawSegments: TranscriptSegment[];
  questions: Question[];
  answers: Answer[];
  evidence: EvidenceRef[];
  findings: Finding[];
  findingEvidence: { findingId: string; evidenceId: string }[];
  answerEvidence: { answerId: string; evidenceId: string }[];
  approved: boolean;
  approvalCount: number;
}

export function segmentsForAudio(segments: TranscriptSegment[], audioId: string): TranscriptSegment[] {
  return segments.filter((segment) => segment.audioId === audioId).sort((a, b) => a.startMs - b.startMs);
}

export function evidenceForAnswer(
  answerId: string,
  bundle: Pick<TaskBundle, "answerEvidence" | "evidence">,
): EvidenceRef[] {
  const ids = bundle.answerEvidence
    .filter((link) => link.answerId === answerId)
    .map((link) => link.evidenceId);
  return bundle.evidence.filter((item) => ids.includes(item.evidenceId));
}

export function evidenceForFinding(
  findingId: string,
  bundle: Pick<TaskBundle, "findingEvidence" | "evidence">,
): EvidenceRef[] {
  const ids = bundle.findingEvidence
    .filter((link) => link.findingId === findingId)
    .map((link) => link.evidenceId);
  return bundle.evidence.filter((item) => ids.includes(item.evidenceId));
}

/** Dayanağı insan okunur biçime çevirir; rapor ve arayüz aynı metni kullanır. */
export function describeEvidence(
  evidence: EvidenceRef,
  lookup: {
    materialName(materialId: string): string;
    audioName(audioId: string): string;
  },
): string {
  if (evidence.kind === "belge") {
    return `${lookup.materialName(evidence.materialId)} · Sayfa ${evidence.page} · ${evidence.region}`;
  }
  return `${lookup.audioName(evidence.audioId)} · ${formatTime(evidence.startMs)}–${formatTime(evidence.endMs)}`;
}

/** Milisaniyeyi mm:ss.mmm biçimine çevirir; zaman ekseni tek birimdir. */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(ms % 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
