/**
 * Test yardımcıları: bellek içi veri tabanı ve sabit sağlayıcılarla bağlam.
 */
import { openDatabase, type Database } from "../../src/infrastructure/db/database.ts";
import { MemoryFileStore } from "../../src/infrastructure/fs/fileStore.ts";
import {
  DeterministicHashProvider,
  FixedClock,
  SequentialIdGenerator,
} from "../../src/infrastructure/providers.ts";
import type { AppContext } from "../../src/application/context.ts";

export interface TestContext {
  ctx: AppContext;
  db: Database;
  close(): void;
}

export function createTestContext(): TestContext {
  const db = openDatabase({ path: ":memory:" });
  const hash = new DeterministicHashProvider();
  const ctx: AppContext = {
    db,
    clock: new FixedClock(),
    ids: new SequentialIdGenerator(),
    hash,
    files: new MemoryFileStore(hash),
  };
  return { ctx, db, close: () => db.close() };
}
