/**
 * DOCX çıktısı ve rapor tutarlılığı entegrasyon testleri.
 *
 * Üretilen DOCX gerçek bir OOXML paketidir; içeriği açılarak doğrulanır
 * (bkz. MIH-REQ-RPT-006, MIH-REQ-RPT-007, MIH-REQ-SNT-002).
 */
import { describe, expect, it } from "vitest";
import { createTestContext } from "../helpers/testContext.ts";
import { DEFAULT_ACTOR, repositoriesFor } from "../../src/application/context.ts";
import { seedGoldenScenario } from "../../src/infrastructure/seed/seedGoldenScenario.ts";
import { previewReport } from "../../src/application/usecases/buildReport.ts";
import { exportReportDocx } from "../../src/application/usecases/exportReport.ts";
import { SYNTHETIC_NOTICE } from "../../src/domain/types.ts";
import { unzipSync, strFromU8 } from "fflate";

describe("DOCX dışa aktarma", () => {
  it("açılabilir bir OOXML paketi üretir ve sentetik uyarıyı her sayfada taşır", async () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const result = await exportReportDocx(ctx, repos, DEFAULT_ACTOR, seeded.taskId);

      // DOCX bir ZIP arşividir; ilk baytları "PK" olmalıdır.
      expect(result.bytes[0]).toBe(0x50);
      expect(result.bytes[1]).toBe(0x4b);

      const files = unzipSync(result.bytes);
      const names = Object.keys(files);
      // Zorunlu OOXML parçaları bulunmalıdır.
      expect(names).toContain("[Content_Types].xml");
      expect(names).toContain("word/document.xml");
      expect(names).toContain("word/header1.xml");
      expect(names).toContain("word/footer1.xml");

      const documentXml = strFromU8(files["word/document.xml"] as Uint8Array);
      const headerXml = strFromU8(files["word/header1.xml"] as Uint8Array);
      const footerXml = strFromU8(files["word/footer1.xml"] as Uint8Array);

      // Sentetik uyarı gövdede, üst bilgide ve alt bilgide bulunmalıdır.
      expect(documentXml).toContain("SENTETİK ÖRNEK");
      expect(headerXml).toContain("SENTETİK ÖRNEK");
      expect(footerXml).toContain("SENTETİK ÖRNEK");

      // Türkçe karakterler bozulmadan yer almalıdır.
      expect(documentXml).toMatch(/İ|ş|ğ|ç|ö|ü|ı/);

      // Rapor bölüm başlıkları ve ekler bulunmalıdır.
      expect(documentXml).toContain("GÖREVLENDİRME VE İNCELEME KONUSU");
      expect(documentXml).toContain("İNCELENEN MATERYALLER");
      expect(documentXml).toContain("İNCELEME BULGULARI");
      expect(documentXml).toContain("Ek-");

      // Uzman onayı verilmediği için taslak ibaresi bulunmalıdır.
      expect(documentXml).toContain("TASLAK");

      // Rapor onaylanmadan "onaylandı" ifadesi geçmemelidir.
      expect(documentXml).not.toContain("Rapor uzman tarafından onaylanmıştır");
    } finally {
      close();
    }
  });

  it("A4 önizleme ve DOCX aynı kanonik modelden üretilir", async () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const { viewModel } = previewReport(ctx, repos, seeded.taskId);
      const result = await exportReportDocx(ctx, repos, DEFAULT_ACTOR, seeded.taskId);
      const documentXml = strFromU8(unzipSync(result.bytes)["word/document.xml"] as Uint8Array);

      // Önizlemedeki her soru metni DOCX'te de bulunmalıdır.
      const questionSection = viewModel.sections.find((section) => section.id === "sorular")!;
      for (const qa of questionSection.qa) {
        const normalizedQuestion = qa.question.replace(/\s+/g, " ").slice(0, 30);
        const normalizedDocument = documentXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
        expect(normalizedDocument).toContain(normalizedQuestion.replace(/\s+/g, " ").slice(0, 20));
      }

      // Rapor revizyon numarası iki çıktıda aynı olmalıdır.
      expect(viewModel.header.revisionNo).toBe(1);
      expect(documentXml).toContain("Rev. 1");
    } finally {
      close();
    }
  });

  it("açıkça sentetik işaretlenmiş dosya adı üretir", async () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const result = await exportReportDocx(ctx, repos, DEFAULT_ACTOR, seeded.taskId);
      expect(result.fileName).toContain("SENTETIK");
      expect(result.fileName.endsWith(".docx")).toBe(true);
      expect(result.notice).toBe(SYNTHETIC_NOTICE);
    } finally {
      close();
    }
  });

  it("onaylanmamış rapor için uzman onayı ibaresi üretmez", async () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const result = await exportReportDocx(ctx, repos, DEFAULT_ACTOR, seeded.taskId);
      const documentXml = strFromU8(unzipSync(result.bytes)["word/document.xml"] as Uint8Array);
      expect(documentXml).toContain("TASLAKTIR");
      expect(documentXml).toContain("bilirkişinin");
    } finally {
      close();
    }
  });
});
