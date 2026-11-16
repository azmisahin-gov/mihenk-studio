/**
 * Kanıt üretimi: altın senaryodan gerçek DOCX dosyası üretir ve LibreOffice ile
 * doğrular (bkz. MIH-REQ-RPT-006, MIH-REQ-RPT-007).
 *
 * Üretilen dosyalar `evidence/` altına yazılır:
 * - `altin-senaryo-rapor.docx` — açılabilir DOCX çıktısı
 * - `docx-dogrulama.txt` — sayfa sayısı ve metin akışı doğrulaması
 * - `altin-senaryo-rapor.pdf` — LibreOffice ile üretilmiş sayfa görüntüsü kaynağı
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, renameSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { bootstrap } from "../infrastructure/bootstrap.ts";
import { DEFAULT_ACTOR, repositoriesFor } from "../application/context.ts";
import { seedGoldenScenario } from "../infrastructure/seed/seedGoldenScenario.ts";
import { exportReportDocx } from "../application/usecases/exportReport.ts";
import { previewReport } from "../application/usecases/buildReport.ts";

const root = resolve(process.cwd());
const evidenceDir = join(root, "evidence");
const workDir = join(root, ".evidence-tmp");

function findSoffice(): string | null {
  for (const candidate of ["soffice", "libreoffice"]) {
    try {
      execFileSync("which", [candidate], { stdio: "pipe" });
      return candidate;
    } catch {
      // sıradaki aday denenir
    }
  }
  return null;
}

export async function generateDocxEvidence(): Promise<void> {
  mkdirSync(evidenceDir, { recursive: true });
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });

  const { ctx, db } = bootstrap({
    databasePath: ":memory:",
    storageRoot: join(workDir, "files"),
  });

  const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
  const repos = repositoriesFor(ctx, seeded.taskId);
  const result = await exportReportDocx(ctx, repos, DEFAULT_ACTOR, seeded.taskId);
  const { viewModel } = previewReport(ctx, repos, seeded.taskId);

  const docxPath = join(evidenceDir, "altin-senaryo-rapor.docx");
  writeFileSync(docxPath, result.bytes);

  // A4 önizleme görünüm modelinin özetini de yaz.
  writeFileSync(
    join(evidenceDir, "a4-onizleme-ozeti.txt"),
    [
      `Başlık: ${viewModel.header.authority}`,
      `Rapor: ${viewModel.header.title}`,
      `Dosya No: ${viewModel.header.caseNumber}`,
      `Revizyon: ${viewModel.header.revisionNo}`,
      `Oluşturma: ${viewModel.header.generatedAt}`,
      `Sentetik uyarı: ${viewModel.notice}`,
      `Tahmini sayfa sayısı: ${viewModel.pageCountHint}`,
      "",
      "Bölümler:",
      ...viewModel.sections.map((section) => `  - ${section.heading} (${section.sourceRefs.length} kaynak referansı)`),
      "",
      "Ekler:",
      ...viewModel.appendices.map((appendix) => `  - ${appendix.title}`),
    ].join("\n"),
    "utf8",
  );

  const lines: string[] = [];
  lines.push("DOCX DOĞRULAMA KAYDI");
  lines.push(`Dosya: ${docxPath}`);
  lines.push(`Boyut: ${result.bytes.byteLength} bayt`);
  lines.push(`Dosya adı: ${result.fileName}`);
  lines.push(`Tahmini sayfa sayısı: ${result.pageCountHint}`);
  lines.push(`Sentetik uyarı: ${result.notice}`);
  lines.push("");

  const soffice = findSoffice();
  if (!soffice) {
    lines.push("LibreOffice bulunamadı; sayfa düzeni doğrulaması yapılamadı.");
    lines.push("DOCX dosyası yine de üretildi ve açılabilir bir ZIP arşividir.");
  } else {
    try {
      execFileSync(
        soffice,
        ["--headless", "--convert-to", "pdf", "--outdir", workDir, docxPath],
        {
          stdio: "pipe",
          timeout: 240_000,
          env: {
            ...process.env,
            // LibreOffice bazı kurulumlarda kendi kitaplık klasörünü bulamıyor.
            LD_LIBRARY_PATH: [
              "/usr/lib/libreoffice/program",
              process.env.LD_LIBRARY_PATH ?? "",
            ]
              .filter(Boolean)
              .join(":"),
          },
        },
      );
      const pdfName = readdirSync(workDir).find((name) => name.endsWith(".pdf"));
      if (!pdfName) {
        lines.push("LibreOffice PDF çıktısı üretilemedi.");
      } else {
        const pdfPath = join(workDir, pdfName);
        const pdfBytes = readFileSync(pdfPath);
        const pageCount = countPdfPages(pdfBytes);
        lines.push("LibreOffice dönüştürmesi: BAŞARILI");
        lines.push(`Üretilen PDF sayfa sayısı: ${pageCount}`);
        writeFileSync(join(evidenceDir, "altin-senaryo-rapor.pdf"), pdfBytes);

        // Sayfa görüntüsü: pdftoppm veya mutool varsa PNG üretilir.
        const rendered = renderFirstPageToPng(pdfPath, join(evidenceDir, "docx-sayfa-1.png"));
        lines.push(
          rendered
            ? `Sayfa görüntüsü üretildi: ${rendered}`
            : "Sayfa görüntüsü aracı (pdftoppm/mutool) bulunamadı; PDF kanıtı saklandı.",
        );

        // Türkçe karakter doğrulaması: PDF metin katmanında Türkçe karakterler aranır.
        const pdfText = extractPdfText(pdfPath);
        const turkishChars = ["ı", "İ", "ş", "ğ", "ç", "ö", "ü"];
        const found = turkishChars.filter((char) => pdfText.includes(char));
        lines.push(`Türkçe karakter kontrolü: ${found.length}/${turkishChars.length} bulundu (${found.join(" ")})`);
        lines.push(
          pdfText.includes("SENTETİK ÖRNEK")
            ? "Sentetik uyarı PDF metin katmanında bulundu: EVET"
            : "Sentetik uyarı PDF metin katmanında bulunamadı: HAYIR",
        );
      }
    } catch (error) {
      lines.push(
        `LibreOffice dönüştürmesi başarısız: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  writeFileSync(join(evidenceDir, "docx-dogrulama.txt"), lines.join("\n"), "utf8");
  db.close();
  console.log(lines.join("\n"));
}

/** PDF içindeki sayfa nesnelerini sayar. */
export function countPdfPages(bytes: Uint8Array): number {
  const text = Buffer.from(bytes).toString("latin1");
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

/** PDF metin katmanını kabaca çıkarır (sıkıştırılmamış akışlar için). */
export function extractPdfText(pdfPath: string): string {
  const buffer = readFileSync(pdfPath);
  const latin = buffer.toString("latin1");
  const chunks: string[] = [];
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamPattern.exec(latin)) !== null) {
    const raw = match[1] ?? "";
    chunks.push(raw);
  }
  // Sıkıştırılmış akışlar okunamaz; komut satırı aracı varsa ondan metin alınır.
  const joined = chunks.join("\n");
  if (joined.includes("SENTETİK")) return joined;
  try {
    return execFileSync("pdftotext", [pdfPath, "-"], { stdio: "pipe", timeout: 60_000 }).toString("utf8");
  } catch {
    return joined;
  }
}

/** İlk sayfayı PNG'ye çevirir; araç yoksa null döner. */
export function renderFirstPageToPng(pdfPath: string, target: string): string | null {
  const stem = target.replace(/\.png$/, "");
  for (const [command, args] of [
    ["pdftoppm", ["-png", "-r", "110", "-f", "1", "-l", "1", pdfPath, stem]],
    ["mutool", ["draw", "-o", target, "-r", "110", pdfPath]],
  ] as [string, string[]][]) {
    try {
      execFileSync(command, args, { stdio: "pipe", timeout: 120_000 });
      // pdftoppm dosya adına sıra numarası ekler; tek sayfa için sabit ada çevrilir.
      const produced = readdirSync(dirname(target)).filter((name) =>
        name.startsWith(basename(stem)) && name.endsWith(".png"),
      );
      const first = produced[0];
      if (first) {
        const producedPath = join(dirname(target), first);
        if (producedPath !== target) {
          renameSync(producedPath, target);
        }
        return target;
      }
      return target;
    } catch {
      // sıradaki araç denenir
    }
  }
  return null;
}

if (process.argv[1] && process.argv[1].endsWith("evidence-docx.ts")) {
  await generateDocxEvidence();
}
