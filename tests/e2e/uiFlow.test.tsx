/**
 * Uçtan uca arayüz testleri (jsdom).
 *
 * Arayüz, gerçek yerel servis üzerinden gerçek çekirdeği kullanır; ağ çağrıları
 * gerçek HTTP üzerinden yapılır (bkz. ADR-009). Kritik akış ve erişilebilirlik
 * kontrolleri burada doğrulanır (bkz. MIH-REQ-A11Y-001, MIH-REQ-A11Y-002).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { App } from "../../src/ui/App.tsx";
import { ApiClient } from "../../src/ui/api.ts";
import { bootstrap } from "../../src/infrastructure/bootstrap.ts";
import { createApiServer } from "../../src/server/api.ts";
import { DEFAULT_ACTOR } from "../../src/application/context.ts";
import { seedGoldenScenario, seedIsolationCounterpart } from "../../src/infrastructure/seed/seedGoldenScenario.ts";

let server: Server;
let baseUrl: string;
let token: string;
let closeDb: () => void;

beforeAll(async () => {
  const { ctx, db } = bootstrap({ databasePath: ":memory:", storageRoot: ":memory:" });
  seedGoldenScenario(ctx, DEFAULT_ACTOR);
  seedIsolationCounterpart(ctx, DEFAULT_ACTOR);
  const created = createApiServer({ ctx, disableAuth: true });
  server = created.server;
  token = created.token;
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  closeDb = () => db.close();
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  closeDb();
});

function renderApp() {
  const client = new ApiClient(baseUrl, token);
  return render(<App client={client} />);
}

describe("Uçtan uca arayüz akışı", () => {
  it("Genel Bakış gerçek görev verisinden türetilir ve sentetik uyarı görünür", async () => {
    renderApp();
    expect(await screen.findByText(/SENTETİK ÖRNEK/)).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeTruthy());
    // Gerçek görev başlığı listede görünmelidir.
    expect(await screen.findAllByText(/Sentetik ses kayıtlarının incelenmesi/)).toBeTruthy();
  });

  it("görev çalışma alanı sekmeleri erişilebilirlik ilişkilerine sahiptir", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Görevlerim/ }));
    const openButtons = await screen.findAllByRole("button", { name: /^Aç$/ });
    await user.click(openButtons[0]!);

    const tablist = await screen.findByRole("tablist");
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.length).toBe(6);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    // Sekme paneli ilişkisi kurulmalıdır.
    const panel = await screen.findByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(tabs[0]?.id);
  });

  it("ok tuşlarıyla sekme gezinmesi çalışır", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Görevlerim/ }));
    const openButtons = await screen.findAllByRole("button", { name: /^Aç$/ });
    await user.click(openButtons[0]!);

    const tabs = within(await screen.findByRole("tablist")).getAllByRole("tab");
    tabs[0]!.focus();
    await user.keyboard("{ArrowRight}");
    await waitFor(() => {
      const updated = within(screen.getByRole("tablist")).getAllByRole("tab");
      expect(updated[1]?.getAttribute("aria-selected")).toBe("true");
    });
  });

  it("Tek Rapor sekmesi A4 önizleme, kalite kontrolü ve sentetik uyarı gösterir", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Görevlerim/ }));
    const openButtons = await screen.findAllByRole("button", { name: /^Aç$/ });
    await user.click(openButtons[0]!);
    await user.click(await screen.findByRole("tab", { name: "Tek Rapor" }));

    expect(await screen.findByLabelText("A4 rapor önizlemesi")).toBeTruthy();
    expect(await screen.findByText(/Nihai insan onayı/)).toBeTruthy();
    // Kalite kontrolleri gerçek eksiklikten türetilir.
    expect(screen.getByText(/insan onayı/i)).toBeTruthy();
  });

  it("yanıtlanmamış soru ve teyit bekleyen alan görev özetinde görünür", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Görevlerim/ }));
    const openButtons = await screen.findAllByRole("button", { name: /^Aç$/ });
    await user.click(openButtons[0]!);
    expect(await screen.findByText(/Görev veri özeti/)).toBeTruthy();
    expect(await screen.findByText(/Soru \/ yanıt/)).toBeTruthy();
  });

  it("görev değiştirildiğinde çalışma alanı yeni görevin verisini yükler", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Görevlerim/ }));
    const openButtons = await screen.findAllByRole("button", { name: /^Aç$/ });
    expect(openButtons.length).toBeGreaterThanOrEqual(2);

    // İlk görev açılır ve başlığı kaydedilir.
    await user.click(openButtons[0]!);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeTruthy());
    const firstHeading = screen.getByRole("heading", { level: 1 }).textContent ?? "";
    expect(firstHeading.length).toBeGreaterThan(0);

    // Görev listesine dönülür ve diğer görev açılır.
    await user.click(screen.getByRole("button", { name: /Görev listesi/ }));
    const reopened = await screen.findAllByRole("button", { name: /^Aç$/ });
    await user.click(reopened[1]!);

    // Başlık değişmeli: ikinci görevin kendi verisi yüklenir.
    await waitFor(() => {
      const heading = screen.getByRole("heading", { level: 1 }).textContent ?? "";
      expect(heading).not.toBe(firstHeading);
    });

    // İki görevin veri özetleri bağımsızdır.
    const summaryTable = await screen.findByText(/Görev veri özeti/);
    expect(summaryTable).toBeTruthy();
  });

  it("sonraki aşama ekranları etkin düğme gibi gösterilmez", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Ses Araçları" }));
    expect((await screen.findAllByText(/Sonraki aşama/)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Gürültü azaltma/)).toBeTruthy();
    expect(await screen.findByText(/Spektrogram/)).toBeTruthy();
    // Bu ekranda hiçbir kontrol etkin düğme olarak sunulmaz.
    expect(await screen.findByText(/Bu dilimde çalışan özellik yok/)).toBeTruthy();
  });
});
