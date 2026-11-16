/**
 * Kanıt araçları için tarayıcı başlatıcı.
 *
 * Sistem Chromium'u varsa onu kullanır; yoksa Playwright'ın kendi tarayıcısına
 * düşer. Böylece hem yerel ortamda hem CI'da ek yapılandırma gerekmez.
 */
import { existsSync } from "node:fs";
import { chromium, type Browser } from "playwright-core";

const systemChromium =
  process.env.CHROMIUM_PATH ??
  ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"].find((path) =>
    existsSync(path),
  );

export async function launchBrowser(): Promise<Browser> {
  const args = ["--no-sandbox", "--disable-dev-shm-usage"];
  if (systemChromium) {
    return chromium.launch({ executablePath: systemChromium, args });
  }
  return chromium.launch({ args });
}
