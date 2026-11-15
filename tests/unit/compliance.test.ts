/**
 * Dil ilkesi, sentetik veri ve kapsam sınırı denetim testleri
 * (bkz. MIH-REQ-DIL-001 … 003, MIH-REQ-SNT-001 … 003, ADR-011).
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { GOLDEN_ASSIGNMENT, SYNTHETIC_MARKER } from "../../src/infrastructure/seed/goldenScenario.ts";
import { STATIC_SCREENS, OUT_OF_SCOPE_ITEMS } from "../../src/server/staticScreens.ts";
import { SYNTHETIC_NOTICE } from "../../src/domain/types.ts";

function listFiles(dir: string, extension: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      result.push(...listFiles(full, extension));
    } else if (full.endsWith(extension)) {
      result.push(full);
    }
  }
  return result;
}

describe("Sentetik veri ilkesi", () => {
  it("sentetik uyarı sabiti tek kaynaktan gelir ve doğru metni taşır", () => {
    expect(SYNTHETIC_NOTICE).toBe("SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR");
    expect(SYNTHETIC_MARKER).toBe(SYNTHETIC_NOTICE);
  });

  it("altın senaryo merci ve dosya adları sentetik olarak işaretlenmiştir", () => {
    expect(GOLDEN_ASSIGNMENT.authority).toContain("SENTETİK");
    expect(GOLDEN_ASSIGNMENT.caseNumber).toContain("SENTETİK");
    expect(GOLDEN_ASSIGNMENT.kind).toContain("sentetik");
    expect(GOLDEN_ASSIGNMENT.documentName).toContain("Sentetik");
    for (const audio of GOLDEN_ASSIGNMENT.audios) {
      expect(audio.fileName).toContain("Sentetik");
      expect(audio.originNote).toContain("Sentetik");
    }
  });

  it("altın senaryo gerçek kişi adı içermez", () => {
    const serialized = JSON.stringify(GOLDEN_ASSIGNMENT);
    // Gerçek mahkeme/kişi adı kalıpları kullanılmaz; yalnızca "Örnek" ve "Sentetik" geçer.
    expect(serialized).not.toMatch(/T\.C\. Kimlik/);
    expect(serialized).not.toMatch(/@/); // e-posta adresi yok
    // Sayısal kimlik benzeri uzun diziler (TCKN) bulunmaz.
    expect(serialized).not.toMatch(/\b\d{11}\b/);
  });

  it("altın senaryo sözleşmede istenen asgari öğeleri içerir", () => {
    expect(GOLDEN_ASSIGNMENT.audios.length).toBe(2);
    expect(GOLDEN_ASSIGNMENT.questions.length).toBeGreaterThanOrEqual(3);
    expect(GOLDEN_ASSIGNMENT.findings.length).toBeGreaterThanOrEqual(2);
    expect(GOLDEN_ASSIGNMENT.corrections.length).toBeGreaterThanOrEqual(1);
    // Her iki kayıtta da segment bulunmalıdır.
    for (const audio of GOLDEN_ASSIGNMENT.audios) {
      expect(audio.segments.length).toBeGreaterThan(0);
    }
    // En az iki farklı kayıttan dayanak bulunmalıdır.
    const audioKeysWithEvidence = new Set(
      GOLDEN_ASSIGNMENT.findings.flatMap((finding) => finding.evidence.map((item) => item.audioKey)),
    );
    expect(audioKeysWithEvidence.size).toBeGreaterThanOrEqual(2);
    // Bulgular kanıtsız olamaz.
    for (const finding of GOLDEN_ASSIGNMENT.findings) {
      expect(finding.evidence.length).toBeGreaterThan(0);
    }
  });

  it("segment zamanları kayıt süresi içinde ve sıralıdır", () => {
    for (const audio of GOLDEN_ASSIGNMENT.audios) {
      let previousEnd = -1;
      for (const segment of audio.segments) {
        expect(segment.startMs).toBeGreaterThanOrEqual(0);
        expect(segment.endMs).toBeGreaterThan(segment.startMs);
        expect(segment.endMs).toBeLessThanOrEqual(audio.durationMs);
        expect(segment.startMs).toBeGreaterThanOrEqual(previousEnd);
        previousEnd = segment.endMs;
      }
    }
  });
});

describe("Dil ilkesi", () => {
  it("kullanıcıya görünen arayüz metinleri Türkçedir", () => {
    const uiFiles = listFiles(resolve(process.cwd(), "src/ui"), ".tsx");
    expect(uiFiles.length).toBeGreaterThan(5);
    // Türkçe'ye özgü karakterler en az birkaç dosyada bulunmalıdır.
    const filesWithTurkish = uiFiles.filter((file) =>
      /[ıİşğçöüŞĞÇÖÜ]/.test(readFileSync(file, "utf8")),
    );
    expect(filesWithTurkish.length).toBeGreaterThanOrEqual(uiFiles.length - 2);
  });

  it("teknik tanımlayıcılar kaynak kodda korunur", () => {
    const types = readFileSync(resolve(process.cwd(), "src/domain/types.ts"), "utf8");
    for (const identifier of [
      "ReportDocument",
      "taskId",
      "EvidenceRef",
      "TranscriptSegment",
      "TranscriptVersion",
      "ProcessingJob",
      "ReportRevision",
    ]) {
      expect(types, `Tanımlayıcı eksik: ${identifier}`).toContain(identifier);
    }
  });

  it("belgelerde Türkçe başlık kullanılır", () => {
    const docs = readdirSync(resolve(process.cwd(), "docs")).filter((name) => name.endsWith(".md"));
    expect(docs.length).toBeGreaterThanOrEqual(8);
    for (const doc of docs) {
      const content = readFileSync(join(resolve(process.cwd(), "docs"), doc), "utf8");
      // Başlık satırı Türkçe olmalıdır.
      const title = content.split("\n")[0] ?? "";
      expect(title.startsWith("# "), `Başlık eksik: ${doc}`).toBe(true);
    }
  });
});

describe("Kapsam sınırı dürüstlüğü", () => {
  it("sonraki aşama ekranları devre dışı özellik gerekçesi taşır", () => {
    const deferred = STATIC_SCREENS.filter((screen) => screen.availability === "sonraki-aşama");
    expect(deferred.length).toBeGreaterThan(0);
    for (const screen of deferred) {
      expect(screen.disabledFeatures.length, `Gerekçesiz ekran: ${screen.id}`).toBeGreaterThan(0);
      for (const feature of screen.disabledFeatures) {
        expect(feature.reason.length).toBeGreaterThan(10);
      }
    }
  });

  it("kapsam dışı alanlar açıkça listelenir", () => {
    expect(OUT_OF_SCOPE_ITEMS.length).toBeGreaterThanOrEqual(6);
    const joined = OUT_OF_SCOPE_ITEMS.join(" ");
    expect(joined).toContain("OCR");
    expect(joined).toContain("ASR");
    expect(joined).toContain("UYAP");
    expect(joined).toContain("denetçi portalı");
  });

  it("işlevli işaretlenen ekranlar en az bir çalışan özellik bildirir", () => {
    const working = STATIC_SCREENS.filter((screen) => screen.availability === "işlevli");
    expect(working.length).toBeGreaterThan(0);
    for (const screen of working) {
      expect(screen.workingFeatures.length, `Çalışan özellik bildirilmemiş: ${screen.id}`).toBeGreaterThan(0);
    }
  });

  it("arayüzde sahte çalışma göstergesi kullanılmaz", () => {
    const uiFiles = listFiles(resolve(process.cwd(), "src/ui"), ".tsx");
    const joined = uiFiles.map((file) => readFileSync(file, "utf8")).join("\n");
    // "yakında" gibi belirsiz vaatler yerine açık "sonraki aşama" ifadesi kullanılır.
    expect(joined).toContain("sonraki aşama");
    expect(joined).not.toMatch(/coming soon/i);
  });
});
