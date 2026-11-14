import fs from "node:fs";
import path from "node:path";
import { applyQuery, type DocStore, type QueryOptions } from "./store";

/**
 * File-backed local store for demo mode / development without Firebase.
 * Data lives in .data/antariksha-local.json (git-ignored). On read-only hosts it falls back to
 * the OS temp dir, and if that fails it keeps data in memory only.
 * NOT intended for production health data — use Firestore with security rules.
 */
type Collections = Record<string, Record<string, Record<string, unknown>>>;

function dataFile(): string {
  if (process.env.LOCAL_DATA_FILE) return process.env.LOCAL_DATA_FILE;
  if (process.env.VERCEL) return path.join("/tmp", "antariksha-local.json");
  return path.join(process.cwd(), ".data", "antariksha-local.json");
}

function splitPath(p: string): { col: string; id: string } {
  const parts = p.split("/").filter(Boolean);
  if (parts.length % 2 !== 0) throw new Error(`Invalid document path: ${p}`);
  return { col: parts.slice(0, -1).join("/"), id: parts[parts.length - 1] };
}

class LocalStore implements DocStore {
  readonly backend = "local" as const;
  private data: Collections = {};
  private saveTimer: NodeJS.Timeout | null = null;
  private persist = true;

  constructor() {
    try {
      const file = dataFile();
      if (fs.existsSync(file)) this.data = JSON.parse(fs.readFileSync(file, "utf8")) as Collections;
    } catch {
      this.data = {};
    }
  }

  private scheduleSave() {
    if (!this.persist) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 150);
  }

  flush() {
    if (!this.persist) return;
    try {
      const file = dataFile();
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(this.data));
    } catch {
      this.persist = false; // read-only filesystem: keep working in memory
    }
  }

  isEmpty() {
    return Object.keys(this.data).length === 0;
  }

  async get<T>(p: string): Promise<T | null> {
    const { col, id } = splitPath(p);
    const doc = this.data[col]?.[id];
    return doc ? (structuredClone(doc) as T) : null;
  }

  async list<T>(collectionPath: string, q?: QueryOptions): Promise<T[]> {
    const docs = Object.values(this.data[collectionPath] ?? {}).map((d) => structuredClone(d) as T);
    return applyQuery(docs, q);
  }

  async set<T extends object>(p: string, data: T): Promise<void> {
    const { col, id } = splitPath(p);
    (this.data[col] ??= {})[id] = structuredClone(data) as Record<string, unknown>;
    this.scheduleSave();
  }

  async setMany(entries: { path: string; data: object }[]): Promise<void> {
    for (const e of entries) {
      const { col, id } = splitPath(e.path);
      (this.data[col] ??= {})[id] = structuredClone(e.data) as Record<string, unknown>;
    }
    this.scheduleSave();
  }

  async update(p: string, patch: Record<string, unknown>): Promise<void> {
    const { col, id } = splitPath(p);
    const existing = this.data[col]?.[id];
    if (!existing) throw new Error(`Document not found: ${p}`);
    this.data[col][id] = { ...existing, ...structuredClone(patch) };
    this.scheduleSave();
  }

  async delete(p: string): Promise<void> {
    const { col, id } = splitPath(p);
    if (this.data[col]) delete this.data[col][id];
    this.scheduleSave();
  }

  async deleteCollection(collectionPath: string): Promise<void> {
    for (const key of Object.keys(this.data)) {
      if (key === collectionPath || key.startsWith(collectionPath + "/")) delete this.data[key];
    }
    this.scheduleSave();
  }

  async listCollectionIds(docPath: string): Promise<string[]> {
    const prefix = docPath + "/";
    return Object.keys(this.data)
      .filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes("/"))
      .map((k) => k.slice(prefix.length));
  }

  async reset(): Promise<void> {
    this.data = {};
    this.scheduleSave();
  }
}

const g = globalThis as unknown as { __antarikshaLocalStore?: LocalStore };
export function getLocalStore(): LocalStore {
  return (g.__antarikshaLocalStore ??= new LocalStore());
}
export type { LocalStore };
