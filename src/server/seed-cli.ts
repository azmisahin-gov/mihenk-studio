/**
 * Komut satırından altın senaryoyu tohumlar ve DOCX raporu üretir.
 *
 * Kullanım:
 *   npx tsx src/server/seed-cli.ts [cikti-dizini]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { bootstrap } from "../infrastructure/bootstrap.ts";
import { DEFAULT_ACTOR, repositoriesFor } from "../application/context.ts";
import { seedGoldenScenario } from "../infrastructure/seed/seedGoldenScenario.ts";
import { exportReportDocx } from "../application/usecases/exportReport.ts";

const outDir = resolve(process.argv[2] ?? "evidence");
mkdirSync(outDir, { recursive: true });

const storageRoot = join(outDir, ".seed-files");
const { ctx, db } = bootstrap({ databasePath: ":memory:", storageRoot });

const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
const repos = repositoriesFor(ctx, seeded.taskId);
const result = await exportReportDocx(ctx, repos, DEFAULT_ACTOR, seeded.taskId);

const target = resolve(outDir, "altin-senaryo-rapor.docx");
writeFileSync(target, result.bytes);

console.log(`Görev kimliği: ${seeded.taskId}`);
console.log(`Ses kaydı sayısı: ${Object.keys(seeded.audioIds).length}`);
console.log(`Soru sayısı: ${seeded.questionIds.length}`);
console.log(`Dayanak sayısı: ${seeded.evidenceIds.length}`);
console.log(`Bulgu sayısı: ${seeded.findingIds.length}`);
console.log(`Rapor kimliği: ${seeded.reportId}`);
console.log(`Revizyon kimliği: ${seeded.revisionId}`);
console.log(`DOCX dosyası: ${target} (${result.bytes.byteLength} bayt)`);
console.log(`Sentetik uyarı: ${result.notice}`);

db.close();
