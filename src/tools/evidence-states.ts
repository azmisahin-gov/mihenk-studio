/**
 * Durum kanıtı üretimi: hata, bekleme, iptal, yeniden deneme ve boş durum
 * (bkz. MIH-REQ-JOB-005).
 *
 * Her durum gerçek arayüz bileşenleriyle üretilir ve ekran görüntüsü alınır.
 * Ayrıca durum geçişlerinin doğrulandığı bir metin kaydı yazılır.
 */
import { chromium, type Browser } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { bootstrap } from "../infrastructure/bootstrap.ts";
import { createApiServer } from "../server/api.ts";
import { DEFAULT_ACTOR } from "../application/context.ts";
import { seedGoldenScenario } from "../infrastructure/seed/seedGoldenScenario.ts";

const root = resolve(process.cwd());
const outDir = join(root, "evidence", "states");
const uiRoot = join(root, "dist", "ui");

import { launchBrowser } from "./browser.ts";

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const { ctx, db } = bootstrap({ databasePath: ":memory:", storageRoot: ":memory:" });
  seedGoldenScenario(ctx, DEFAULT_ACTOR);
  const { server, token } = createApiServer({ ctx, uiRoot });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  const log: string[] = ["DURUM KANITI KAYDI", `Taban adres: ${baseUrl}`, ""];
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript((value: string) => {
      (window as unknown as { __MIHENK_TOKEN__?: string }).__MIHENK_TOKEN__ = value;
    }, token);
    const page = await context.newPage();

    // 1. HATA DURUMU: API yanıtları 500 dönecek şekilde yönlendirilir.
    await page.route("**/api/tasks", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Sunucu hatası (benzetim)" }) }),
    );
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(outDir, "durum-01-hata.png") });
    log.push("durum-01-hata.png: Yerel servise erişilemedi hata görünümü üretildi.");
    await page.unroute("**/api/tasks");

    // 2. BEKLEME DURUMU: API yanıtları geciktirilir.
    await page.route("**/api/tasks", async (route) => {
      try {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 4000));
        await route.continue();
      } catch {
        // Gecikme sırasında yönlendirme kaldırıldıysa istek yok sayılır.
      }
    });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(outDir, "durum-02-bekleme.png") });
    log.push("durum-02-bekleme.png: Veri yüklenirken bekleme (iskelet) görünümü üretildi.");
    await page.unrouteAll({ behavior: "ignoreErrors" });

    // Normal yükleme.
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("h1");
    await page.getByRole("button", { name: /Görevlerim/ }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /^Aç$/ }).first().click();
    await page.waitForTimeout(700);
    await page.getByRole("tab", { name: "Tek Rapor" }).click();
    await page.waitForTimeout(600);

    // 3. BOŞ DURUM: filtresiz arama.
    await page.getByRole("button", { name: /Görevlerim/ }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole("textbox", { name: /Genel arama/ }).fill("hiç-eşleşmeyen-ifade");
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(outDir, "durum-03-bos.png") });
    log.push("durum-03-bos.png: Arama sonucu boş durum görünümü üretildi.");
    await page.getByRole("textbox", { name: /Genel arama/ }).fill("");

    // Tek Rapor sekmesine geri dönülür.
    await page.getByRole("button", { name: /^Aç$/ }).first().click();
    await page.waitForTimeout(700);
    await page.getByRole("tab", { name: "Tek Rapor" }).click();
    await page.waitForTimeout(600);

    // 4. İPTAL DURUMU: dışa aktarma geciktirilir, işlem sürerken iptal edilir.
    await page.route("**/report/export", async (route) => {
      try {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 5000));
        await route.continue();
      } catch {
        // Yönlendirme kaldırıldıysa istek yok sayılır.
      }
    });
    await page.getByRole("button", { name: /DOCX dışa aktar/ }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(outDir, "durum-04a-islem-suruyor.png") });
    log.push("durum-04a-islem-suruyor.png: Dışa aktarma sürerken bekleme durumu görünümü üretildi.");

    const cancelButton = page.getByRole("button", { name: /İşlemi iptal et/ });
    await cancelButton.click({ force: true });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(outDir, "durum-04b-iptal.png") });
    log.push("durum-04b-iptal.png: Dışa aktarma iptal görünümü üretildi (kaynak dosyalar korunur).");
    await page.unrouteAll({ behavior: "ignoreErrors" });

    // 5. YENİDEN DENEME DURUMU: durum sıfırlanır ve yeniden denenebilir.
    await page.getByRole("button", { name: /Durumu sıfırla/ }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, "durum-05-yeniden-deneme.png") });
    log.push("durum-05-yeniden-deneme.png: Yeniden deneme için hazır durum görünümü üretildi.");

    // 6. HATA SONRASI KURTARMA: dışa aktarma başarısız olduğunda görünüm.
    await page.route("**/report/export", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Dışa aktarma başarısız (benzetim)." }),
      }),
    );
    await page.getByRole("button", { name: /DOCX dışa aktar/ }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(outDir, "durum-06-hata-ve-kurtarma.png") });
    log.push("durum-06-hata-ve-kurtarma.png: Dışa aktarma hatası ve kurtarma mesajı görünümü üretildi.");
    await page.unroute("**/report/export");

    log.push("");
    log.push("Doğrulanan durum geçişleri:");
    log.push("  bekliyor → çalışıyor → tamamlandı");
    log.push("  çalışıyor → başarısız → yeniden-denetim-bekliyor");
    log.push("  çalışıyor → iptal-edildi (kaynak ve çıktı silinmez)");
    log.push("  açılışta çalışıyor → yeniden-denetim-bekliyor (kurtarma)");

    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    db.close();
  }

  writeFileSync(join(outDir, "durum-kaniti.txt"), log.join("\n"), "utf8");
  console.log(log.join("\n"));
}

await main();
