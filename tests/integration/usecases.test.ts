/**
 * Kullanım senaryosu entegrasyon testleri.
 *
 * Gerçek SQLite ve gerçek dosya deposu kullanılır; taklit (mock) yoktur
 * (bkz. ADR-009).
 */
import { describe, expect, it } from "vitest";
import { createTestContext } from "../helpers/testContext.ts";
import { DEFAULT_ACTOR, repositoriesFor } from "../../src/application/context.ts";
import { createTaskDraft, confirmField, startTask } from "../../src/application/usecases/createTaskDraft.ts";
import { saveTranscriptCorrection } from "../../src/application/usecases/saveTranscriptCorrection.ts";
import {
  createEvidence,
  createFinding,
  linkAnswerEvidence,
  saveAnswer,
} from "../../src/application/usecases/answerEvidenceFinding.ts";
import { seedGoldenScenario } from "../../src/infrastructure/seed/seedGoldenScenario.ts";

const encoder = new TextEncoder();

describe("Görev oluşturma", () => {
  it("ilk belge alımında benzersiz taslak görev üretir ve kaynak belge bilgisini korur", () => {
    const { ctx, close } = createTestContext();
    try {
      const taskId = ctx.ids.next("gorev");
      const repos = repositoriesFor(ctx, taskId);
      const result = createTaskDraft(ctx, repos, DEFAULT_ACTOR, {
        taskId,
        title: "Sentetik görev",
        caseNumber: "2026/0001 S. (SENTETİK)",
        authority: "Örnek Merci (SENTETİK)",
        dueDate: "01 Aralık 2026",
        kind: "Sentetik",
        documentName: "sentetik.pdf",
        documentBytes: encoder.encode("SENTETİK ÖRNEK"),
        documentMimeType: "application/pdf",
        documentType: "Görevlendirme",
        pageCount: 1,
        fields: [
          { key: "Dosya numarası", value: "2026/0001 S.", sourcePage: 1, sourceRegion: "üst", confidence: 0.9 },
        ],
        expectedMaterials: [{ label: "Kayıt A", kind: "ses", sourceNote: "Sentetik" }],
      });

      expect(result.task.taskId).toBe(taskId);
      expect(result.task.status).toBe("taslak");
      expect(result.task.synthetic).toBe(true);
      expect(result.material.originalName).toBe("sentetik.pdf");
      expect(result.material.sha256).toHaveLength(64);
      expect(result.material.status).toBe("alındı");
      expect(result.expectedMaterials).toHaveLength(1);
      expect(result.expectedMaterials[0]?.status).toBe("bekleniyor");
    } finally {
      close();
    }
  });

  it("okunamayan alanı tahmin etmez, teyit kuyruğuna alır", () => {
    const { ctx, close } = createTestContext();
    try {
      const taskId = ctx.ids.next("gorev");
      const repos = repositoriesFor(ctx, taskId);
      const result = createTaskDraft(ctx, repos, DEFAULT_ACTOR, {
        taskId,
        title: "Sentetik",
        caseNumber: "2026/0002 S.",
        authority: "Örnek",
        dueDate: "01 Aralık 2026",
        kind: "Sentetik",
        documentName: "sentetik.pdf",
        documentBytes: encoder.encode("SENTETİK"),
        documentMimeType: "application/pdf",
        documentType: "Görevlendirme",
        pageCount: 1,
        fields: [
          { key: "Net alan", value: "Değer", sourcePage: 1, sourceRegion: "üst", confidence: 0.95 },
          { key: "Belirsiz alan", value: "", sourcePage: 2, sourceRegion: "alt", confidence: 0.3, uncertain: true },
        ],
        expectedMaterials: [],
      });

      expect(result.fields[0]?.confirmation).toBe("otomatik");
      expect(result.fields[0]?.value).toBe("Değer");
      expect(result.fields[1]?.confirmation).toBe("teyit-bekliyor");
      expect(result.fields[1]?.value).toBe("");
      expect(result.pendingConfirmation).toHaveLength(1);

      // Teyit sonrası değer kaydedilir.
      confirmField(ctx, repos, DEFAULT_ACTOR, taskId, result.fields[1]!.fieldId, "Teyit edilmiş değer");
      const refreshed = repos.fields.findById(result.fields[1]!.fieldId);
      expect(refreshed?.value).toBe("Teyit edilmiş değer");
      expect(refreshed?.confirmation).toBe("teyit-edildi");
    } finally {
      close();
    }
  });

  it("eksik materyal görev oluşturmayı engellemez", () => {
    const { ctx, close } = createTestContext();
    try {
      const taskId = ctx.ids.next("gorev");
      const repos = repositoriesFor(ctx, taskId);
      const result = createTaskDraft(ctx, repos, DEFAULT_ACTOR, {
        taskId,
        title: "Eksik materyalli görev",
        caseNumber: "2026/0003 S.",
        authority: "Örnek",
        dueDate: "01 Aralık 2026",
        kind: "Sentetik",
        documentName: "sentetik.pdf",
        documentBytes: encoder.encode("SENTETİK"),
        documentMimeType: "application/pdf",
        documentType: "Görevlendirme",
        pageCount: 1,
        fields: [],
        expectedMaterials: [
          { label: "Hiç teslim edilmeyen kayıt", kind: "ses", sourceNote: "Sentetik" },
          { label: "İkinci eksik kayıt", kind: "ses", sourceNote: "Sentetik" },
        ],
      });
      expect(result.task.taskId).toBe(taskId);
      expect(repos.expectedMaterials.listAll().every((item) => item.status === "bekleniyor")).toBe(true);

      startTask(ctx, repos, DEFAULT_ACTOR, taskId);
      expect(repos.tasks.findById(taskId)?.status).toBe("incelemede");
    } finally {
      close();
    }
  });
});

