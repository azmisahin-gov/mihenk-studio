/**
 * Arka plan işleri, kurtarma, idempotency ve hata durumu testleri
 * (bkz. MIH-REQ-JOB-001 … 005, MIH-REQ-PLT-004).
 */
import { describe, expect, it } from "vitest";
import { createTestContext } from "../helpers/testContext.ts";
import { DEFAULT_ACTOR, repositoriesFor } from "../../src/application/context.ts";
import { seedGoldenScenario } from "../../src/infrastructure/seed/seedGoldenScenario.ts";
import { cancelExportJob, exportReportDocx } from "../../src/application/usecases/exportReport.ts";
import { openDatabase } from "../../src/infrastructure/db/database.ts";

describe("İş kuyruğu ve durum yönetimi", () => {
  it("dışa aktarma işi kalıcı kayıt üretir ve tamamlandı durumuna geçer", async () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const result = await exportReportDocx(ctx, repos, DEFAULT_ACTOR, seeded.taskId);

      const job = repos.jobs.findById(result.jobId);
      expect(job?.status).toBe("tamamlandı");
      expect(job?.progress).toBe(100);
      expect(job?.attempt).toBe(1);
      expect(job?.finishedAt).toBeDefined();
    } finally {
      close();
    }
  });

  it("aynı idempotency anahtarıyla ikinci tetikleme yeni iş açmaz", async () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const first = await exportReportDocx(ctx, repos, DEFAULT_ACTOR, seeded.taskId, {
        idempotencyKey: "sabit-anahtar",
      });
      const second = await exportReportDocx(ctx, repos, DEFAULT_ACTOR, seeded.taskId, {
        idempotencyKey: "sabit-anahtar",
      });

      expect(second.jobId).toBe(first.jobId);
      expect(second.idempotentReplay).toBe(true);
      const jobs = repos.jobs.listByTask(seeded.taskId).filter((job) => job.idempotencyKey === "sabit-anahtar");
      expect(jobs).toHaveLength(1);
    } finally {
      close();
    }
  });

  it("dışa aktarma hatasında iş başarısız olur ve kaynak dosya silinmez", async () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const materialsBefore = repos.materials.listAll().length;

      await expect(
        exportReportDocx(ctx, repos, DEFAULT_ACTOR, seeded.taskId, {
          idempotencyKey: "hata-anahtari",
          simulateFailure: true,
        }),
      ).rejects.toThrow();

      const job = repos.jobs.listByTask(seeded.taskId).find((item) => item.idempotencyKey === "hata-anahtari");
      expect(job?.status).toBe("başarısız");
      expect(job?.errorCode).toBe("DISAAKTARMA-HATA");
      expect(job?.errorMessage).toBeTruthy();

      // Kaynak materyaller ve önceki çıktılar korunur.
      expect(repos.materials.listAll().length).toBe(materialsBefore);
      expect(repos.reports.findByTask()).not.toBeNull();
    } finally {
      close();
    }
  });

  it("iptal edilen iş kaydı ve kaynakları silmez", async () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const result = await exportReportDocx(ctx, repos, DEFAULT_ACTOR, seeded.taskId, {
        idempotencyKey: "iptal-anahtari",
      });
      cancelExportJob(ctx, repos, DEFAULT_ACTOR, seeded.taskId, result.jobId);

      const job = repos.jobs.findById(result.jobId);
      // Tamamlanmış iş iptal ile geri alınmaz; yalnızca iptal isteği işaretlenir.
      expect(job?.status).toBe("tamamlandı");
      expect(repos.materials.listAll().length).toBeGreaterThan(0);
      expect(repos.reports.findByTask()).not.toBeNull();
    } finally {
      close();
    }
  });

  it("uygulama yeniden açıldığında yarıda kalan iş kurtarılır", () => {
    const db = openDatabase({ path: ":memory:" });
    try {
      const { ctx, close } = createTestContext();
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      // Yarıda kalmış bir iş benzetimi.
      const job = repos.jobs.enqueue({
        jobId: "is-yarim",
        taskId: seeded.taskId,
        kind: "ocr",
        status: "çalışıyor",
        idempotencyKey: "yarim-is",
        attempt: 1,
        maxAttempts: 3,
        progress: 40,
        createdAt: "2026-11-15T09:00:00.000Z",
        cancelRequested: false,
      });
      expect(job.job.status).toBe("çalışıyor");

      const recovered = repos.jobs.recoverStalledJobs();
      expect(recovered).toBe(1);
      expect(repos.jobs.findById("is-yarim")?.status).toBe("yeniden-denetim-bekliyor");
      close();
    } finally {
      db.close();
    }
  });

  it("iş durumları sözleşmede tanımlı kümede kalır", async () => {
    const { ctx, close } = createTestContext();
    try {
      const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
      const repos = repositoriesFor(ctx, seeded.taskId);
      const result = await exportReportDocx(ctx, repos, DEFAULT_ACTOR, seeded.taskId);
      const allowed = [
        "bekliyor",
        "çalışıyor",
        "tamamlandı",
        "uyarı",
        "başarısız",
        "iptal-edildi",
        "yeniden-denetim-bekliyor",
      ];
      for (const job of repos.jobs.listAll()) {
        expect(allowed).toContain(job.status);
      }
      expect(repos.jobs.findById(result.jobId)).not.toBeNull();
    } finally {
      close();
    }
  });
});
