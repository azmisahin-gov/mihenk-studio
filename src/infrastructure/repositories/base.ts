/**
 * Görev kapsamı (task scope) ve görev kapsamlı depo temeli.
 *
 * Görev yalıtımı tip düzeyinde zorunlu kılınır: alt kayıt okuyan/yazan her
 * depo yöntemi bir `TaskScope` alır. Kapsamsız alt kayıt listeleme yöntemi
 * yoktur (bkz. ADR-006, MIH-REQ-TSK-007).
 */
import type { Database } from "../db/database.ts";
import type { TaskId } from "../../domain/types.ts";

export class TaskScope {
  private constructor(readonly taskId: TaskId) {}

  static of(taskId: TaskId): TaskScope {
    if (!taskId || typeof taskId !== "string") {
      throw new Error("Görev kapsamı için geçerli bir taskId zorunludur.");
    }
    return new TaskScope(taskId);
  }
}

export abstract class ScopedRepository {
  constructor(
    protected readonly db: Database,
    protected readonly scope: TaskScope,
  ) {}

  protected get taskId(): TaskId {
    return this.scope.taskId;
  }

  /**
   * Kaydın bu göreve ait olduğunu doğrular. Kapsam dışı bir kayda erişim
   * girişimi burada reddedilir; bu, görevler arası sızıntının son savunma
   * hattıdır.
   */
  protected assertOwnership(rowTaskId: string | null | undefined, entity: string, id: string): void {
    if (rowTaskId !== this.taskId) {
      throw new TaskIsolationError(this.taskId, rowTaskId ?? "(yok)", entity, id);
    }
  }
}

export class TaskIsolationError extends Error {
  constructor(
    readonly requestedTaskId: TaskId,
    readonly actualTaskId: string,
    readonly entity: string,
    readonly entityId: string,
  ) {
    super(
      `Görev yalıtımı ihlali: ${entity}#${entityId} görevi ${actualTaskId}, ` +
        `ancak erişim ${requestedTaskId} kapsamında istendi.`,
    );
    this.name = "TaskIsolationError";
  }
}

export function toBool(value: unknown): boolean {
  return value === 1 || value === true;
}

export function fromBool(value: boolean): number {
  return value ? 1 : 0;
}

export function jsonParse<T>(value: string): T {
  return JSON.parse(value) as T;
}

export function jsonStringify(value: unknown): string {
  return JSON.stringify(value);
}
