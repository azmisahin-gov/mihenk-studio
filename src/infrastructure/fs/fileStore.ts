/**
 * Özgün dosya deposu.
 *
 * Kaynak dosyalar görev klasöründe değişmez tutulur. Adlandırma çakışması
 * olsa bile özgün ad kayıt altında korunur (bkz. MIH-REQ-MAT-002).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

export interface StoredFile {
  storedName: string;
  absolutePath: string;
  sizeBytes: number;
  sha256: string;
}

export interface FileStore {
  store(taskId: string, sourcePath: string, originalName?: string): Promise<StoredFile>;
  storeBytes(taskId: string, originalName: string, bytes: Uint8Array, mimeType: string): StoredFile;
  pathFor(taskId: string, storedName: string): string;
  exists(taskId: string, storedName: string): boolean;
}

export class LocalFileStore implements FileStore {
  constructor(
    private readonly root: string,
    private readonly hash: { sha256File(path: string): Promise<string>; sha256Bytes(bytes: Uint8Array): string },
  ) {}

  private taskDir(taskId: string): string {
    const dir = resolve(this.root, taskId);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  async store(taskId: string, sourcePath: string, originalName?: string): Promise<StoredFile> {
    const dir = this.taskDir(taskId);
    const name = basename(originalName ?? sourcePath);
    const storedName = this.uniqueName(dir, name);
    const target = join(dir, storedName);
    copyFileSync(sourcePath, target);
    const sha256 = await this.hash.sha256File(target);
    return { storedName, absolutePath: target, sizeBytes: statSync(target).size, sha256 };
  }

  storeBytes(taskId: string, originalName: string, bytes: Uint8Array, _mimeType: string): StoredFile {
    const dir = this.taskDir(taskId);
    const storedName = this.uniqueName(dir, originalName);
    const target = join(dir, storedName);
    writeFileSync(target, bytes);
    const sha256 = this.hash.sha256Bytes(bytes);
    return { storedName, absolutePath: target, sizeBytes: bytes.byteLength, sha256 };
  }

  pathFor(taskId: string, storedName: string): string {
    return join(resolve(this.root, taskId), storedName);
  }

  exists(taskId: string, storedName: string): boolean {
    return existsSync(this.pathFor(taskId, storedName));
  }

  read(taskId: string, storedName: string): Uint8Array {
    return new Uint8Array(readFileSync(this.pathFor(taskId, storedName)));
  }

  private uniqueName(dir: string, name: string): string {
    let candidate = name;
    let counter = 1;
    while (existsSync(join(dir, candidate))) {
      const dot = name.lastIndexOf(".");
      const stem = dot > 0 ? name.slice(0, dot) : name;
      const extension = dot > 0 ? name.slice(dot) : "";
      candidate = `${stem}-surum-${counter}${extension}`;
      counter += 1;
    }
    return candidate;
  }
}

/** Test için bellek içi dosya deposu. */
export class MemoryFileStore implements FileStore {
  private readonly files = new Map<string, Uint8Array>();

  constructor(private readonly hash: { sha256Bytes(bytes: Uint8Array): string }) {}

  async store(taskId: string, sourcePath: string, originalName?: string): Promise<StoredFile> {
    const bytes = new Uint8Array(readFileSync(sourcePath));
    return this.storeBytes(taskId, basename(originalName ?? sourcePath), bytes, "application/octet-stream");
  }

  storeBytes(taskId: string, originalName: string, bytes: Uint8Array, _mimeType: string): StoredFile {
    const key = `${taskId}/${originalName}`;
    this.files.set(key, bytes);
    return {
      storedName: originalName,
      absolutePath: key,
      sizeBytes: bytes.byteLength,
      sha256: this.hash.sha256Bytes(bytes),
    };
  }

  pathFor(taskId: string, storedName: string): string {
    return `${taskId}/${storedName}`;
  }

  exists(taskId: string, storedName: string): boolean {
    return this.files.has(this.pathFor(taskId, storedName));
  }

  read(taskId: string, storedName: string): Uint8Array {
    const value = this.files.get(this.pathFor(taskId, storedName));
    if (!value) throw new Error(`Dosya bulunamadı: ${taskId}/${storedName}`);
    return value;
  }
}
