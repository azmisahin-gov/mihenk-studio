/**
 * Altın sentetik senaryoyu veri tabanına yazar.
 *
 * Tüm yazma işlemleri gerçek kullanım senaryoları üzerinden yapılır; böylece
 * tohumlama, üretim kod yolunun aynısını kullanır (taklit yok).
 */
import type { AppContext } from "../../application/context.ts";
import { repositoriesFor, audit, type Actor } from "../../application/context.ts";
import { createTaskDraft, startTask } from "../../application/usecases/createTaskDraft.ts";
import { saveTranscriptCorrection } from "../../application/usecases/saveTranscriptCorrection.ts";
import {
  createEvidence,
  createFinding,
  linkAnswerEvidence,
  saveAnswer,
  verifyFinding,
} from "../../application/usecases/answerEvidenceFinding.ts";
import { buildReport } from "../../application/usecases/buildReport.ts";
import type {
  AudioRecord,
  Material,
  TranscriptSegment,
  TranscriptVersion,
} from "../../domain/types.ts";
import { GOLDEN_ASSIGNMENT, SYNTHETIC_MARKER, type GoldenAudio } from "./goldenScenario.ts";

export interface SeedResult {
  taskId: string;
  audioIds: Record<string, string>;
  questionIds: string[];
  evidenceIds: string[];
  findingIds: string[];
  reportId: string;
  revisionId: string;
}

function syntheticPdfBytes(text: string): Uint8Array {
  // Gerçek bir PDF üretmez; yalnızca sentetik içerik taşıyan bir bayt dizisidir.
  const body = `${SYNTHETIC_MARKER}\n\n${text}\n\nBu belge yalnızca yazılım testi içindir.`;
  return new TextEncoder().encode(body);
}

function syntheticWavBytes(audio: GoldenAudio): Uint8Array {
  // Gerçek ses verisi değildir; kayıt kimliği ve sentetik işaret taşır.
  const header = `SENTETIK-SES ${audio.fileName} ${audio.durationMs}ms ${audio.sampleRateHz}Hz ${audio.channels}ch`;
  const filler = "·".repeat(2048);
  return new TextEncoder().encode(`${header}\n${filler}\n${SYNTHETIC_MARKER}`);
}

