/**
 * Altyapı sağlayıcıları: kimlik, saat ve özet (hash) üretimi.
 *
 * Alan ve uygulama katmanları bu sağlayıcıları port arayüzleri üzerinden
 * kullanır; böylece testlerde belirlenebilir (deterministik) hâle gelir.
 */
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";

export interface Clock {
  now(): string;
}

export interface IdGenerator {
  next(prefix: string): string;
}

export interface HashProvider {
  sha256File(path: string): Promise<string>;
  sha256Bytes(bytes: Uint8Array): string;
}

export class SystemClock implements Clock {
  now(): string {
    return new Date().toISOString();
  }
}

/** Test için sabit/sıralı saat. */
export class FixedClock implements Clock {
  private tick = 0;
  constructor(private readonly base = "2026-11-15T09:00:00.000Z") {}
  now(): string {
    this.tick += 1;
    const date = new Date(new Date(this.base).getTime() + this.tick * 1000);
    return date.toISOString();
  }
}

export class UuidGenerator implements IdGenerator {
  next(prefix: string): string {
    return `${prefix}-${randomUUID()}`;
  }
}

/** Test için okunabilir ve sıralı kimlik üretir. */
export class SequentialIdGenerator implements IdGenerator {
  private counters = new Map<string, number>();
  next(prefix: string): string {
    const value = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, value);
    return `${prefix}-${String(value).padStart(4, "0")}`;
  }
}

export class NodeHashProvider implements HashProvider {
  async sha256File(path: string): Promise<string> {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    for await (const chunk of stream) {
      hash.update(chunk as Buffer);
    }
    return hash.digest("hex");
  }

  sha256Bytes(bytes: Uint8Array): string {
    return createHash("sha256").update(bytes).digest("hex");
  }
}

export class DeterministicHashProvider implements HashProvider {
  async sha256File(path: string): Promise<string> {
    return this.sha256Bytes(new TextEncoder().encode(path));
  }

  sha256Bytes(bytes: Uint8Array): string {
    const digest = createHash("sha256").update(bytes).digest("hex");
    return digest;
  }
}
