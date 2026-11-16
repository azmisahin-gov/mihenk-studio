/**
 * Rapor görünüm modeli derleyicisi.
 *
 * Tek kanonik `TaskBundle` verisinden tek bir `ReportViewModel` üretir; A4
 * önizleme ve DOCX çıktısı bu modelden beslenir (bkz. ADR-005).
 *
 * Uzman tarafından verilmemiş karar tamamlanmış gibi gösterilmez: eksik yanıt,
 * dayanaksız bulgu ve onay bekleyen rapor burada açıkça belirtilir.
 */
import {
  REPORT_SECTION_IDS,
  SECTION_TITLES,
  type ReportAppendixView,
  type ReportSection,
  type ReportSectionId,
  type ReportViewModel,
} from "./reportViewModel.ts";
import {
  describeEvidence,
  evidenceForAnswer,
  evidenceForFinding,
  formatDuration,
  formatTime,
  segmentsForAudio,
  type TaskBundle,
} from "./taskBundle.ts";
import { SYNTHETIC_NOTICE } from "../domain/types.ts";

const SECTION_ORDER: ReportSectionId[] = [...REPORT_SECTION_IDS];

export interface BuildReportOptions {
  revisionNo: number;
  revisionId: string;
  generatedAt: string;
  expertName: string;
}

function materialName(bundle: TaskBundle, materialId: string): string {
  return bundle.materials.find((item) => item.materialId === materialId)?.originalName ?? materialId;
}

function audioName(bundle: TaskBundle, audioId: string): string {
  const audio = bundle.audios.find((item) => item.audioId === audioId);
  if (!audio) return audioId;
  return materialName(bundle, audio.materialId);
}