export function seedGoldenScenario(ctx: AppContext, actor: Actor): SeedResult {
  const taskId = ctx.ids.next("gorev");
  const repos = repositoriesFor(ctx, taskId);

  // 1. Görevlendirme belgesi ve görev taslağı
  createTaskDraft(ctx, repos, actor, {
    taskId,
    title: GOLDEN_ASSIGNMENT.title,
    caseNumber: GOLDEN_ASSIGNMENT.caseNumber,
    authority: GOLDEN_ASSIGNMENT.authority,
    dueDate: GOLDEN_ASSIGNMENT.dueDate,
    kind: GOLDEN_ASSIGNMENT.kind,
    documentName: GOLDEN_ASSIGNMENT.documentName,
    documentBytes: syntheticPdfBytes(
      `${GOLDEN_ASSIGNMENT.authority}\nDosya: ${GOLDEN_ASSIGNMENT.caseNumber}\nKonu: ${GOLDEN_ASSIGNMENT.title}`,
    ),
    documentMimeType: GOLDEN_ASSIGNMENT.documentMimeType,
    documentType: GOLDEN_ASSIGNMENT.documentType,
    pageCount: GOLDEN_ASSIGNMENT.pageCount,
    fields: GOLDEN_ASSIGNMENT.fields.map((field) => ({ ...field })),
    expectedMaterials: GOLDEN_ASSIGNMENT.expectedMaterials.map((item) => ({ ...item })),
  });

  startTask(ctx, repos, actor, taskId);

  // 2. Sorular
  const questionIds: string[] = [];
  const fieldIds = repos.fields.listAll().map((field) => field.fieldId);
  for (const question of GOLDEN_ASSIGNMENT.questions) {
    const questionId = ctx.ids.next("soru");
    repos.questions.insert({
      questionId,
      taskId,
      index: question.index,
      text: question.text,
      sourceFieldId: fieldIds[question.index - 1],
      sourceNote: "Görevlendirme belgesinden çıkarıldı (sentetik)",
    });
    questionIds.push(questionId);
  }

  // 3. Ses kayıtları, ham ASR sürümü ve segmentler
  const audioIds: Record<string, string> = {};
  const rawSegmentIds = new Map<string, string[]>();

  for (const audio of GOLDEN_ASSIGNMENT.audios) {
    const stored = ctx.files.storeBytes(taskId, audio.fileName, syntheticWavBytes(audio), "audio/wav");
    const material: Material = {
      materialId: ctx.ids.next("materyal"),
      taskId,
      originalName: audio.fileName,
      storedName: stored.storedName,
      mimeType: "audio/wav",
      sizeBytes: stored.sizeBytes,
      sha256: stored.sha256,
      receivedAt: ctx.clock.now(),
      kind: "ses",
      status: "doğrulandı",
    };
    repos.materials.insert(material);

    const record: AudioRecord = {
      audioId: ctx.ids.next("kayit"),
      taskId,
      materialId: material.materialId,
      durationMs: audio.durationMs,
      sampleRateHz: audio.sampleRateHz,
      channels: audio.channels,
      codec: audio.codec,
      originNote: audio.originNote,
      sha256: stored.sha256,
    };
    repos.audios.insert(record);
    audioIds[audio.key] = record.audioId;

    const version: TranscriptVersion = {
      versionId: ctx.ids.next("transkript"),
      taskId,
      audioId: record.audioId,
      kind: "ham-asr",
      source: "asr-motoru",
      createdBy: "Sentetik ASR çıktısı (motor kurulu değil)",
      createdAt: ctx.clock.now(),
      note: "Ham ASR metni; değiştirilemez.",
    };
    repos.transcripts.insertVersion(version);

    const segmentIds: string[] = [];
    for (const segment of audio.segments) {
      const segmentId = ctx.ids.next("segment");
      const entity: TranscriptSegment = {
        segmentId,
        taskId,
        versionId: version.versionId,
        audioId: record.audioId,
        index: segment.index,
        startMs: segment.startMs,
        endMs: segment.endMs,
        speakerLabel: segment.speakerLabel,
        text: segment.rawText,
        uncertain: segment.uncertain === true,
        reviewState: "bekliyor",
        priorityReason: segment.priorityReason ?? null,
        note: "Ham ASR segmenti (sentetik)",
      };
      repos.transcripts.insertSegment(entity);
      segmentIds.push(segmentId);
    }
    rawSegmentIds.set(audio.key, segmentIds);

    // Beklenen materyal karşılığı: alındı olarak işaretlenir.
    const expected = repos.expectedMaterials.listAll().find((item) => item.label.includes(
      audio.key === "kayit-a" ? "kayıt A" : "kayıt B",
    ));
    if (expected) repos.expectedMaterials.updateStatus(expected.expectedId, "alındı");
  }

  // 4. İnsan düzeltme sürümü (ham sürüm korunur)
  for (const audio of GOLDEN_ASSIGNMENT.audios) {
    const audioId = audioIds[audio.key];
    if (!audioId) continue;
    const rawIds = rawSegmentIds.get(audio.key) ?? [];
    const corrections = GOLDEN_ASSIGNMENT.corrections
      .filter((item) => item.audioKey === audio.key)
      .map((item) => ({
        segmentId: rawIds[item.segmentIndex] as string,
        text: item.correctedText,
        uncertain: audio.segments[item.segmentIndex]?.uncertain === true,
      }));
    saveTranscriptCorrection(ctx, repos, actor, taskId, {
      audioId,
      note: "Uzman kontrolü ve düzeltmesi (sentetik senaryo)",
      corrections,
    });
    // İncelenmemiş segmentler de uzman tarafından gözden geçirildi.
    const latestVersion = repos.transcripts.latestVersionForAudio(audioId);
    if (latestVersion) {
      for (const segment of repos.transcripts.listSegmentsForVersion(latestVersion.versionId)) {
        if (segment.reviewState === "bekliyor") {
          repos.transcripts.updateSegmentReview(segment.segmentId, "incelendi", segment.priorityReason);
        }
      }
    }
  }

  // 5. Yanıtlar
  const answerIds: string[] = [];
  for (const question of GOLDEN_ASSIGNMENT.questions) {
    const questionId = questionIds[question.index - 1] as string;
    const answer = saveAnswer(ctx, repos, actor, taskId, {
      questionId,
      text: question.answer,
      complete: true,
    });
    answerIds.push(answer.answerId);
  }

  // 6. Dayanaklar: iki farklı kayıttan somut referanslar
  const evidenceIds: string[] = [];
  const evidenceByKey = new Map<string, string>();

  for (const finding of GOLDEN_ASSIGNMENT.findings) {
    for (const reference of finding.evidence) {
      const audioId = audioIds[reference.audioKey];
      if (!audioId) continue;
      const latestVersion = repos.transcripts.latestVersionForAudio(audioId);
      if (!latestVersion) continue;
      const segments = repos.transcripts.listSegmentsForVersion(latestVersion.versionId);
      const segment = segments[reference.segmentIndex];
      if (!segment) continue;
      const evidence = createEvidence(ctx, repos, actor, taskId, {
        kind: "ses-segmenti",
        audioId,
        segmentId: segment.segmentId,
        note: reference.note,
      });
      evidenceIds.push(evidence.evidenceId);
      evidenceByKey.set(`${reference.audioKey}:${reference.segmentIndex}`, evidence.evidenceId);
    }
  }

  // Yanıt 1: her iki kayda dayanır (iki farklı kayıttan dayanak).
  const answerOne = answerIds[0] as string;
  const evidenceA = evidenceByKey.get("kayit-a:1");
  const evidenceB = evidenceByKey.get("kayit-b:1");
  if (evidenceA) linkAnswerEvidence(ctx, repos, actor, taskId, answerOne, evidenceA);
  if (evidenceB) linkAnswerEvidence(ctx, repos, actor, taskId, answerOne, evidenceB);

  // Yanıt 2: konuşmacı grupları bulgusuyla aynı dayanaklar.
  const answerTwo = answerIds[1] as string;
  if (evidenceA) linkAnswerEvidence(ctx, repos, actor, taskId, answerTwo, evidenceA);
  if (evidenceB) linkAnswerEvidence(ctx, repos, actor, taskId, answerTwo, evidenceB);

  // Yanıt 3: belirsiz bölüm dayanağı.
  const answerThree = answerIds[2] as string;
  const evidenceUncertain = evidenceByKey.get("kayit-b:2");
  if (evidenceUncertain) linkAnswerEvidence(ctx, repos, actor, taskId, answerThree, evidenceUncertain);

  // 7. Bulgular
  const findingIds: string[] = [];
  for (const finding of GOLDEN_ASSIGNMENT.findings) {
    const linked = finding.evidence
      .map((reference) => evidenceByKey.get(`${reference.audioKey}:${reference.segmentIndex}`))
      .filter((value): value is string => Boolean(value));
    const created = createFinding(ctx, repos, actor, taskId, {
      code: finding.code,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      evidenceIds: linked,
      relatedQuestionIds: questionIds,
    });
    findingIds.push(created.findingId);
    verifyFinding(ctx, repos, actor, taskId, created.findingId, "Uzman doğrulaması (sentetik senaryo)");
  }

  // 8. Rapor revizyonu
  const built = buildReport(ctx, repos, actor, taskId, GOLDEN_ASSIGNMENT.reportRevisionReason);

  audit(repos, ctx, taskId, actor, "altin-senaryo-tohumlandi", "Task", taskId, {
    audioCount: Object.keys(audioIds).length,
    questionCount: questionIds.length,
    evidenceCount: evidenceIds.length,
    findingCount: findingIds.length,
  });

  return {
    taskId,
    audioIds,
    questionIds,
    evidenceIds,
    findingIds,
    reportId: built.report.reportId,
    revisionId: built.revision.revisionId,
  };
}

