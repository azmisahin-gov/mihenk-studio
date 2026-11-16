/**
 * Ses kaydı, transkript sürümü ve segment depoları (görev kapsamlı).
 */
import type { Database } from "../db/database.ts";
import type {
  AudioRecord,
  ReviewState,
  TranscriptSegment,
  TranscriptSource,
  TranscriptVersion,
  TranscriptVersionKind,
} from "../../domain/types.ts";
import { ScopedRepository, TaskScope, fromBool, toBool } from "./base.ts";

export class AudioRepository extends ScopedRepository {
  constructor(db: Database, scope: TaskScope) {
    super(db, scope);
  }

  insert(audio: AudioRecord): void {
    this.assertOwnership(audio.taskId, "AudioRecord", audio.audioId);
    this.db
      .prepare(
        `INSERT INTO audio_record (audio_id, task_id, material_id, duration_ms, sample_rate_hz,
                                   channels, codec, origin_note, sha256)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        audio.audioId,
        this.taskId,
        audio.materialId,
        audio.durationMs,
        audio.sampleRateHz,
        audio.channels,
        audio.codec,
        audio.originNote,
        audio.sha256,
      );
  }

  private map(row: Record<string, unknown>): AudioRecord {
    return {
      audioId: row.audio_id as string,
      taskId: row.task_id as string,
      materialId: row.material_id as string,
      durationMs: row.duration_ms as number,
      sampleRateHz: row.sample_rate_hz as number,
      channels: row.channels as number,
      codec: row.codec as string,
      originNote: row.origin_note as string,
      sha256: row.sha256 as string,
    };
  }

  findById(audioId: string): AudioRecord | null {
    const row = this.db
      .prepare("SELECT * FROM audio_record WHERE audio_id = ? AND task_id = ?")
      .get(audioId, this.taskId) as Record<string, unknown> | undefined;
    return row ? this.map(row) : null;
  }

  listAll(): AudioRecord[] {
    const rows = this.db
      .prepare("SELECT * FROM audio_record WHERE task_id = ? ORDER BY rowid")
      .all(this.taskId) as Record<string, unknown>[];
    return rows.map((row) => this.map(row));
  }
}

export class TranscriptRepository extends ScopedRepository {
  constructor(db: Database, scope: TaskScope) {
    super(db, scope);
  }

  insertVersion(version: TranscriptVersion): void {
    this.assertOwnership(version.taskId, "TranscriptVersion", version.versionId);
    this.db
      .prepare(
        `INSERT INTO transcript_version (version_id, task_id, audio_id, kind, source, created_by,
                                         created_at, previous_version_id, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        version.versionId,
        this.taskId,
        version.audioId,
        version.kind,
        version.source,
        version.createdBy,
        version.createdAt,
        version.previousVersionId ?? null,
        version.note,
      );
  }

  private mapVersion(row: Record<string, unknown>): TranscriptVersion {
    return {
      versionId: row.version_id as string,
      taskId: row.task_id as string,
      audioId: row.audio_id as string,
      kind: row.kind as TranscriptVersionKind,
      source: row.source as TranscriptSource,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
      previousVersionId: (row.previous_version_id as string | null) ?? undefined,
      note: row.note as string,
    };
  }

  findVersionById(versionId: string): TranscriptVersion | null {
    const row = this.db
      .prepare("SELECT * FROM transcript_version WHERE version_id = ? AND task_id = ?")
      .get(versionId, this.taskId) as Record<string, unknown> | undefined;
    return row ? this.mapVersion(row) : null;
  }

  listVersionsForAudio(audioId: string): TranscriptVersion[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM transcript_version WHERE audio_id = ? AND task_id = ? ORDER BY created_at, rowid",
      )
      .all(audioId, this.taskId) as Record<string, unknown>[];
    return rows.map((row) => this.mapVersion(row));
  }

  listVersions(): TranscriptVersion[] {
    const rows = this.db
      .prepare("SELECT * FROM transcript_version WHERE task_id = ? ORDER BY created_at, rowid")
      .all(this.taskId) as Record<string, unknown>[];
    return rows.map((row) => this.mapVersion(row));
  }

  /** Bir kaydın en güncel sürümü; rapor derlemesi bunu kullanır. */
  latestVersionForAudio(audioId: string): TranscriptVersion | null {
    const versions = this.listVersionsForAudio(audioId);
    return versions.length > 0 ? (versions[versions.length - 1] as TranscriptVersion) : null;
  }

  insertSegment(segment: TranscriptSegment): void {
    this.assertOwnership(segment.taskId, "TranscriptSegment", segment.segmentId);
    this.db
      .prepare(
        `INSERT INTO transcript_segment (segment_id, task_id, version_id, audio_id, idx, start_ms,
                                         end_ms, speaker_label, text, uncertain, review_state,
                                         priority_reason, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        segment.segmentId,
        this.taskId,
        segment.versionId,
        segment.audioId,
        segment.index,
        segment.startMs,
        segment.endMs,
        segment.speakerLabel,
        segment.text,
        fromBool(segment.uncertain),
        segment.reviewState,
        segment.priorityReason,
        segment.note,
      );
  }

  insertSegments(segments: TranscriptSegment[]): void {
    for (const segment of segments) {
      this.insertSegment(segment);
    }
  }

  private mapSegment(row: Record<string, unknown>): TranscriptSegment {
    return {
      segmentId: row.segment_id as string,
      taskId: row.task_id as string,
      versionId: row.version_id as string,
      audioId: row.audio_id as string,
      index: row.idx as number,
      startMs: row.start_ms as number,
      endMs: row.end_ms as number,
      speakerLabel: row.speaker_label as string,
      text: row.text as string,
      uncertain: toBool(row.uncertain),
      reviewState: row.review_state as ReviewState,
      priorityReason: (row.priority_reason as string | null) ?? null,
      note: row.note as string,
    };
  }

  findSegmentById(segmentId: string): TranscriptSegment | null {
    const row = this.db
      .prepare("SELECT * FROM transcript_segment WHERE segment_id = ? AND task_id = ?")
      .get(segmentId, this.taskId) as Record<string, unknown> | undefined;
    return row ? this.mapSegment(row) : null;
  }

  listSegmentsForVersion(versionId: string): TranscriptSegment[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM transcript_segment WHERE version_id = ? AND task_id = ? ORDER BY idx",
      )
      .all(versionId, this.taskId) as Record<string, unknown>[];
    return rows.map((row) => this.mapSegment(row));
  }

  listSegmentsForAudio(audioId: string): TranscriptSegment[] {
    const rows = this.db
      .prepare("SELECT * FROM transcript_segment WHERE audio_id = ? AND task_id = ? ORDER BY idx")
      .all(audioId, this.taskId) as Record<string, unknown>[];
    return rows.map((row) => this.mapSegment(row));
  }

  /** En güncel sürümün segmentleri; rapor ve arayüz bunu gösterir. */
  latestSegmentsForAudio(audioId: string): TranscriptSegment[] {
    const latest = this.latestVersionForAudio(audioId);
    return latest ? this.listSegmentsForVersion(latest.versionId) : [];
  }

  updateSegmentReview(
    segmentId: string,
    reviewState: ReviewState,
    priorityReason: string | null,
  ): void {
    const existing = this.findSegmentById(segmentId);
    if (!existing) throw new Error(`Segment bulunamadı veya bu göreve ait değil: ${segmentId}`);
    this.db
      .prepare(
        "UPDATE transcript_segment SET review_state = ?, priority_reason = ? WHERE segment_id = ? AND task_id = ?",
      )
      .run(reviewState, priorityReason, segmentId, this.taskId);
  }
}
