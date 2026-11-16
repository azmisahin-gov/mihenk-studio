/**
 * Alan doğrulamaları ve durum makineleri birim testleri.
 */
import { describe, expect, it } from "vitest";
import {
  DomainValidationError,
  assertEvidenceTarget,
  assertFindingHasEvidence,
  assertMaterialIntegrity,
  assertQualityCheckGrounded,
  assertSegmentTimeline,
} from "../../../src/domain/validation.ts";
import {
  canTransitionTask,
  taskProgress,
  transitionRequiresApproval,
} from "../../../src/domain/taskStateMachine.ts";
import type {
  AudioRecord,
  EvidenceRef,
  Finding,
  Material,
  QualityCheck,
  TranscriptSegment,
} from "../../../src/domain/types.ts";

const audio: AudioRecord = {
  audioId: "kayit-1",
  taskId: "gorev-1",
  materialId: "materyal-1",
  durationMs: 30_000,
  sampleRateHz: 16_000,
  channels: 1,
  codec: "WAV",
  originNote: "Sentetik",
  sha256: "a".repeat(64),
};

function segment(overrides: Partial<TranscriptSegment> = {}): TranscriptSegment {
  return {
    segmentId: "segment-1",
    taskId: "gorev-1",
    versionId: "surum-1",
    audioId: "kayit-1",
    index: 0,
    startMs: 1_000,
    endMs: 5_000,
    speakerLabel: "Konuşmacı A",
    text: "Sentetik metin",
    uncertain: false,
    reviewState: "bekliyor",
    priorityReason: null,
    note: "",
    ...overrides,
  };
}

describe("Görev durum makinesi", () => {
  it("izin verilen geçişleri kabul eder", () => {
    expect(canTransitionTask("taslak", "incelemede")).toBe(true);
    expect(canTransitionTask("incelemede", "rapor-hazırlanıyor")).toBe(true);
    expect(canTransitionTask("uzman-onayı-bekliyor", "tamamlandı")).toBe(true);
  });

  it("izin verilmeyen geçişleri reddeder", () => {
    expect(canTransitionTask("taslak", "tamamlandı")).toBe(false);
    expect(canTransitionTask("arşivlendi", "incelemede")).toBe(false);
    expect(canTransitionTask("incelemede", "tamamlandı")).toBe(false);
  });

  it("tamamlandı durumunun insan onayı gerektirdiğini bildirir", () => {
    expect(transitionRequiresApproval("tamamlandı")).toBe(true);
    expect(transitionRequiresApproval("incelemede")).toBe(false);
  });

  it("ilerleme yüzdesini durumdan türetir", () => {
    expect(taskProgress("taslak")).toBeLessThan(taskProgress("incelemede"));
    expect(taskProgress("tamamlandı")).toBe(100);
  });
});

describe("Materyal doğrulaması", () => {
  const base: Material = {
    materialId: "materyal-1",
    taskId: "gorev-1",
    originalName: "sentetik.wav",
    storedName: "sentetik.wav",
    mimeType: "audio/wav",
    sizeBytes: 1024,
    sha256: "b".repeat(64),
    receivedAt: "2026-11-15T09:00:00.000Z",
    kind: "ses",
    status: "alındı",
  };

  it("geçerli materyali kabul eder", () => {
    expect(() => assertMaterialIntegrity(base)).not.toThrow();
  });

  it("geçersiz özeti reddeder", () => {
    expect(() => assertMaterialIntegrity({ ...base, sha256: "kısa" })).toThrow(DomainValidationError);
  });

  it("kaynaksız yinelenen kaydı reddeder", () => {
    expect(() => assertMaterialIntegrity({ ...base, status: "yinelenen" })).toThrow(DomainValidationError);
    expect(() =>
      assertMaterialIntegrity({ ...base, status: "yinelenen", duplicateOfId: "materyal-0" }),
    ).not.toThrow();
  });
});

