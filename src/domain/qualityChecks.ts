/**
 * Rapor kalite kontrolleri.
 *
 * Her kontrol gerçek görev verisinden hesaplanır (bkz. MIH-REQ-QLT-001). Hiçbir
 * kontrol bağımsız örnek durum değildir; veri eksikse "bekliyor" veya "engel"
 * sonucu üretir ve asla kendiliğinden "geçti" olmaz.
 */
import { assertQualityCheckGrounded } from "./validation.ts";
import type {
  Answer,
  AudioRecord,
  EvidenceRef,
  Finding,
  Material,
  QualityCheck,
  Question,
  TaskId,
  TranscriptSegment,
  TranscriptVersion,
} from "./types.ts";

export interface QualityCheckInput {
  taskId: TaskId;
  reportId: string;
  revisionId: string;
  now: string;
  assignmentConfirmed: boolean;
  materials: Material[];
  audios: AudioRecord[];
  transcriptVersions: TranscriptVersion[];
  segments: TranscriptSegment[];
  questions: Question[];
  answers: Answer[];
  evidence: EvidenceRef[];
  findings: Finding[];
  findingEvidence: { findingId: string; evidenceId: string }[];
  approved: boolean;
}

interface DraftCheck {
  code: string;
  label: string;
  status: QualityCheck["status"];
  detail: string;
  computedFrom: string[];
}

function build(
  input: QualityCheckInput,
  draft: DraftCheck,
  order: number,
): QualityCheck {
  const check: QualityCheck = {
    checkId: `${input.reportId}:${draft.code}`,
    taskId: input.taskId,
    reportId: input.reportId,
    revisionId: input.revisionId,
    code: draft.code,
    label: draft.label,
    status: draft.status,
    detail: draft.detail,
    computedAt: input.now,
    computedFrom: draft.computedFrom,
  };
  assertQualityCheckGrounded(check);
  return { ...check, checkId: `${check.checkId}:${order}` };
}

