/**
 * Kalite kontrolü hesaplama birim testleri.
 *
 * Kontroller gerçek veriden türediği için, eksik veri doğru biçimde engel/uyarı
 * üretmelidir (bkz. MIH-REQ-QLT-001, MIH-REQ-QLT-002).
 */
import { describe, expect, it } from "vitest";
import {
  computeQualityChecks,
  reportStatusFromChecks,
  summarizeChecks,
  type QualityCheckInput,
} from "../../../src/domain/qualityChecks.ts";

function input(overrides: Partial<QualityCheckInput> = {}): QualityCheckInput {
  return {
    taskId: "gorev-1",
    reportId: "rapor-1",
    revisionId: "revizyon-1",
    now: "2026-11-15T09:00:00.000Z",
    assignmentConfirmed: true,
    materials: [
      {
        materialId: "materyal-1",
        taskId: "gorev-1",
        originalName: "sentetik.wav",
        storedName: "sentetik.wav",
        mimeType: "audio/wav",
        sizeBytes: 100,
        sha256: "a".repeat(64),
        receivedAt: "2026-11-15T09:00:00.000Z",
        kind: "ses",
        status: "doğrulandı",
      },
    ],
    audios: [
      {
        audioId: "kayit-1",
        taskId: "gorev-1",
        materialId: "materyal-1",
        durationMs: 30_000,
        sampleRateHz: 16_000,
        channels: 1,
        codec: "WAV",
        originNote: "Sentetik",
        sha256: "a".repeat(64),
      },
    ],
    transcriptVersions: [
      {
        versionId: "surum-1",
        taskId: "gorev-1",
        audioId: "kayit-1",
        kind: "ham-asr",
        source: "asr-motoru",
        createdBy: "Sentetik",
        createdAt: "2026-11-15T09:00:00.000Z",
        note: "",
      },
    ],
    segments: [
      {
        segmentId: "segment-1",
        taskId: "gorev-1",
        versionId: "surum-1",
        audioId: "kayit-1",
        index: 0,
        startMs: 1_000,
        endMs: 5_000,
        speakerLabel: "Konuşmacı A",
        text: "Sentetik",
        uncertain: false,
        reviewState: "incelendi",
        priorityReason: null,
        note: "",
      },
    ],
    questions: [
      { questionId: "soru-1", taskId: "gorev-1", index: 1, text: "Sentetik soru?", sourceNote: "" },
    ],
    answers: [
      {
        answerId: "yanit-1",
        taskId: "gorev-1",
        questionId: "soru-1",
        text: "Sentetik yanıt",
        status: "tamamlandı",
        version: 1,
        answeredBy: "Uzman",
        updatedAt: "2026-11-15T09:00:00.000Z",
      },
    ],
    evidence: [
      {
        evidenceId: "dayanak-1",
        taskId: "gorev-1",
        kind: "ses-segmenti",
        audioId: "kayit-1",
        segmentId: "segment-1",
        startMs: 1_000,
        endMs: 5_000,
        note: "",
        createdAt: "2026-11-15T09:00:00.000Z",
      },
    ],
    findings: [
      {
        findingId: "bulgu-1",
        taskId: "gorev-1",
        code: "B-01",
        title: "Sentetik",
        description: "",
        severity: "orta",
        status: "doğrulandı",
        createdAt: "2026-11-15T09:00:00.000Z",
      },
    ],
    findingEvidence: [{ findingId: "bulgu-1", evidenceId: "dayanak-1" }],
    approved: false,
    ...overrides,
  };
}

function find(checks: ReturnType<typeof computeQualityChecks>, code: string) {
  const check = checks.find((item) => item.code === code);
  if (!check) throw new Error(`Kontrol bulunamadı: ${code}`);
  return check;
}

describe("Rapor kalite kontrolleri", () => {
  it("tam veriyle bekleyen/engel kontrol üretmez (onay hariç)", () => {
    const checks = computeQualityChecks(input());
    expect(find(checks, "gorevlendirme-kapsami").status).toBe("geçti");
    expect(find(checks, "tum-sorulara-yanit").status).toBe("geçti");
    expect(find(checks, "yanit-dayanak-baglantisi").status).toBe("geçti");
    expect(find(checks, "bulgu-dayanak-baglantisi").status).toBe("geçti");
    // Onay olmadan insan onayı kontrolü engeldir.
    expect(find(checks, "insan-onayi").status).toBe("engel");
  });

  it("teyit bekleyen alan varsa görevlendirme kapsamını engeller", () => {
    const checks = computeQualityChecks(input({ assignmentConfirmed: false }));
    expect(find(checks, "gorevlendirme-kapsami").status).toBe("engel");
  });

  it("yanıtlanmamış soru varsa engel üretir", () => {
    const checks = computeQualityChecks(
      input({
        answers: [
          {
            answerId: "yanit-1",
            taskId: "gorev-1",
            questionId: "soru-1",
            text: "",
            status: "boş",
            version: 1,
            answeredBy: "Uzman",
            updatedAt: "2026-11-15T09:00:00.000Z",
          },
        ],
      }),
    );
    expect(find(checks, "tum-sorulara-yanit").status).toBe("engel");
  });

  it("dayanaksız bulgu varsa engel üretir", () => {
    const checks = computeQualityChecks(input({ findingEvidence: [] }));
    expect(find(checks, "bulgu-dayanak-baglantisi").status).toBe("engel");
  });

  it("hiç dayanak yoksa yanıt-dayanak bağlantısını engeller", () => {
    const checks = computeQualityChecks(input({ evidence: [] }));
    expect(find(checks, "yanit-dayanak-baglantisi").status).toBe("engel");
  });

  it("incelenmemiş segment varsa uyarı üretir", () => {
    const base = input();
    const checks = computeQualityChecks(
      input({
        segments: base.segments.map((segment) => ({ ...segment, reviewState: "bekliyor" as const })),
      }),
    );
    expect(find(checks, "transkript-uzman-kontrolu").status).toBe("uyarı");
  });

  it("materyal kaydı yoksa kaynak envanterini bekliyor durumuna alır", () => {
    const checks = computeQualityChecks(input({ materials: [], audios: [] }));
    expect(find(checks, "kaynak-envanteri").status).toBe("bekliyor");
  });

  it("bozuk bütünlük özeti varsa kaynak envanterini engeller", () => {
    const base = input();
    const broken = base.audios.map((audio) => ({ ...audio, sha256: "kısa" }));
    const checks = computeQualityChecks(input({ audios: broken }));
    expect(find(checks, "kaynak-envanteri").status).toBe("engel");
  });

  it("geçti sonucu her zaman kaynak listesi taşır", () => {
    const checks = computeQualityChecks(input());
    for (const check of checks) {
      if (check.status === "geçti") {
        expect(check.computedFrom.length).toBeGreaterThan(0);
      }
    }
  });

  it("özet sayıları doğru hesaplar", () => {
    const checks = computeQualityChecks(input());
    const summary = summarizeChecks(checks);
    expect(summary.blocking).toBe(1); // yalnızca insan onayı
    expect(summary.passed).toBeGreaterThan(0);
  });

  it("engel varsa rapor eksik, onay varsa onaylandı durumuna geçer", () => {
    const checks = computeQualityChecks(input());
    expect(reportStatusFromChecks(checks, false)).toBe("eksik");
    expect(reportStatusFromChecks(checks, true)).toBe("onaylandı");
  });
});