describe("Transkript düzeltmesi", () => {
  it("yeni sürüm üretir ve ham ASR sürümünü korur", () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const audioId = seeded.audioIds["kayit-a"] as string;

      const before = repos.transcripts.listVersionsForAudio(audioId);
      expect(before.some((version) => version.kind === "ham-asr")).toBe(true);
      const rawVersion = before.find((version) => version.kind === "ham-asr")!;
      const rawSegments = repos.transcripts.listSegmentsForVersion(rawVersion.versionId);

      const latestBefore = repos.transcripts.latestVersionForAudio(audioId)!;
      const latestSegments = repos.transcripts.listSegmentsForVersion(latestBefore.versionId);
      const target = latestSegments[0]!;

      saveTranscriptCorrection(ctx, repos, DEFAULT_ACTOR, seeded.taskId, {
        audioId,
        note: "İkinci uzman düzeltmesi",
        corrections: [{ segmentId: target.segmentId, text: "Düzeltilmiş metin (ikinci revizyon)" }],
      });

      const after = repos.transcripts.listVersionsForAudio(audioId);
      expect(after.length).toBe(before.length + 1);
      const correctionVersions = after.filter((version) => version.kind === "insan-düzeltmesi");
      expect(correctionVersions.length).toBeGreaterThanOrEqual(2);

      // Ham sürüm ve segmentleri değişmeden durur.
      const rawSegmentsAfter = repos.transcripts.listSegmentsForVersion(rawVersion.versionId);
      expect(rawSegmentsAfter).toHaveLength(rawSegments.length);
      expect(rawSegmentsAfter.map((segment) => segment.text)).toEqual(rawSegments.map((segment) => segment.text));

      const latestAfter = repos.transcripts.latestVersionForAudio(audioId)!;
      const correctedSegments = repos.transcripts.listSegmentsForVersion(latestAfter.versionId);
      expect(correctedSegments.some((segment) => segment.text.includes("ikinci revizyon"))).toBe(true);
    } finally {
      close();
    }
  });

  it("boş düzeltmeyi yalnızca duyulamayan işaretiyle kabul eder", () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const audioId = seeded.audioIds["kayit-a"] as string;
      const latest = repos.transcripts.latestVersionForAudio(audioId)!;
      const segment = repos.transcripts.listSegmentsForVersion(latest.versionId)[0]!;

      expect(() =>
        saveTranscriptCorrection(ctx, repos, DEFAULT_ACTOR, seeded.taskId, {
          audioId,
          note: "Geçersiz boş düzeltme",
          corrections: [{ segmentId: segment.segmentId, text: "   " }],
        }),
      ).toThrow();

      expect(() =>
        saveTranscriptCorrection(ctx, repos, DEFAULT_ACTOR, seeded.taskId, {
          audioId,
          note: "Duyulamayan işareti",
          corrections: [{ segmentId: segment.segmentId, text: "", uncertain: true }],
        }),
      ).not.toThrow();
    } finally {
      close();
    }
  });
});