/**
 * İkinci bir sentetik görev oluşturur. Yalnızca görev yalıtımı testleri için
 * kullanılır; farklı veri taşır ve ilk görevle hiçbir kayıt paylaşmaz.
 */
export function seedIsolationCounterpart(ctx: AppContext, actor: Actor): SeedResult {
  const taskId = ctx.ids.next("gorev");
  const repos = repositoriesFor(ctx, taskId);

  createTaskDraft(ctx, repos, actor, {
    taskId,
    title: "Yalıtım denetimi için ikinci sentetik görev",
    caseNumber: "2026/0001 S. (SENTETİK-YALITIM)",
    authority: "Örnek İkinci Merci (SENTETİK)",
    dueDate: "30 Kasım 2026",
    kind: "Yalıtım denemesi (sentetik)",
    documentName: "Sentetik_Yalitim_Gorevlendirme.pdf",
    documentBytes: syntheticPdfBytes("İkinci sentetik görev belgesi"),
    documentMimeType: "application/pdf",
    documentType: "Görevlendirme yazısı (sentetik)",
    pageCount: 1,
    fields: [
      {
        key: "Görevlendiren merci",
        value: "Örnek İkinci Merci (SENTETİK)",
        sourcePage: 1,
        sourceRegion: "üst başlık",
        confidence: 0.9,
      },
    ],
    expectedMaterials: [{ label: "Yalıtım kaydı", kind: "ses", sourceNote: "Sentetik" }],
  });
  startTask(ctx, repos, actor, taskId);

  const questionId = ctx.ids.next("soru");
  repos.questions.insert({
    questionId,
    taskId,
    index: 1,
    text: "Yalıtım görevi için sentetik soru.",
    sourceNote: "Sentetik",
  });
  const answer = saveAnswer(ctx, repos, actor, taskId, {
    questionId,
    text: "Yalıtım görevi için sentetik yanıt.",
    complete: true,
  });

  const stored = ctx.files.storeBytes(
    taskId,
    "Sentetik_Yalitim_Kaydi.wav",
    syntheticWavBytes({
      key: "yalitim",
      fileName: "Sentetik_Yalitim_Kaydi.wav",
      durationMs: 10_000,
      sampleRateHz: 8_000,
      channels: 1,
      codec: "WAV · PCM 16-bit",
      originNote: "Yalıtım testi (sentetik)",
      segments: [],
    }),
    "audio/wav",
  );
  const material: Material = {
    materialId: ctx.ids.next("materyal"),
    taskId,
    originalName: "Sentetik_Yalitim_Kaydi.wav",
    storedName: stored.storedName,
    mimeType: "audio/wav",
    sizeBytes: stored.sizeBytes,
    sha256: stored.sha256,
    receivedAt: ctx.clock.now(),
    kind: "ses",
    status: "doğrulandı",
  };
  repos.materials.insert(material);

  const audio: AudioRecord = {
    audioId: ctx.ids.next("kayit"),
    taskId,
    materialId: material.materialId,
    durationMs: 10_000,
    sampleRateHz: 8_000,
    channels: 1,
    codec: "WAV · PCM 16-bit",
    originNote: "Yalıtım testi (sentetik)",
    sha256: stored.sha256,
  };
  repos.audios.insert(audio);

  const version: TranscriptVersion = {
    versionId: ctx.ids.next("transkript"),
    taskId,
    audioId: audio.audioId,
    kind: "ham-asr",
    source: "asr-motoru",
    createdBy: "Sentetik ASR çıktısı",
    createdAt: ctx.clock.now(),
    note: "Yalıtım testi ham sürümü",
  };
  repos.transcripts.insertVersion(version);
  const segment: TranscriptSegment = {
    segmentId: ctx.ids.next("segment"),
    taskId,
    versionId: version.versionId,
    audioId: audio.audioId,
    index: 0,
    startMs: 1_000,
    endMs: 4_000,
    speakerLabel: "Konuşmacı A",
    text: "Yalıtım görevi sentetik segmenti.",
    uncertain: false,
    reviewState: "incelendi",
    priorityReason: null,
    note: "Sentetik",
  };
  repos.transcripts.insertSegment(segment);

  const evidence = createEvidence(ctx, repos, actor, taskId, {
    kind: "ses-segmenti",
    audioId: audio.audioId,
    segmentId: segment.segmentId,
    note: "Yalıtım dayanağı",
  });
  linkAnswerEvidence(ctx, repos, actor, taskId, answer.answerId, evidence.evidenceId);

  const finding = createFinding(ctx, repos, actor, taskId, {
    code: "YB-01",
    title: "Yalıtım görevi sentetik bulgusu",
    description: "Bu bulgu yalnızca görev yalıtımı testi için üretilmiştir.",
    severity: "düşük",
    evidenceIds: [evidence.evidenceId],
  });

  const built = buildReport(ctx, repos, actor, taskId, "Yalıtım görevi ilk revizyonu");

  return {
    taskId,
    audioIds: { yalitim: audio.audioId },
    questionIds: [questionId],
    evidenceIds: [evidence.evidenceId],
    findingIds: [finding.findingId],
    reportId: built.report.reportId,
    revisionId: built.revision.revisionId,
  };
}
