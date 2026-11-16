/**
 * Transkript düzeltme kullanım senaryosu (bkz. MIH-REQ-TRN-002, 003, 005).
 *
 * Uzman düzeltmesi yeni bir sürüm üretir; ham ASR sürümü silinmez ve
 * değiştirilemez. Duyulamayan içerik uydurulmaz; açıkça işaretlenir.
 */
import { assertSegmentsWithinAudio } from "../../domain/validation.ts";
import type { TranscriptSegment, TranscriptVersion } from "../../domain/types.ts";
import { audit, type Actor, type AppContext, type TaskRepositories } from "../context.ts";

export interface SegmentCorrection {
  segmentId: string;
  text: string;
  /** Duyulamayan içerik işareti; metin boş bırakılabilir. */
  uncertain?: boolean;
  /** İnceleme önceliği nedeni; belirsizlikten ayrıdır (bkz. MIH-REQ-TRN-007). */
  priorityReason?: string | null;
}

export interface SaveTranscriptCorrectionInput {
  audioId: string;
  note: string;
  corrections: SegmentCorrection[];
}

export interface SaveTranscriptCorrectionResult {
  version: TranscriptVersion;
  segments: TranscriptSegment[];
}

export function saveTranscriptCorrection(
  ctx: AppContext,
  repos: TaskRepositories,
  actor: Actor,
  taskId: string,
  input: SaveTranscriptCorrectionInput,
): SaveTranscriptCorrectionResult {
  const audio = repos.audios.findById(input.audioId);
  if (!audio) {
    throw new Error(`Ses kaydı bulunamadı veya bu göreve ait değil: ${input.audioId}`);
  }
  const previous = repos.transcripts.latestVersionForAudio(input.audioId);
  if (!previous) {
    throw new Error(`Düzeltilecek transkript sürümü yok: ${input.audioId}`);
  }
  const previousSegments = repos.transcripts.listSegmentsForVersion(previous.versionId);
  const now = ctx.clock.now();

  const version: TranscriptVersion = {
    versionId: ctx.ids.next("transkript"),
    taskId,
    audioId: input.audioId,
    kind: "insan-düzeltmesi",
    source: "insan-uzman",
    createdBy: actor.name,
    createdAt: now,
    previousVersionId: previous.versionId,
    note: input.note,
  };
  repos.transcripts.insertVersion(version);

  const corrected: TranscriptSegment[] = previousSegments.map((segment) => {
    const correction = input.corrections.find((item) => item.segmentId === segment.segmentId);
    const text = correction ? correction.text : segment.text;
    const uncertain = correction?.uncertain ?? segment.uncertain;
    if (correction && text.trim().length === 0 && !uncertain) {
      throw new Error(
        `Boş düzeltme yalnızca "duyulamayan" işaretiyle kaydedilebilir: ${segment.segmentId}`,
      );
    }
    return {
      ...segment,
      segmentId: ctx.ids.next("segment"),
      versionId: version.versionId,
      text: uncertain ? text : text.trim(),
      uncertain,
      reviewState: correction ? (uncertain ? "incelendi" : "düzeltildi") : segment.reviewState,
      priorityReason: correction ? (correction.priorityReason ?? null) : segment.priorityReason,
    };
  });

  assertSegmentsWithinAudio(corrected, audio);
  repos.transcripts.insertSegments(corrected);

  audit(repos, ctx, taskId, actor, "transkript-duzeltmesi-kaydedildi", "TranscriptVersion", version.versionId, {
    audioId: input.audioId,
    previousVersionId: previous.versionId,
    correctionCount: input.corrections.length,
  });

  return { version, segments: corrected };
}

/** Segmenti incelendi olarak işaretler; metin değişmez (bkz. MIH-REQ-TRN-003). */
export function markSegmentReviewed(
  ctx: AppContext,
  repos: TaskRepositories,
  actor: Actor,
  taskId: string,
  segmentId: string,
): void {
  repos.transcripts.updateSegmentReview(segmentId, "incelendi", null);
  audit(repos, ctx, taskId, actor, "segment-incelendi", "TranscriptSegment", segmentId);
}
