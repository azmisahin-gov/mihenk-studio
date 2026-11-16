/**
 * SQLite bağlantı kurulumu (bkz. ADR-003).
 *
 * Node'un yerleşik `node:sqlite` modülü kullanılır; harici bağımlılık yoktur.
 * Şema uygulanır ve sürüm kaydedilir.
 */
import { sqlite, type SqliteDatabase } from "./sqlite.ts";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema.ts";

export type Database = SqliteDatabase;

export interface OpenDatabaseOptions {
  /** Dosya yolu veya ":memory:". */
  path: string;
}

export function openDatabase(options: OpenDatabaseOptions): Database {
  if (options.path !== ":memory:") {
    mkdirSync(dirname(options.path), { recursive: true });
  }
  const db = new sqlite.DatabaseSync(options.path);
  db.exec("PRAGMA foreign_keys = ON;");
  if (options.path !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL;");
  }
  db.exec(SCHEMA_SQL);
  const current = db
    .prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'")
    .get() as { value?: string } | undefined;
  if (!current) {
    db.prepare("INSERT INTO schema_meta (key, value) VALUES ('schema_version', ?)").run(
      String(SCHEMA_VERSION),
    );
  } else if (Number(current.value) !== SCHEMA_VERSION) {
    throw new Error(
      `Şema sürümü uyuşmuyor: beklenen ${SCHEMA_VERSION}, bulunan ${current.value}. ` +
        "Veri tabanı dosyasını yedekleyip yeniden oluşturun.",
    );
  }
  return db;
}

export function closeDatabase(db: Database): void {
  db.close();
}
