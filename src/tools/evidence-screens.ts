/**
 * Ekran görüntüsü ve durum kanıtı üretimi.
 *
 * Gerçek yerel servisi başlatır, altın senaryoyu tohumlar ve kritik ekranların
 * görüntülerini alır (bkz. talimat bölüm 7 kanıt listesi). Ayrıca hata, bekleme,
 * iptal, yeniden deneme ve boş durum görünümlerini üretir.
 *
 * Chromium yolu CHROMIUM_PATH ortam değişkeniyle verilebilir; yoksa sistem tarayıcısı kullanılır.
 */
import type { Browser } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { bootstrap } from "../infrastructure/bootstrap.ts";
import { createApiServer } from "../server/api.ts";
import { DEFAULT_ACTOR } from "../application/context.ts";
import { seedGoldenScenario, seedIsolationCounterpart } from "../infrastructure/seed/seedGoldenScenario.ts";

const root = resolve(process.cwd());
const outDir = join(root, "evidence", "screenshots");
const stateDir = join(root, "evidence", "states");
const uiRoot = join(root, "dist", "ui");
const workDir = join(root, ".evidence-tmp", "screens");

import { launchBrowser } from "./browser.ts";

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(stateDir, { recursive: true });
  mkdirSync(workDir, { recursive: true });

  const { ctx, db } = bootstrap({ databasePath: ":memory:", storageRoot: join(workDir, "files") });
  const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
  seedIsolationCounterpart(ctx, DEFAULT_ACTOR);

  const { server, token } = createApiServer({ ctx, uiRoot, disableAuth: false });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  let browser: Browser | null = null;
  const log: string[] = [];
  try {
    browser = await launchBrowser();

    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    // Yerel servis belirteci arayüze enjekte edilir (test amaçlı).
    await context.addInitScript((value: string) => {
      (window as unknown as { __MIHENK_TOKEN__?: string }).__MIHENK_TOKEN__ = value;
    }, token);
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") log.push(`KONSOL HATASI: ${message.text()}`);
    });
    page.on("pageerror", (error) => log.push(`SAYFA HATASI: ${error.message}`));

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("h1", { timeout: 15_000 });
    await screenshot(page, outDir, "01-genel-bakis");

    await page.getByRole("button", { name: "Görevlerim", exact: false }).first().click();
    await page.waitForTimeout(400);
    await screenshot(page, outDir, "02-gorevlerim");

    await page.getByRole("button", { name: /Aç/ }).first().click();
    await page.waitForTimeout(700);
    await screenshot(page, outDir, "03-gorev-ozeti");

    const tabSequence: [string, string][] = [
      ["Görevlendirme", "04-gorevlendirme"],
      ["Materyaller", "05-materyaller"],
      ["Ses ve Transkript", "06-ses-transkript"],
      ["Sorular ve Bulgular", "07-sorular-bulgular"],
      ["Tek Rapor", "08-tek-rapor"],
    ];
    for (const [label, name] of tabSequence) {
      await page.getByRole("tab", { name: label }).click();
      await page.waitForTimeout(500);
      await screenshot(page, outDir, name);
    }

    // A4 önizleme tam sayfa görüntüsü.
    await page.getByRole("tab", { name: "Tek Rapor" }).click();
    await page.waitForTimeout(400);
    const paper = page.locator(".st-paper").first();
    await paper.screenshot({ path: join(outDir, "09-a4-onizleme-sayfa-1.png") });

    // Dar ekran görüntüsü.
    await page.setViewportSize({ width: 900, height: 1000 });
    await page.waitForTimeout(500);
    await screenshot(page, outDir, "10-dar-ekran-tek-rapor");

    // Yüzde 200 yakınlaştırma (okunabilirlik kanıtı).
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    await page.waitForTimeout(500);
    await screenshot(page, outDir, "11-yuzde-200-yakinlastirma");
    await page.evaluate(() => {
      document.documentElement.style.zoom = "1";
    });

    // Klavye erişilebilirliği: ⌘K/Ctrl+K aramaya odaklanmalı.
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(250);
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
    log.push(`⌘K/Ctrl+K odak testi: ${focused}`);
    await screenshot(page, outDir, "12-klavye-arama-odagi");

    // Boş durum: filtre ile eşleşmeyen arama.
    await page.getByRole("button", { name: "Görevlerim", exact: false }).first().click();
    await page.waitForTimeout(300);
    const search = page.getByRole("textbox", { name: /Genel arama/ });
    await search.fill("eşleşmeyen-arama-ifadesi");
    await page.waitForTimeout(400);
    await screenshot(page, outDir, "13-bos-durum-arama");

    // Yeni görevlendirme ekranı.
    await search.fill("");
    await page.getByRole("button", { name: /Yeni görevlendirme/ }).first().click();
    await page.waitForTimeout(500);
    await screenshot(page, outDir, "14-yeni-gorevlendirme");

    // Kısmi/sonraki aşama ekranı (dürüst gösterim).
    await page.getByRole("button", { name: "Ses Araçları" }).click();
    await page.waitForTimeout(400);
    await screenshot(page, outDir, "15-ses-araclari-sonraki-asama");

    await page.getByRole("button", { name: "Test Geçmişi" }).click();
    await page.waitForTimeout(400);
    await screenshot(page, outDir, "16-test-gecmisi");

    // Görev yalıtımı: görev değiştirildiğinde veri değişmeli.
    await page.getByRole("button", { name: "Görevlerim", exact: false }).first().click();
    await page.waitForTimeout(300);
    const rowCount = await page.locator("table.st-table tbody tr").count();
    log.push(`Görev listesi satır sayısı: ${rowCount}`);
    const secondOpen = page.getByRole("button", { name: /Aç/ }).nth(1);
    if (await secondOpen.count()) {
      await secondOpen.click();
      await page.waitForTimeout(700);
      await screenshot(page, outDir, "17-ikinci-gorev-yalitim");
    }

    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    db.close();
  }

  writeFileSync(join(stateDir, "ekran-kaniti-kaydi.txt"), log.join("\n"), "utf8");
  console.log(log.join("\n"));
  console.log(`Ekran görüntüleri: ${outDir}`);
}

async function screenshot(page: import("playwright-core").Page, dir: string, name: string): Promise<void> {
  await page.screenshot({ path: join(dir, `${name}.png`), fullPage: false });
}

await main();
