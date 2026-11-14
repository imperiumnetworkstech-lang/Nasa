/**
 * Minimal document-store abstraction with two backends:
 *  - Firestore (Admin SDK) when Firebase credentials are configured;
 *  - a local file-backed store for zero-config demo/local development.
 * Paths mirror the Firestore schema documented in README (e.g. users/{uid}/checkIns/{id}).
 * All access happens server-side after permission checks in lib/permissions.
 */
export type WhereOp = "==" | ">=" | "<=" | "array-contains";
export type Where = [field: string, op: WhereOp, value: unknown];

export interface QueryOptions {
  where?: Where[];
  orderBy?: { field: string; dir: "asc" | "desc" };
  limit?: number;
}

export interface DocStore {
  readonly backend: "firestore" | "local";
  get<T>(path: string): Promise<T | null>;
  list<T>(collectionPath: string, q?: QueryOptions): Promise<T[]>;
  set<T extends object>(path: string, data: T): Promise<void>;
  setMany(entries: { path: string; data: object }[]): Promise<void>;
  update(path: string, patch: Record<string, unknown>): Promise<void>;
  delete(path: string): Promise<void>;
  deleteCollection(collectionPath: string): Promise<void>;
  listCollectionIds(docPath: string): Promise<string[]>;
}

export function newId(prefix = ""): string {
  const rand = globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  return prefix ? `${prefix}_${rand}` : rand;
}

function getField(obj: unknown, field: string): unknown {
  return field.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), obj);
}

function cmp(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  return (a as number | string) < (b as number | string) ? -1 : 1;
}

/** Shared in-memory query evaluation (used by the local store and as a Firestore fallback sort). */
export function applyQuery<T>(docs: T[], q?: QueryOptions): T[] {
  let out = docs;
  for (const [field, op, value] of q?.where ?? []) {
    out = out.filter((d) => {
      const v = getField(d, field);
      switch (op) {
        case "==":
          return v === value;
        case ">=":
          return cmp(v, value) >= 0;
        case "<=":
          return cmp(v, value) <= 0;
        case "array-contains":
          return Array.isArray(v) && v.includes(value);
      }
    });
  }
  if (q?.orderBy) {
    const { field, dir } = q.orderBy;
    out = [...out].sort((a, b) => (dir === "asc" ? 1 : -1) * cmp(getField(a, field), getField(b, field)));
  }
  if (q?.limit) out = out.slice(0, q.limit);
  return out;
}
