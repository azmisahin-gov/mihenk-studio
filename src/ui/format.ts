/**
 * Yardımcı biçimlendirme işlevleri.
 *
 * Zaman ekseni tek birimdir: milisaniye (bkz. MIH-REQ-AUD-002). Tüm gösterim
 * biçimleri bu tek kaynaktan türetilir.
 */

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(ms % 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bayt`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function taskStatusLabel(status: string): string {
  const map: Record<string, string> = {
    taslak: "Taslak",
    incelemede: "İnceleme sürüyor",
    beklemede: "Beklemede",
    "rapor-hazırlanıyor": "Rapor hazırlanıyor",
    "uzman-onayı-bekliyor": "Uzman onayı bekliyor",
    tamamlandı: "Tamamlandı",
    arşivlendi: "Arşivlendi",
  };
  return map[status] ?? status;
}

export function taskStatusTone(status: string): "green" | "amber" | "blue" | "red" | "gray" {
  const map: Record<string, "green" | "amber" | "blue" | "red" | "gray"> = {
    taslak: "amber",
    incelemede: "blue",
    beklemede: "amber",
    "rapor-hazırlanıyor": "blue",
    "uzman-onayı-bekliyor": "amber",
    tamamlandı: "green",
    arşivlendi: "gray",
  };
  return map[status] ?? "gray";
}

export function materialStatusTone(status: string): "green" | "amber" | "red" | "gray" | "blue" {
  const map: Record<string, "green" | "amber" | "red" | "gray" | "blue"> = {
    bekleniyor: "amber",
    alındı: "blue",
    doğrulandı: "green",
    sorunlu: "red",
    yinelenen: "gray",
  };
  return map[status] ?? "gray";
}

export function reviewStateLabel(state: string): string {
  const map: Record<string, string> = {
    bekliyor: "Uzman kontrolü bekliyor",
    incelendi: "İncelendi",
    düzeltildi: "Düzeltildi",
  };
  return map[state] ?? state;
}