export function buildReportViewModel(bundle: TaskBundle, options: BuildReportOptions): ReportViewModel {
  const lookup = {
    materialName: (id: string) => materialName(bundle, id),
    audioName: (id: string) => audioName(bundle, id),
  };
  const sections: ReportSection[] = [];

  // I. Görevlendirme ve inceleme konusu
  sections.push({
    id: "gorevlendirme",
    heading: SECTION_TITLES.gorevlendirme,
    paragraphs: [
      `${bundle.task.authority} tarafından verilen ${bundle.task.caseNumber} sayılı görevlendirme kapsamında ` +
        `inceleme yürütülmüştür. İnceleme konusu: ${bundle.task.title}.`,
      bundle.assignments.length > 0
        ? `Görevlendirme belgesi ${bundle.assignments.length} adet olarak alınmıştır; belge bilgileri kaynağına bağlı tutulur.`
        : "Görevlendirme belgesi henüz alınmamıştır.",
      "Rapor teslim tarihi: " + bundle.task.dueDate + ".",
    ],
    bullets: bundle.fields
      .filter((field) => field.confirmation !== "reddedildi")
      .map(
        (field) =>
          `${field.key}: ${field.value} ` +
          `(kaynak: sayfa ${field.sourcePage}, ${field.sourceRegion}; ` +
          `teyit: ${field.confirmation === "teyit-bekliyor" ? "TEYİT BEKLİYOR" : field.confirmation})`,
      ),
    qa: [],
    findings: [],
    sourceRefs: [
      ...bundle.assignments.map((item) => `assignment:${item.assignmentId}`),
      ...bundle.fields.map((item) => `field:${item.fieldId}`),
    ],
    pageBreakBefore: false,
  });

  // II. İncelenen materyaller
  const audioBullets = bundle.audios.map((audio) => {
    const segments = segmentsForAudio(bundle.latestSegments, audio.audioId);
    return (
      `${materialName(bundle, audio.materialId)} · ${formatDuration(audio.durationMs)} · ` +
      `${audio.codec} · ${audio.sampleRateHz} Hz · ${audio.channels} kanal · ` +
      `${segments.length} segment · özet ${audio.sha256.slice(0, 12)}…`
    );
  });
  const otherMaterials = bundle.materials
    .filter((material) => material.kind !== "ses")
    .map((material) => `${material.originalName} · ${material.mimeType} · ${material.sizeBytes} bayt · ${material.status}`);
  sections.push({
    id: "materyal",
    heading: SECTION_TITLES.materyal,
    paragraphs: [
      `İncelemede ${bundle.audios.length} ses kaydı kullanılmıştır. Kaynak dosyalar değiştirilmeden korunmuştur; ` +
        "her kaydın kriptografik özeti rapora işlenmiştir.",
    ],
    bullets: [...audioBullets, ...otherMaterials],
    qa: [],
    findings: [],
    sourceRefs: bundle.materials.map((item) => `material:${item.materialId}`),
    pageBreakBefore: true,
  });

  // III. Yöntem ve teknik araçlar
  sections.push({
    id: "yontem",
    heading: SECTION_TITLES.yontem,
    paragraphs: [
      "İnceleme, kayıtların ilgili zaman aralıklarında dinlenmesi ve zaman damgalı dökümlerin " +
        "uzman tarafından kontrol edilmesi yoluyla yürütülmüştür.",
      "Ham otomatik konuşma tanıma (ASR) metni ile insan düzeltmesi ayrı sürümler olarak saklanmıştır; " +
        "ham metin hiçbir aşamada silinmemiştir.",
      "Konuşmacı etiketleri yalnızca kayıt içi anonim gruplardır; kimlik tespiti veya kayıtlar arası " +
        "biyometrik eşleştirme yapılmamıştır.",
      "Serbest büyük dil modeli, transkripsiyon kelimelerinin kaynağı olarak kullanılmamıştır.",
      "Bu ilk teslimatta üretim OCR ve ASR motoru kurulu değildir; kullanılan çıkarım ve döküm verisi " +
        "açıkça sentetiktir ve uzman doğrulaması gerektirir.",
    ],
    bullets: bundle.transcriptVersions.map(
      (version) =>
        `${audioName(bundle, version.audioId)} · ${version.kind} · ${version.source} · ` +
        `${version.createdBy} · ${version.createdAt}`,
    ),
    qa: [],
    findings: [],
    sourceRefs: bundle.transcriptVersions.map((item) => `transcript-version:${item.versionId}`),
    pageBreakBefore: true,
  });

  // IV. Ses kayıtlarının çözümlenmesi (özet; tam döküm ekte)
  const transcriptParagraphs: string[] = [];
  for (const audio of bundle.audios) {
    const segments = segmentsForAudio(bundle.latestSegments, audio.audioId);
    transcriptParagraphs.push(
      `${audioName(bundle, audio.audioId)} için ${segments.length} segment kayıtlıdır; ` +
        `tam döküm Ek-1'de yer alır.`,
    );
  }
  sections.push({
    id: "transkript",
    heading: SECTION_TITLES.transkript,
    paragraphs:
      transcriptParagraphs.length > 0
        ? transcriptParagraphs
        : ["İncelenecek transkript verisi bulunmamaktadır."],
    bullets: [],
    qa: [],
    findings: [],
    sourceRefs: bundle.audios.map((item) => `audio:${item.audioId}`),
    pageBreakBefore: true,
  });

  // V. Sorular ve yanıtlar
  const qa = bundle.questions
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((question) => {
      const answer = bundle.answers.find((item) => item.questionId === question.questionId);
      const evidence = answer ? evidenceForAnswer(answer.answerId, bundle) : [];
      return {
        question: `${question.index}. ${question.text}`,
        answer:
          answer && answer.text.trim().length > 0
            ? answer.text
            : "UZMAN YANITI BEKLİYOR — bu soru henüz yanıtlanmamıştır.",
        evidence: evidence.map((item) => describeEvidence(item, lookup)),
      };
    });
  sections.push({
    id: "sorular",
    heading: SECTION_TITLES.sorular,
    paragraphs: [],
    bullets: [],
    qa,
    findings: [],
    sourceRefs: [
      ...bundle.questions.map((item) => `question:${item.questionId}`),
      ...bundle.answers.map((item) => `answer:${item.answerId}@v${item.version}`),
    ],
    pageBreakBefore: true,
  });

  // VI. Bulgular
  const findings = bundle.findings
    .filter((finding) => finding.status !== "geri çekildi")
    .map((finding) => {
      const evidence = evidenceForFinding(finding.findingId, bundle);
      return {
        code: finding.code,
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
        evidence: evidence.map((item) => describeEvidence(item, lookup)),
      };
    });
  sections.push({
    id: "bulgular",
    heading: SECTION_TITLES.bulgular,
    paragraphs:
      findings.length > 0
        ? []
        : ["Dayanağa bağlı bulgu kaydı bulunmamaktadır."],
    bullets: [],
    qa: [],
    findings,
    sourceRefs: bundle.findings.map((item) => `finding:${item.findingId}`),
    pageBreakBefore: true,
  });

  // VII. Sonuç
  const answeredCount = bundle.answers.filter((answer) => answer.status === "tamamlandı").length;
  const evidenceCount = bundle.evidence.length;
  sections.push({
    id: "sonuc",
    heading: SECTION_TITLES.sonuc,
    paragraphs: [
      `İnceleme kapsamında ${bundle.audios.length} ses kaydı, ${bundle.questions.length} görevlendirme sorusu, ` +
        `${evidenceCount} dayanak ve ${findings.length} bulgu değerlendirilmiştir. ` +
        `Yanıtlanan soru sayısı: ${answeredCount}/${bundle.questions.length}.`,
      bundle.approved
        ? "Rapor uzman tarafından onaylanmıştır."
        : "Bu rapor TASLAKTIR. Nihai meslekî değerlendirme, imza ve resmî teslim kararı bilirkişinin " +
          "kontrolündedir; uygulama bu kararı vermez.",
      "Bu belge sentetik bir örnek üzerinden üretilmiştir ve resmî belge niteliği taşımaz.",
    ],
    bullets: [],
    qa: [],
    findings: [],
    sourceRefs: [
      ...bundle.evidence.map((item) => `evidence:${item.evidenceId}`),
      ...(bundle.approved ? ["approval:rapor-onayı"] : []),
    ],
    pageBreakBefore: true,
  });

  // Ekler: kayıt bazında tam döküm
  const appendices: ReportAppendixView[] = [];
  let appendixNo = 1;
  for (const audio of bundle.audios) {
    const latestSegments = segmentsForAudio(bundle.latestSegments, audio.audioId);
    const rawSegments = segmentsForAudio(bundle.rawSegments, audio.audioId);
    const blocks: { heading: string; lines: string[] }[] = [];
    blocks.push({
      heading: "Uzman tarafından incelenen sürüm",
      lines:
        latestSegments.length > 0
          ? latestSegments.map(
              (segment) =>
                `[${formatTime(segment.startMs)}–${formatTime(segment.endMs)}] ${segment.speakerLabel}: ` +
                `${segment.text}${segment.uncertain ? "  ⟨DUYULAMAYAN — İŞARETLİ⟩" : ""}`,
            )
          : ["Kayıtlı segment yok."],
    });
    if (rawSegments.length > 0 && latestSegments.length > 0) {
      const differs =
        rawSegments.length !== latestSegments.length ||
        rawSegments.some((segment, index) => segment.text !== latestSegments[index]?.text);
      blocks.push({
        heading: "Ham ASR sürümü (değiştirilmedi)",
        lines: differs
          ? rawSegments.map(
              (segment) =>
                `[${formatTime(segment.startMs)}–${formatTime(segment.endMs)}] ${segment.speakerLabel}: ${segment.text}`,
            )
          : ["Ham ASR metni, incelenen sürümle aynıdır."],
      });
    }
    appendices.push({
      title: `Ek-${appendixNo} · ${materialName(bundle, audio.materialId)} zaman damgalı döküm`,
      blocks,
    });
    appendixNo += 1;
  }
  appendices.push({
    title: `Ek-${appendixNo} · Teknik kayıt ve dayanak dizini`,
    blocks: [
      {
        heading: "Kaynak bütünlük özetleri",
        lines: bundle.materials.map(
          (material) => `${material.originalName} · ${material.sha256} · ${material.status}`,
        ),
      },
      {
        heading: "Dayanak dizini",
        lines:
          bundle.evidence.length > 0
            ? bundle.evidence.map(
                (item) => `${item.evidenceId} · ${item.kind} · ${describeEvidence(item, lookup)}`,
              )
            : ["Dayanak kaydı yok."],
      },
    ],
  });

  const pageCountHint = estimatePageCount(sections, appendices);

  return {
    header: {
      line1: "T.C.",
      authority: bundle.task.authority,
      title: "BİLİRKİŞİ RAPORU (TASLAK)",
      caseNumber: bundle.task.caseNumber,
      taskTitle: bundle.task.title,
      generatedAt: options.generatedAt,
      revisionNo: options.revisionNo,
      notice: SYNTHETIC_NOTICE,
    },
    sections,
    appendices,
    notice: SYNTHETIC_NOTICE,
    revisionId: options.revisionId,
    pageCountHint,
  };
}

/** Sayfa düzeni tahmini: her bölüm yeni sayfada başlar; uzun bölümler bölünür. */
export function estimatePageCount(sections: ReportSection[], appendices: ReportAppendixView[]): number {
  let pages = 0;
  for (const section of sections) {
    const lines =
      section.paragraphs.length + section.bullets.length + section.qa.length * 3 + section.findings.length * 3;
    pages += Math.max(1, Math.ceil(lines / 34));
  }
  for (const appendix of appendices) {
    const lines = appendix.blocks.reduce((total, block) => total + block.lines.length + 1, 0);
    pages += Math.max(1, Math.ceil(lines / 34));
  }
  return pages;
}

export { SECTION_ORDER };
