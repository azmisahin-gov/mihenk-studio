/**
 * Yerel servis girişi.
 *
 * Varsayılan olarak altın sentetik senaryo tohumlanır ve arayüz servis edilir.
 * Servis yalnızca `127.0.0.1` üzerinde dinler (bkz. ADR-001).
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { bootstrap } from "../infrastructure/bootstrap.ts";
import { createApiServer } from "./api.ts";
import { DEFAULT_ACTOR, repositoriesFor } from "../application/context.ts";
import { seedGoldenScenario } from "../infrastructure/seed/seedGoldenScenario.ts";

const PORT = Number(process.env.MIHENK_PORT ?? 12000);
/**
 * Varsayılan olarak yalnızca yerel arayüz dinlenir (bkz. ADR-001).
 * Barındırılan/uzak ortamda erişim için MIHENK_HOST=0.0.0.0 verilebilir;
 * bu durumda servis yine belirteçle korunur ve kullanıcı bunu açıkça seçer.
 */
const HOST = process.env.MIHENK_HOST ?? "127.0.0.1";
const storageRoot = process.env.MIHENK_STORAGE ?? resolve(process.cwd(), ".mihenk-veri");
const databasePath = process.env.MIHENK_DB ?? resolve(storageRoot, "mihenk-studio.sqlite");
const uiRoot = resolve(process.cwd(), "dist/ui");

const { ctx, db } = bootstrap({ databasePath, storageRoot });

// Açılışta yarıda kalmış işleri kurtar (bkz. MIH-REQ-PLT-004).
const recovered = repositoriesFor(ctx, "kapsam-dışı").jobs.recoverStalledJobs();

const existing = repositoriesFor(ctx, "kapsam-dışı").tasks.listAll();
if (existing.length === 0) {
  const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
  console.log(`Altın sentetik senaryo tohumlandı: ${seeded.taskId}`);
}

const { server, token } = createApiServer({
  ctx,
  uiRoot: existsSync(uiRoot) ? uiRoot : undefined,
});

server.listen(PORT, HOST, () => {
  console.log(`MİHENK Studio yerel servisi: http://${HOST}:${PORT}`);
  console.log(`Yerel belirteç: ${token}`);
  console.log(`Kurtarılan iş sayısı: ${recovered}`);
  console.log(`Veri tabanı: ${databasePath}`);
  console.log("Sentetik örnek ortam — resmî belge üretmez.");
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close();
    db.close();
    process.exit(0);
  });
}
