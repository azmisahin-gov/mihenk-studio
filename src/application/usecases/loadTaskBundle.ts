/**
 * Görev veri paketini yükler.
 *
 * Tüm okumalar görev kapsamlı depolar üzerinden yapılır; başka görevin verisi
 * bu pakete giremez (bkz. ADR-006, MIH-REQ-TSK-002).
 */
import type { AppContext, TaskRepositories } from "../context.ts";
import type { TaskBundle } from "../taskBundle.ts";
import type { TranscriptSegment } from "../../domain/types.ts";

export function loadTaskBundle(
  _ctx: AppContext,
  repos: TaskRepositories,
  taskId: string,
): TaskBundle {
  const task = repos.tasks.findById(taskId);
  if (!task) {
    throw new Error(`Görev bulunamadı: ${taskId}`);
  }

  const audios = repos.audios.listAll();
  const transcriptVersions = repos.transcripts.listVersions();

  const latestSegments: TranscriptSegment[] = [];
  const rawSegments: TranscriptSegment[] = [];
  for (const audio of audios) {
    const versions = repos.transcripts.listVersionsForAudio(audio.audioId);
    const latest = versions.length > 0 ? (versions[versions.length - 1] as (typeof versions)[number]) : null;
    if (latest) {
      latestSegments.push(...repos.transcripts.listSegmentsForVersion(latest.versionId));
    }
    const raw = versions.find((version) => version.kind === "ham-asr");
    if (raw) {
      rawSegments.push(...repos.transcripts.listSegmentsForVersion(raw.versionId));
    }
  }

  const report = repos.reports.findByTask();
  const approvals = report ? repos.reports.listApprovals(report.reportId) : [];
  const approved = approvals.some((item) => item.kind === "rapor-onayı");

  return {
    task,
    assignments: repos.assignments.listAll(),
    fields: repos.fields.listAll(),
    expectedMaterials: repos.expectedMaterials.listAll(),
    materials: repos.materials.listAll(),
    audios,
    transcriptVersions,
    latestSegments,
    rawSegments,
    questions: repos.questions.listAll(),
    answers: repos.answers.listAll(),
    evidence: repos.evidence.listAll(),
    findings: repos.findings.listAll(),
    findingEvidence: repos.findings.listEvidenceLinks(),
    answerEvidence: repos.evidence.listAnswerLinks(),
    approved,
    approvalCount: approvals.length,
  };
}
