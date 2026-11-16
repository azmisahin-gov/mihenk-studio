/**
 * Görev durum makinesi (bkz. docs/05-alan-modeli-ve-durum-makineleri.md bölüm 3.1).
 *
 * "tamamlandı" durumuna geçiş yalnızca bir insan onay olayıyla mümkündür; bu,
 * uzman tarafından verilmemiş kararın tamamlanmış gösterilmesini engeller.
 */
import type { TaskStatus } from "./types.ts";

const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  taslak: ["incelemede", "arşivlendi"],
  incelemede: ["beklemede", "rapor-hazırlanıyor", "arşivlendi"],
  beklemede: ["incelemede", "arşivlendi"],
  "rapor-hazırlanıyor": ["uzman-onayı-bekliyor", "incelemede"],
  "uzman-onayı-bekliyor": ["tamamlandı", "rapor-hazırlanıyor"],
  tamamlandı: ["arşivlendi"],
  arşivlendi: [],
};

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Geçişin insan onay olayı gerektirip gerektirmediğini bildirir. */
export function transitionRequiresApproval(to: TaskStatus): boolean {
  return to === "tamamlandı";
}

export class InvalidTaskTransitionError extends Error {
  constructor(
    readonly from: TaskStatus,
    readonly to: TaskStatus,
  ) {
    super(`Geçersiz görev durumu geçişi: ${from} → ${to}`);
    this.name = "InvalidTaskTransitionError";
  }
}

export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransitionTask(from, to)) {
    throw new InvalidTaskTransitionError(from, to);
  }
}

/** Görev durumundan türetilen ilerleme yüzdesi. Sabit değer kullanılmaz. */
export function taskProgress(status: TaskStatus): number {
  switch (status) {
    case "taslak":
      return 10;
    case "incelemede":
      return 45;
    case "beklemede":
      return 35;
    case "rapor-hazırlanıyor":
      return 70;
    case "uzman-onayı-bekliyor":
      return 90;
    case "tamamlandı":
    case "arşivlendi":
      return 100;
  }
}

export function taskStatusTone(status: TaskStatus): "green" | "amber" | "blue" | "gray" | "red" {
  switch (status) {
    case "taslak":
      return "amber";
    case "incelemede":
      return "blue";
    case "beklemede":
      return "amber";
    case "rapor-hazırlanıyor":
      return "blue";
    case "uzman-onayı-bekliyor":
      return "amber";
    case "tamamlandı":
      return "green";
    case "arşivlendi":
      return "gray";
  }
}
