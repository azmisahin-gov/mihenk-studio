/**
 * DOCX dışa aktarma kullanım senaryosu (bkz. MIH-REQ-RPT-006, 007, 009).
 *
 * Aynı `ReportViewModel`'den üretilir; önizleme ile tutarlıdır. Dışa aktarma
 * kalıcı iş olarak kaydedilir ve iptal/yeniden deneme durumlarını taşır
 * (bkz. MIH-REQ-JOB-001 … 005).
 */
import { renderDocxBytes } from "../../infrastructure/docx/docxExporter.ts";
import { SYNTHETIC_NOTICE } from "../../domain/types.ts";
import { audit, type Actor, type AppContext, type TaskRepositories } from "../context.ts";
import { previewReport } from "./buildReport.ts";

export interface ExportReportResult {
  jobId: string;
  bytes: Uint8Array;
  fileName: string;
  pageCountHint: number;
  notice: string;
  idempotentReplay: boolean;
}

export interface ExportReportOptions {
  /** Aynı isteğin tekrarını engelleyen anahtar. */
  idempotencyKey?: string;
  /** Test için: iş başarısız senaryosunu tetikler. */
  simulateFailure?: boolean;
}

export async function exportReportDocx(
  ctx: AppContext,
  repos: TaskRepositories,
  actor: Actor,
  taskId: string,
  options: ExportReportOptions = {},
): Promise<ExportReportResult> {
  const report = repos.reports.findByTask();
  if (!report || !report.currentRevisionId) {
    throw new Error("Dışa aktarılacak rapor yok; önce rapor derlenmelidir.");
  }
  const { viewModel } = previewReport(ctx, repos, taskId);
  const idempotencyKey = options.idempotencyKey ?? `${report.reportId}:${report.currentRevisionId}:docx`;

  const { job, created } = repos.jobs.enqueue({
    jobId: ctx.ids.next("is"),
    taskId,
    kind: "rapor-dışa-aktarma",
    status: "bekliyor",
    idempotencyKey,
    attempt: 0,
    maxAttempts: 3,
    progress: 0,
    createdAt: ctx.clock.now(),
    cancelRequested: false,
  });

  if (!created && job.status === "tamamlandı") {
    // Aynı istek daha önce başarıyla tamamlandı; yeniden üretilir ama yeni iş açılmaz.
    const bytes = await renderDocxBytes(viewModel);
    return {
      jobId: job.jobId,
      bytes,
      fileName: fileNameFor(viewModel.header.caseNumber, viewModel.header.revisionNo),
      pageCountHint: viewModel.pageCountHint,
      notice: SYNTHETIC_NOTICE,
      idempotentReplay: true,
    };
  }

  repos.jobs.updateStatus(job.jobId, "çalışıyor", { startedAt: ctx.clock.now(), progress: 10 });
  repos.jobs.incrementAttempt(job.jobId);

  try {
    if (options.simulateFailure) {
      throw new Error("Dışa aktarma işlemi kullanıcı tarafından durduruldu (benzetim).");
    }
    const bytes = await renderDocxBytes(viewModel);
    repos.jobs.updateStatus(job.jobId, "tamamlandı", {
      progress: 100,
      finishedAt: ctx.clock.now(),
    });
    audit(repos, ctx, taskId, actor, "docx-disa-aktarildi", "ReportDocument", report.reportId, {
      jobId: job.jobId,
      byteLength: bytes.byteLength,
      pageCountHint: viewModel.pageCountHint,
    });
    return {
      jobId: job.jobId,
      bytes,
      fileName: fileNameFor(viewModel.header.caseNumber, viewModel.header.revisionNo),
      pageCountHint: viewModel.pageCountHint,
      notice: SYNTHETIC_NOTICE,
      idempotentReplay: !created,
    };
  } catch (error) {
    repos.jobs.updateStatus(job.jobId, "başarısız", {
      errorCode: "DISAAKTARMA-HATA",
      errorMessage: error instanceof Error ? error.message : String(error),
      finishedAt: ctx.clock.now(),
    });
    throw error;
  }
}

/** İptal: özgün dosya veya önceki çıktı silinmez (bkz. MIH-REQ-JOB-004). */
export function cancelExportJob(
  ctx: AppContext,
  repos: TaskRepositories,
  actor: Actor,
  taskId: string,
  jobId: string,
): void {
  const job = repos.jobs.findById(jobId);
  if (!job || job.taskId !== taskId) {
    throw new Error(`İş bulunamadı veya bu göreve ait değil: ${jobId}`);
  }
  repos.jobs.requestCancel(jobId);
  if (job.status === "bekliyor" || job.status === "çalışıyor") {
    repos.jobs.updateStatus(jobId, "iptal-edildi", { finishedAt: ctx.clock.now() });
  }
  audit(repos, ctx, taskId, actor, "is-iptal-edildi", "ProcessingJob", jobId);
}

export function fileNameFor(caseNumber: string, revisionNo: number): string {
  const safe = caseNumber.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return `Mihenk-Rapor-${safe}-rev${revisionNo}-SENTETIK.docx`;
}
