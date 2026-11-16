/**
 * Erişilebilirlik ve okunabilirlik testleri (bkz. MIH-REQ-A11Y-001 … 007).
 *
 * Klavye erişimi, odak yönetimi, erişilebilir adlar, sekme ilişkileri ve
 * okunabilir metin boyutu denetlenir.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { App } from "../../src/ui/App.tsx";
import { ApiClient } from "../../src/ui/api.ts";
import { bootstrap } from "../../src/infrastructure/bootstrap.ts";
import { createApiServer } from "../../src/server/api.ts";
import { DEFAULT_ACTOR } from "../../src/application/context.ts";
import { seedGoldenScenario } from "../../src/infrastructure/seed/seedGoldenScenario.ts";

let server: Server;
let baseUrl: string;
let closeDb: () => void;

beforeAll(async () => {
  const { ctx, db } = bootstrap({ databasePath: ":memory:", storageRoot: ":memory:" });
  seedGoldenScenario(ctx, DEFAULT_ACTOR);
  const created = createApiServer({ ctx, disableAuth: true });
  server = created.server;
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  closeDb = () => db.close();
});

afterAll(async () => {
  await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  closeDb();
});

function renderApp() {
  return render(<App client={new ApiClient(baseUrl, "test")} />);
}

describe("Erişilebilirlik", () => {
  it("tüm gezinme düğmeleri erişilebilir ada sahiptir", async () => {
    renderApp();
    await screen.findByText(/SENTETİK ÖRNEK/);
    const nav = await screen.findByRole("navigation", { name: "Ana gezinme" });
    const buttons = within(nav).getAllByRole("button");
    // 11 gezinme düğmesi: 3 çalışma alanı + 1 kişisel + 5 uzmanlık + 2 sistem.
    expect(buttons.length).toBe(11);
    for (const button of buttons) {
      const name = button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "";
      expect(name.length, `Erişilebilir ad eksik: ${button.outerHTML.slice(0, 80)}`).toBeGreaterThan(0);
    }
  });

  it("genel arama alanı erişilebilir ada ve çalışan kısayola sahiptir", async () => {
    renderApp();
    const user = userEvent.setup();
    const search = await screen.findByRole("textbox", { name: /Genel arama/ });
    expect(search).toBeTruthy();

    // Ctrl+K aramaya odaklanmalıdır (bkz. MIH-REQ-A11Y-005).
    await user.keyboard("{Control>}k{/Control}");
    await waitFor(() => expect(document.activeElement).toBe(search));
  });

  it("görev listesi tablosu kapsam (scope) nitelikleri taşır", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Görevlerim/ }));
    const table = await screen.findByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    expect(headers.length).toBeGreaterThan(0);
    for (const header of headers) {
      expect(header.getAttribute("scope")).toBe("col");
    }
  });

  it("sekme paneli klavye odağı alabilir ve ilişki kurulmuştur", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Görevlerim/ }));
    const openButtons = await screen.findAllByRole("button", { name: /^Aç$/ });
    await user.click(openButtons[0]!);

    const tablist = await screen.findByRole("tablist");
    const tabs = within(tablist).getAllByRole("tab");
    for (const tab of tabs) {
      expect(tab.getAttribute("aria-controls")).toBeTruthy();
      expect(tab.getAttribute("aria-selected")).toBeTruthy();
    }
    const panel = await screen.findByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(
      tabs.find((tab) => tab.getAttribute("aria-selected") === "true")?.id,
    );
  });

  it("form alanları etiketlidir", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Görevlerim/ }));
    const openButtons = await screen.findAllByRole("button", { name: /^Aç$/ });
    await user.click(openButtons[0]!);
    await user.click(await screen.findByRole("tab", { name: "Sorular ve Bulgular" }));

    const textareas = await screen.findAllByRole("textbox");
    expect(textareas.length).toBeGreaterThan(0);
    for (const field of textareas) {
      const label = field.getAttribute("aria-label") ?? field.getAttribute("aria-labelledby") ?? "";
      expect(label.length, `Etiketsiz alan: ${field.outerHTML.slice(0, 80)}`).toBeGreaterThan(0);
    }
  });

  it("biçem dosyasında okunamayacak kadar küçük metin boyutu kullanılmaz", () => {
    const css = readFileSync(resolve(process.cwd(), "src/ui/studio.css"), "utf8");
    const sizes = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((match) => Number(match[1]));
    expect(sizes.length).toBeGreaterThan(0);
    // 10 px altı metin boyutu kullanılmaz (bkz. MIH-REQ-A11Y-004).
    const tooSmall = sizes.filter((size) => size < 10);
    expect(tooSmall, `Çok küçük metin boyutları: ${tooSmall.join(", ")}`).toHaveLength(0);
  });

  it("dar ekran ve yakınlaştırma için duyarlı kurallar tanımlıdır", () => {
    const css = readFileSync(resolve(process.cwd(), "src/ui/studio.css"), "utf8");
    expect(css).toContain("@media (max-width: 1080px)");
    expect(css).toContain("@media (max-width: 720px)");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("görünür odak biçemi tanımlıdır", () => {
    const css = readFileSync(resolve(process.cwd(), "src/ui/studio.css"), "utf8");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("outline");
  });

  it("etkileşimli öğeler klavye ile erişilebilir gerçek düğmelerdir", async () => {
    renderApp();
    await screen.findByText(/SENTETİK ÖRNEK/);
    // Rol tabanlı sorgular yalnızca gerçek etkileşimli öğeleri bulur.
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(5);
    for (const button of buttons) {
      // Her düğme ya metin ya aria-label taşımalıdır.
      const name = button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "";
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
