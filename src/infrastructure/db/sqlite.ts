/**
 * `node:sqlite` yükleyicisi.
 *
 * Modül, dışa aktarım (export) haritasında bulunmadığı için Vite/tsx altında
 * doğrudan `import` ile çözülemez; `createRequire` üzerinden yüklenir. Bu,
 * yerleşik modülün her iki çalışma ortamında da (Node doğrudan ve vitest)
 * aynı biçimde erişilmesini sağlar.
 */
import { createRequire } from "node:module";

export interface SqliteStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

export interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

export interface SqliteModule {
  DatabaseSync: new (path: string) => SqliteDatabase;
}

const require = createRequire(import.meta.url);

export const sqlite: SqliteModule = require("node:sqlite") as SqliteModule;
