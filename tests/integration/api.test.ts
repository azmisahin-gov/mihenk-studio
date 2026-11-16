/**
 * Yerel servis API'si entegrasyon testleri.
 *
 * Özellikle DOCX dışa aktarma yanıtının geçerli HTTP başlıkları taşıdığı
 * doğrulanır. Türkçe karakter içeren başlık değerleri HTTP'de geçersizdir;
 * bu test o sınıf hatanın geri dönmesini engeller (bkz. MIH-REQ-RNT-006).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { bootstrap } from "../../src/infrastructure/bootstrap.ts";
import { createApiServer } from "../../src/server/api.ts";
import { DEFAULT_ACTOR } from "../../src/application/context.ts";
import { seedGoldenScenario } from "../../src/infrastructure/seed/seedGoldenScenario.ts";
import { SYNTHETIC_NOTICE } from "../../src/domain/types.ts";

let server: Server;
let baseUrl: string;
let token: string;
let taskId: string;
let closeDb: () => void;

beforeAll(async () => {
  const { ctx, db } = bootstrap({ databasePath: ":memory:", storageRoot: ":memory:" });
  const seeded = seedGoldenScenario(ctx, DEFAULT_ACTOR);
  taskId = seeded.taskId;
  const created = createApiServer({ ctx });
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

function authHeaders(): Record<string, string> {
  return { "x-mihenk-token": token };
}

describe("Yerel servis API'si", () => {
  it("belirteç olmadan API isteğini reddeder", async () => {
    const response = await fetch(`${baseUrl}/api/tasks`);
    expect(response.status).toBe(401);
  });

  it("sağlık uç noktası sentetik ortamı bildirir", async () => {
    const response = await fetch(`${baseUrl}/api/health`, { headers: authHeaders() });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; synthetic: boolean };
    expect(body.ok).toBe(true);
    expect(body.synthetic).toBe(true);
  });

  it("DOCX dışa aktarma geçerli başlıklarla dosya döndürür", async () => {
    const response = await fetch(`${baseUrl}/api/tasks/${taskId}/report/export`, {
      method: "POST",
      headers: { ...authHeaders(), "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    // Türkçe karakterli başlık değeri HTTP hatası üretmemelidir.
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );

    // Dosya adı hem ASCII yedek hem UTF-8 biçimde verilir.
    const disposition = response.headers.get("content-disposition") ?? "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("filename=");
    expect(disposition).toContain("filename*=UTF-8''");

    // Sayfa sayısı ve sentetik uyarı başlıkları ASCII taşır.
    expect(Number(response.headers.get("x-mihenk-page-count"))).toBeGreaterThan(0);
    const notice = response.headers.get("x-mihenk-notice") ?? "";
    expect(notice).not.toMatch(/[^\x20-\x7E]/);
    expect(decodeURIComponent(notice)).toBe(SYNTHETIC_NOTICE);

    // Gövde gerçek bir DOCX (ZIP) paketidir.
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("dışa aktarma işi kalıcı kayıt üretir", async () => {
    await fetch(`${baseUrl}/api/tasks/${taskId}/report/export`, {
      method: "POST",
      headers: { ...authHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "api-testi" }),
    });
    const response = await fetch(`${baseUrl}/api/tasks/${taskId}/jobs`, { headers: authHeaders() });
    const jobs = (await response.json()) as { idempotencyKey: string; status: string }[];
    const job = jobs.find((item) => item.idempotencyKey === "api-testi");
    expect(job?.status).toBe("tamamlandı");
  });

  it("kapsam dışı alanlar meta uç noktasında işaretlidir", async () => {
    const response = await fetch(`${baseUrl}/api/meta`, { headers: authHeaders() });
    const body = (await response.json()) as {
      screens: { id: string; availability: string; disabledFeatures: unknown[] }[];
    };
    const audioTools = body.screens.find((screen) => screen.id === "audio-tools");
    expect(audioTools?.availability).toBe("sonraki-aşama");
    expect(audioTools?.disabledFeatures.length).toBeGreaterThan(0);
  });
});
