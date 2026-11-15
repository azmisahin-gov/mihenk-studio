/**
 * Uygulama bağlamı kurulumu.
 *
 * Kabuk bağımsız çekirdek: veri tabanı, dosya deposu, saat ve kimlik üretimi
 * burada birleştirilir (bkz. ADR-001, ADR-002).
 */
import { mkdirSync } from "node:fs";
import { openDatabase, type Database } from "./db/database.ts";
import { LocalFileStore, type FileStore } from "./fs/fileStore.ts";
import {
  NodeHashProvider,
  SystemClock,
  UuidGenerator,
  type Clock,
  type HashProvider,
  type IdGenerator,
} from "./providers.ts";
import type { AppContext } from "../application/context.ts";

export interface BootstrapOptions {
  /** Veri tabanı yolu veya ":memory:". */
  databasePath: string;
  /** Kaynak dosyaların saklanacağı kök klasör. */
  storageRoot: string;
  clock?: Clock;
  ids?: IdGenerator;
  hash?: HashProvider;
  files?: FileStore;
}

export function bootstrap(options: BootstrapOptions): { ctx: AppContext; db: Database } {
  if (options.storageRoot !== ":memory:" && !options.files) {
    mkdirSync(options.storageRoot, { recursive: true });
  }
  const db = openDatabase({ path: options.databasePath });
  const hash = options.hash ?? new NodeHashProvider();
  const files = options.files ?? new LocalFileStore(options.storageRoot, hash);
  const ctx: AppContext = {
    db,
    clock: options.clock ?? new SystemClock(),
    ids: options.ids ?? new UuidGenerator(),
    hash,
    files,
  };
  return { ctx, db };
}
