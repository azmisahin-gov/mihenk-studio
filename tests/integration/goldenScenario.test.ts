/**
 * Altın sentetik senaryo uçtan uca entegrasyon testi.
 *
 * Tohumlama gerçek kullanım senaryolarını kullanır; rapor derleme, kalite
 * kontrolü ve DOCX üretimi aynı veri yolundan geçer.
 */
import { describe, expect, it } from "vitest";
import { createTestContext } from "../helpers/testContext.ts";
import { DEFAULT_ACTOR, repositoriesFor } from "../../src/application/context.ts";
import { seedGoldenScenario } from "../../src/infrastructure/seed/seedGoldenScenario.ts";
import { previewReport } from "../../src/application/usecases/buildReport.ts";
import { exportReportDocx } from "../../src/application/usecases/exportReport.ts";
import { SYNTHETIC_NOTICE } from "../../src/domain/types.ts";

describe("Altın sentetik senaryo", () => {
  it("tohumlandığında sözleşmede istenen tüm veri öğelerini üretir", () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const bundle = {
        materials: repos.materials.listAll(),
        audios: repos.audios.listAll(),
        questions: repos.questions.listAll(),
        answers: repos.answers.listAll(),
        evidence: repos.evidence.listAll(),
        findings: repos.findings.listAll(),
        segments: repos.transcripts.listSegmentsForAudio(seeded.audioIds["kayit-a"] as string),
      };

      expect(bundle.audios).toHaveLength(2);
      expect(bundle.questions.length).toBeGreaterThanOrEqual(3);
      expect(bundle.findings.length).toBeGreaterThanOrEqual(2);
      expect(bundle.evidence.length).toBeGreaterThanOrEqual(2);

      // İki farklı kayıttan dayanak bulunmalı.
      const audioIdsWithEvidence = new Set(
        bundle.evidence
          .filter((item) => item.kind === "ses-segmenti")
          .map((item) => (item.kind === "ses-segmenti" ? item.audioId : "")),
      );
      expect(audioIdsWithEvidence.size).toBeGreaterThanOrEqual(2);

      // Ham ASR ve insan düzeltmesi ayrı sürümler olmalı.
      const versionsA = repos.transcripts.listVersionsForAudio(seeded.audioIds["kayit-a"] as string);
      expect(versionsA.some((version) => version.kind === "ham-asr")).toBe(true);
      expect(versionsA.some((version) => version.kind === "insan-düzeltmesi")).toBe(true);
    } finally {
      close();
    }
  });

  it("rapor görünüm modelini tüm bölümlerle ve sentetik uyarıyla üretir", () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const { viewModel } = previewReport(ctx, repos, seeded.taskId);

      expect(viewModel.notice).toBe(SYNTHETIC_NOTICE);
      expect(viewModel.header.notice).toBe(SYNTHETIC_NOTICE);
      expect(viewModel.sections.map((section) => section.id)).toEqual([
        "gorevlendirme",
        "materyal",
        "yontem",
        "transkript",
        "sorular",
        "bulgular",
        "sonuc",
      ]);
      const questionSection = viewModel.sections.find((section) => section.id === "sorular");
      expect(questionSection?.qa.length).toBeGreaterThanOrEqual(3);
      const findingSection = viewModel.sections.find((section) => section.id === "bulgular");
      expect(findingSection?.findings.length).toBeGreaterThanOrEqual(2);
      // Her bulgu en az bir dayanak taşımalı.
      for (const finding of findingSection?.findings ?? []) {
        expect(finding.evidence.length).toBeGreaterThan(0);
      }
      // Ekler: her kayıt için bir döküm + teknik kayıt.
      expect(viewModel.appendices.length).toBeGreaterThanOrEqual(3);
    } finally {
      close();
    }
  });

  it("açılabilir DOCX üretir ve içinde sentetik uyarı bulunur", async () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const result = await exportReportDocx(ctx, repos, DEFAULT_ACTOR, seeded.taskId);

      expect(result.bytes.byteLength).toBeGreaterThan(1000);
      expect(result.fileName.endsWith(".docx")).toBe(true);

      // DOCX bir ZIP arşividir; ilk baytları "PK" olmalıdır.
      expect(result.bytes[0]).toBe(0x50);
      expect(result.bytes[1]).toBe(0x4b);
    } finally {
      close();
    }
  });
});