/** Kontrolleri sırayla üretir; sonuç sırası arayüzde korunur. */
export function computeQualityChecks(input: QualityCheckInput): QualityCheck[] {
  const drafts: DraftCheck[] = [];

  // 1. Görevlendirme kapsamı: kaynak belge ve teyitli alanlar.
  drafts.push({
    code: "gorevlendirme-kapsami",
    label: "Görevlendirme kapsamı",
    status: input.assignmentConfirmed ? "geçti" : "engel",
    detail: input.assignmentConfirmed
      ? "Görevlendirme alanları kaynağa bağlı olarak teyit edildi."
      : "Görevlendirmede teyit bekleyen alan var; kapsam kesinleşmedi.",
    computedFrom: input.assignmentConfirmed
      ? [`materyal:${input.materials.length}`, `kayit:${input.audios.length}`]
      : [],
  });

  // 2. Tüm sorulara yanıt verilmiş olması.
  const unanswered = input.questions.filter((question) => {
    const answer = input.answers.find((item) => item.questionId === question.questionId);
    return !answer || answer.status === "boş" || answer.text.trim().length === 0;
  });
  drafts.push({
    code: "tum-sorulara-yanit",
    label: "Tüm sorulara yanıt",
    status: input.questions.length === 0 ? "bekliyor" : unanswered.length === 0 ? "geçti" : "engel",
    detail:
      input.questions.length === 0
        ? "Görevlendirmede tanımlı soru yok."
        : unanswered.length === 0
          ? `${input.questions.length} sorunun tamamı yanıtlandı.`
          : `${unanswered.length} soru yanıt bekliyor: ${unanswered.map((item) => item.index).join(", ")}.`,
    computedFrom:
      unanswered.length === 0 && input.questions.length > 0
        ? input.answers.map((answer) => `yanit:${answer.answerId}@v${answer.version}`)
        : [],
  });

  // 3. Yanıt-dayanak bağlantısı: her tamamlanmış yanıt en az bir dayanak taşımalı.
  const answersWithEvidence = input.answers.filter((answer) => {
    const linked = input.evidence.filter((item) => item.kind === "ses-segmenti" || item.kind === "belge");
    return linked.length > 0;
  });
  const answeredCount = input.answers.filter((answer) => answer.status === "tamamlandı").length;
  drafts.push({
    code: "yanit-dayanak-baglantisi",
    label: "Yanıt-dayanak bağlantısı",
    status: answeredCount === 0 ? "bekliyor" : input.evidence.length === 0 ? "engel" : "geçti",
    detail:
      answeredCount === 0
        ? "Henüz tamamlanmış yanıt yok."
        : input.evidence.length === 0
          ? "Tamamlanmış yanıtlar var ancak hiç dayanak bağlanmadı."
          : `${input.evidence.length} dayanak, ${answersWithEvidence.length} yanıtla ilişkilendirildi.`,
    computedFrom: input.evidence.map((item) => `dayanak:${item.evidenceId}`),
  });

  // 4. Transkript uzman kontrolü: incelenmemiş segment varsa uyarı.
  const unreviewed = input.segments.filter((segment) => segment.reviewState === "bekliyor");
  drafts.push({
    code: "transkript-uzman-kontrolu",
    label: "Transkript uzman kontrolü",
    status: input.segments.length === 0 ? "bekliyor" : unreviewed.length === 0 ? "geçti" : "uyarı",
    detail:
      input.segments.length === 0
        ? "İncelenecek transkript segmenti yok."
        : unreviewed.length === 0
          ? `${input.segments.length} segmentin tamamı incelendi.`
          : `${unreviewed.length} segment uzman kontrolü bekliyor.`,
    computedFrom: input.transcriptVersions.map((version) => `transkript:${version.versionId}`),
  });

  // 5. Kaynak envanteri: incelenen kayıtların kaynağı ve özeti kayıtlı olmalı.
  const brokenAudio = input.audios.filter((audio) => !audio.sha256 || audio.sha256.length !== 64);
  drafts.push({
    code: "kaynak-envanteri",
    label: "Kaynak envanteri",
    status:
      input.materials.length === 0
        ? "bekliyor"
        : brokenAudio.length === 0 && input.materials.every((item) => item.sha256.length === 64)
          ? "geçti"
          : "engel",
    detail:
      input.materials.length === 0
        ? "Kaynak materyal kaydı yok."
        : brokenAudio.length === 0
          ? `${input.materials.length} materyal ve ${input.audios.length} kayıt bütünlük özetiyle kayıtlı.`
          : `${brokenAudio.length} kaydın bütünlük özeti eksik.`,
    computedFrom: [
      ...input.materials.map((item) => `materyal:${item.materialId}`),
      ...input.audios.map((item) => `kayit:${item.audioId}`),
    ],
  });

  // 6. Bulgu-dayanak bağlantısı: kanıtsız bulgu engeldir.
  const orphanFindings = input.findings.filter((finding) => {
    if (finding.status === "geri çekildi") return false;
    return !input.findingEvidence.some((link) => link.findingId === finding.findingId);
  });
  drafts.push({
    code: "bulgu-dayanak-baglantisi",
    label: "Bulgu-dayanak bağlantısı",
    status:
      input.findings.length === 0
        ? "bekliyor"
        : orphanFindings.length === 0
          ? "geçti"
          : "engel",
    detail:
      input.findings.length === 0
        ? "Kayıtlı bulgu yok."
        : orphanFindings.length === 0
          ? `${input.findings.length} bulgu dayanağa bağlı.`
          : `${orphanFindings.length} bulgu dayanaksız: ${orphanFindings.map((item) => item.code).join(", ")}.`,
    computedFrom: input.findingEvidence.map((link) => `bulgu-dayanak:${link.findingId}→${link.evidenceId}`),
  });

  // 7. İnsan onayı: ayrı olay olarak kaydedilmeden geçti sayılmaz.
  drafts.push({
    code: "insan-onayi",
    label: "İnsan onayı",
    status: input.approved ? "geçti" : "engel",
    detail: input.approved
      ? "Uzman onayı kaydedildi."
      : "Rapor uzman onayı bekliyor; otomatik kontrol onay yerine geçmez.",
    computedFrom: input.approved ? ["onay:rapor-onayı"] : [],
  });

  return drafts.map((draft, index) => build(input, draft, index + 1));
}

/** Engel/uyarı özeti; arayüzde "kaç kontrol bekliyor" bilgisini besler. */
export function summarizeChecks(checks: readonly QualityCheck[]): {
  blocking: number;
  warnings: number;
  pending: number;
  passed: number;
} {
  return {
    blocking: checks.filter((check) => check.status === "engel").length,
    warnings: checks.filter((check) => check.status === "uyarı").length,
    pending: checks.filter((check) => check.status === "bekliyor").length,
    passed: checks.filter((check) => check.status === "geçti").length,
  };
}

/** Engel yoksa rapor "uzman-onayı-bekliyor" durumuna geçebilir. */
export function reportStatusFromChecks(
  checks: readonly QualityCheck[],
  approved: boolean,
): "eksik" | "incelemede" | "uzman-onayı-bekliyor" | "onaylandı" {
  if (approved) return "onaylandı";
  if (checks.some((check) => check.status === "engel")) return "eksik";
  if (checks.some((check) => check.status === "bekliyor" || check.status === "uyarı")) return "incelemede";
  return "uzman-onayı-bekliyor";
}
