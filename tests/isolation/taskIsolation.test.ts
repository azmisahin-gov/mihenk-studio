/**
 * Görevler arası veri yalıtımı negatif testleri.
 *
 * Bu test grubu, denetim raporundaki en yüksek öncelikli P1 bulgusunu (görevler
 * arası veri sızıntısı) hedefler. İki sentetik görev oluşturulur ve hiçbir alt
 * kaydın diğer görevde görünmediği doğrulanır (bkz. MIH-REQ-TSK-002, ADR-006).
 */
import { describe, expect, it } from "vitest";
import { createTestContext } from "../helpers/testContext.ts";
import { DEFAULT_ACTOR, repositoriesFor } from "../../src/application/context.ts";
import { TaskIsolationError, TaskScope } from "../../src/infrastructure/repositories/base.ts";
import { seedGoldenScenario, seedIsolationCounterpart } from "../../src/infrastructure/seed/seedGoldenScenario.ts";
import { loadTaskBundle } from "../../src/application/usecases/loadTaskBundle.ts";
import { previewReport } from "../../src/application/usecases/buildReport.ts";

describe("Görevler arası veri yalıtımı", () => {
  it("iki görev arasında hiçbir alt kayıt sızmaz", () => {
    const { ctx, close } = createTestContext();
    try {
      const first = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const second = seedIsolationCounterpart(ctx, DEFAULT_ACTOR);

      const reposA = repositoriesFor(ctx, first.taskId);
      const reposB = repositoriesFor(ctx, second.taskId);

      const collect = (repos: ReturnType<typeof repositoriesFor>) => ({
        materials: repos.materials.listAll().map((item) => item.materialId),
        audios: repos.audios.listAll().map((item) => item.audioId),
        questions: repos.questions.listAll().map((item) => item.questionId),
        answers: repos.answers.listAll().map((item) => item.answerId),
        evidence: repos.evidence.listAll().map((item) => item.evidenceId),
        findings: repos.findings.listAll().map((item) => item.findingId),
        segments: repos.transcripts
          .listVersions()
          .flatMap((version) => repos.transcripts.listSegmentsForVersion(version.versionId))
          .map((item) => item.segmentId),
      });

      const a = collect(reposA);
      const b = collect(reposB);

      for (const key of Object.keys(a) as (keyof typeof a)[]) {
        const overlap = a[key].filter((id) => b[key].includes(id));
        expect(overlap, `${key} alanında sızıntı: ${overlap.join(", ")}`).toHaveLength(0);
        expect(a[key].length).toBeGreaterThan(0);
      }
    } finally {
      close();
    }
  });

  it("görev B kapsamıyla görev A kaydına yazma reddedilir", () => {
    const { ctx, close } = createTestContext();
    try {
      const first = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const reposA = repositoriesFor(ctx, first.taskId);
      const materialA = reposA.materials.listAll()[0];
      expect(materialA).toBeDefined();

      // Görev B kapsamıyla, görev A materyalini yazmaya çalışmak reddedilmelidir.
      const reposB = repositoriesFor(ctx, "gorev-baska");
      expect(() => reposB.materials.insert(materialA!)).toThrow(TaskIsolationError);
    } finally {
      close();
    }
  });

  it("kapsamsız görev kimliği reddedilir", () => {
    expect(() => TaskScope.of("")).toThrow();
    expect(() => TaskScope.of(undefined as unknown as string)).toThrow();
  });

  it("görev B sorgusu görev A kaydını bulamaz", () => {
    const { ctx, close } = createTestContext();
    try {
      const first = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const reposA = repositoriesFor(ctx, first.taskId);
      const materialId = reposA.materials.listAll()[0]?.materialId as string;

      const reposB = repositoriesFor(ctx, "gorev-baska");
      expect(reposB.materials.findById(materialId)).toBeNull();
      expect(reposB.audios.findById(first.audioIds["kayit-a"] as string)).toBeNull();
      expect(reposB.questions.findById(first.questionIds[0] as string)).toBeNull();
      expect(reposB.evidence.findById(first.evidenceIds[0] as string)).toBeNull();
      expect(reposB.findings.findById(first.findingIds[0] as string)).toBeNull();
    } finally {
      close();
    }
  });

  it("her görevin veri paketi yalnızca kendi kayıtlarını içerir", () => {
    const { ctx, close } = createTestContext();
    try {
      const first = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const second = seedIsolationCounterpart(ctx, DEFAULT_ACTOR);

      const bundleA = loadTaskBundle(ctx, repositoriesFor(ctx, first.taskId), first.taskId);
      const bundleB = loadTaskBundle(ctx, repositoriesFor(ctx, second.taskId), second.taskId);

      expect(bundleA.audios).toHaveLength(2);
      expect(bundleB.audios).toHaveLength(1);
      expect(bundleA.questions).toHaveLength(3);
      expect(bundleB.questions).toHaveLength(1);

      const audioIdsA = bundleA.audios.map((item) => item.audioId);
      const audioIdsB = bundleB.audios.map((item) => item.audioId);
      expect(audioIdsA.some((id) => audioIdsB.includes(id))).toBe(false);

      // Rapor görünümü de yalnızca kendi kayıtlarını gösterir.
      const reportA = previewReport(ctx, repositoriesFor(ctx, first.taskId), first.taskId);
      const reportB = previewReport(ctx, repositoriesFor(ctx, second.taskId), second.taskId);
      expect(reportA.viewModel.header.caseNumber).not.toBe(reportB.viewModel.header.caseNumber);
      expect(reportA.viewModel.header.caseNumber).toBe("2026/9999 S. (SENTETİK)");
      expect(reportB.viewModel.header.caseNumber).toBe("2026/0001 S. (SENTETİK-YALITIM)");
    } finally {
      close();
    }
  });

  it("değişmez kayıtlar veri tabanı düzeyinde korunur", () => {
    const { ctx, close } = createTestContext();
    try {
      const first = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, first.taskId);
      const rawVersion = repos.transcripts
        .listVersions()
        .find((version) => version.kind === "ham-asr");
      expect(rawVersion).toBeDefined();

      // Ham ASR sürümü güncellenemez ve silinemez (bkz. MIH-REQ-TRN-003).
      expect(() =>
        ctx.db
          .prepare("UPDATE transcript_version SET note = ? WHERE version_id = ?")
          .run("değiştirilmeye çalışıldı", rawVersion!.versionId),
      ).toThrow();

      expect(() =>
        ctx.db.prepare("DELETE FROM transcript_version WHERE version_id = ?").run(rawVersion!.versionId),
      ).toThrow();

      // Rapor revizyonu güncellenemez (bkz. MIH-REQ-RPT-008).
      const revision = repos.reports.listRevisions(first.reportId)[0];
      expect(revision).toBeDefined();
      expect(() =>
        ctx.db
          .prepare("UPDATE report_revision SET reason = ? WHERE revision_id = ?")
          .run("değiştirilmeye çalışıldı", revision!.revisionId),
      ).toThrow();

      // Denetim olayı güncellenemez.
      const auditEvent = repos.audit.listByTask(first.taskId)[0];
      expect(auditEvent).toBeDefined();
      expect(() =>
        ctx.db.prepare("UPDATE audit_event SET action = ? WHERE event_id = ?").run("x", auditEvent!.eventId),
      ).toThrow();
    } finally {
      close();
    }
  });
});