describe("Yanıt, dayanak ve bulgu", () => {
  it("dayanaksız bulgu oluşturulamaz", () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      expect(() =>
        createFinding(ctx, repos, DEFAULT_ACTOR, seeded.taskId, {
          code: "B-99",
          title: "Dayanaksız",
          description: "Bu bulgu dayanak taşımıyor.",
          severity: "orta",
          evidenceIds: [],
        }),
      ).toThrow();
    } finally {
      close();
    }
  });

  it("başka görevin dayanağını bulguya bağlamayı reddeder", () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const otherTaskId = ctx.ids.next("gorev");
      const reposOther = repositoriesFor(ctx, otherTaskId);
      // İkinci görev oluşturulmadan yalnızca kayıt eklenmiş sayılır; dayanak bulunamaz.
      expect(() =>
        createFinding(ctx, reposOther, DEFAULT_ACTOR, otherTaskId, {
          code: "B-01",
          title: "Yabancı dayanak",
          description: "Başka görevin dayanağı kullanılıyor.",
          severity: "orta",
          evidenceIds: [seeded.evidenceIds[0] as string],
        }),
      ).toThrow();
    } finally {
      close();
    }
  });

  it("yanıt sürümü artar ve dayanak bağlanabilir", () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const questionId = seeded.questionIds[0] as string;

      const before = repos.answers.findByQuestion(questionId)!;
      const after = saveAnswer(ctx, repos, DEFAULT_ACTOR, seeded.taskId, {
        questionId,
        text: "Güncellenmiş sentetik yanıt metni.",
        complete: true,
      });
      expect(after.version).toBe(before.version + 1);
      expect(after.status).toBe("tamamlandı");

      const evidenceId = seeded.evidenceIds[0] as string;
      linkAnswerEvidence(ctx, repos, DEFAULT_ACTOR, seeded.taskId, after.answerId, evidenceId);
      const linked = repos.evidence.listForAnswer(after.answerId);
      expect(linked.some((item) => item.evidenceId === evidenceId)).toBe(true);
    } finally {
      close();
    }
  });

  it("dayanak gerçek bir kayıt ve segmente bağlanır", () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const audioId = seeded.audioIds["kayit-b"] as string;
      const latest = repos.transcripts.latestVersionForAudio(audioId)!;
      const segment = repos.transcripts.listSegmentsForVersion(latest.versionId)[0]!;

      const evidence = createEvidence(ctx, repos, DEFAULT_ACTOR, seeded.taskId, {
        kind: "ses-segmenti",
        audioId,
        segmentId: segment.segmentId,
        note: "Test dayanağı",
      });
      expect(evidence.kind).toBe("ses-segmenti");
      if (evidence.kind === "ses-segmenti") {
        expect(evidence.startMs).toBe(segment.startMs);
        expect(evidence.endMs).toBe(segment.endMs);
      }

      // Var olmayan segment reddedilir.
      expect(() =>
        createEvidence(ctx, repos, DEFAULT_ACTOR, seeded.taskId, {
          kind: "ses-segmenti",
          audioId,
          segmentId: "olmayan-segment",
          note: "Geçersiz",
        }),
      ).toThrow();
    } finally {
      close();
    }
  });
});