describe("Ses ve segment zaman ekseni doğrulaması", () => {
  it("kayıt sınırı içindeki segmenti kabul eder", () => {
    expect(() => assertSegmentTimeline(segment(), audio)).not.toThrow();
  });

  it("kayıt süresini aşan segmenti reddeder", () => {
    expect(() => assertSegmentTimeline(segment({ endMs: 31_000 }), audio)).toThrow(DomainValidationError);
  });

  it("ters zaman aralığını reddeder", () => {
    expect(() => assertSegmentTimeline(segment({ startMs: 5_000, endMs: 4_000 }), audio)).toThrow(
      DomainValidationError,
    );
  });

  it("farklı göreve ait segmenti reddeder", () => {
    expect(() => assertSegmentTimeline(segment({ taskId: "gorev-2" }), audio)).toThrow(DomainValidationError);
  });

  it("farklı kayda ait segmenti reddeder", () => {
    expect(() => assertSegmentTimeline(segment({ audioId: "kayit-2" }), audio)).toThrow(DomainValidationError);
  });
});

describe("Dayanak doğrulaması", () => {
  it("hedefsiz belge dayanağını reddeder", () => {
    const evidence: EvidenceRef = {
      evidenceId: "dayanak-1",
      taskId: "gorev-1",
      kind: "belge",
      materialId: "",
      page: 1,
      region: "başlık",
      note: "",
      createdAt: "2026-11-15T09:00:00.000Z",
    };
    expect(() => assertEvidenceTarget(evidence)).toThrow(DomainValidationError);
  });

  it("geçersiz sayfa numarasını reddeder", () => {
    const evidence: EvidenceRef = {
      evidenceId: "dayanak-1",
      taskId: "gorev-1",
      kind: "belge",
      materialId: "materyal-1",
      page: 0,
      region: "başlık",
      note: "",
      createdAt: "2026-11-15T09:00:00.000Z",
    };
    expect(() => assertEvidenceTarget(evidence)).toThrow(DomainValidationError);
  });

  it("segment ve zaman taşımayan ses dayanağını reddeder", () => {
    const evidence: EvidenceRef = {
      evidenceId: "dayanak-2",
      taskId: "gorev-1",
      kind: "ses-segmenti",
      audioId: "",
      segmentId: "",
      startMs: 0,
      endMs: 0,
      note: "",
      createdAt: "2026-11-15T09:00:00.000Z",
    };
    expect(() => assertEvidenceTarget(evidence)).toThrow(DomainValidationError);
  });

  it("gerçek hedefe bağlı dayanağı kabul eder", () => {
    const evidence: EvidenceRef = {
      evidenceId: "dayanak-3",
      taskId: "gorev-1",
      kind: "ses-segmenti",
      audioId: "kayit-1",
      segmentId: "segment-1",
      startMs: 1_000,
      endMs: 5_000,
      note: "Sentetik dayanak",
      createdAt: "2026-11-15T09:00:00.000Z",
    };
    expect(() => assertEvidenceTarget(evidence)).not.toThrow();
  });
});

describe("Bulgu doğrulaması", () => {
  const finding: Finding = {
    findingId: "bulgu-1",
    taskId: "gorev-1",
    code: "B-01",
    title: "Sentetik bulgu",
    description: "Açıklama",
    severity: "orta",
    status: "taslak",
    createdAt: "2026-11-15T09:00:00.000Z",
  };

  it("kanıtsız bulguyu reddeder", () => {
    expect(() => assertFindingHasEvidence(finding, [])).toThrow(DomainValidationError);
  });

  it("dayanağa bağlı bulguyu kabul eder", () => {
    expect(() => assertFindingHasEvidence(finding, ["dayanak-1"])).not.toThrow();
  });

  it("geri çekilen bulgu için dayanak aramaz", () => {
    expect(() => assertFindingHasEvidence({ ...finding, status: "geri çekildi" }, [])).not.toThrow();
  });
});

describe("Kalite kontrolü temellendirmesi", () => {
  const check: QualityCheck = {
    checkId: "kontrol-1",
    taskId: "gorev-1",
    reportId: "rapor-1",
    revisionId: "revizyon-1",
    code: "test",
    label: "Test kontrolü",
    status: "geçti",
    detail: "",
    computedAt: "2026-11-15T09:00:00.000Z",
    computedFrom: [],
  };

  it("kaynaksız geçti sonucunu reddeder", () => {
    expect(() => assertQualityCheckGrounded(check)).toThrow(DomainValidationError);
  });

  it("kaynağa bağlı geçti sonucunu kabul eder", () => {
    expect(() => assertQualityCheckGrounded({ ...check, computedFrom: ["yanit:1"] })).not.toThrow();
  });

  it("bekleyen kontrolü kaynaksız da kabul eder", () => {
    expect(() => assertQualityCheckGrounded({ ...check, status: "bekliyor" })).not.toThrow();
  });
});
