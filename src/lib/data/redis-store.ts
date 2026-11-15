import "server-only";
import { applyQuery, type DocStore, type QueryOptions } from "./store";

/**
 * Shared store on Upstash Redis (REST API, no SDK). Every server instance — and therefore every
 * PC using the Vercel link — reads and writes the same data, so alerts reach other devices.
 *
 * Layout: one Redis hash per collection (key "c:<collectionPath>", field = doc id, value = JSON),
 * plus a set "cols" of all collection paths (for listing sub-collections). A list is ONE command
 * (HGETALL), so pages stay cheap.
 */
const URL_ = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export function isRedisConfigured() {
  return Boolean(URL_() && TOKEN());
}

type Cmd = (string | number)[];

async function call<T = unknown>(cmd: Cmd): Promise<T> {
  const res = await fetch(URL_(), { method: "POST", headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd), cache: "no-store" });
  const j = (await res.json()) as { result?: T; error?: string };
  if (!res.ok || j.error) throw new Error(`Redis ${String(cmd[0])} failed: ${j.error ?? res.status}`);
  return j.result as T;
}

async function pipeline(cmds: Cmd[]): Promise<unknown[]> {
  const out: unknown[] = [];
  // Keep each request comfortably under the REST size limit.
  let batch: Cmd[] = [];
  let size = 0;
  const flush = async () => {
    if (!batch.length) return;
    const res = await fetch(`${URL_()}/pipeline`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" }, body: JSON.stringify(batch), cache: "no-store" });
    const j = (await res.json()) as { result?: unknown; error?: string }[];
    if (!res.ok || !Array.isArray(j)) throw new Error(`Redis pipeline failed: ${res.status}`);
    for (const r of j) {
      if (r.error) throw new Error(`Redis pipeline command failed: ${r.error}`);
      out.push(r.result);
    }
    batch = [];
    size = 0;
  };
  for (const c of cmds) {
    const n = JSON.stringify(c).length;
    if (size + n > 400_000 || batch.length >= 500) await flush();
    batch.push(c);
    size += n;
  }
  await flush();
  return out;
}

function splitPath(p: string) {
  const parts = p.split("/").filter(Boolean);
  return { col: parts.slice(0, -1).join("/"), id: parts[parts.length - 1] };
}
const key = (col: string) => `c:${col}`;

export class RedisStore implements DocStore {
  readonly backend = "redis" as const;

  async get<T>(p: string): Promise<T | null> {
    const { col, id } = splitPath(p);
    const v = await call<string | null>(["HGET", key(col), id]);
    return v ? (JSON.parse(v) as T) : null;
  }

  async list<T>(collectionPath: string, q?: QueryOptions): Promise<T[]> {
    const flat = await call<string[] | null>(["HGETALL", key(collectionPath)]);
    const docs: T[] = [];
    if (flat) for (let i = 1; i < flat.length; i += 2) docs.push(JSON.parse(flat[i]) as T);
    return applyQuery(docs, q);
  }

  async set<T extends object>(p: string, data: T): Promise<void> {
    const { col, id } = splitPath(p);
    await pipeline([["HSET", key(col), id, JSON.stringify(data)], ["SADD", "cols", col]]);
  }

  async setMany(entries: { path: string; data: object }[]): Promise<void> {
    const byCol = new Map<string, (string | number)[]>();
    for (const e of entries) {
      const { col, id } = splitPath(e.path);
      const arr = byCol.get(col) ?? [];
      arr.push(id, JSON.stringify(e.data));
      byCol.set(col, arr);
    }
    const cmds: Cmd[] = [];
    for (const [col, fv] of byCol) {
      for (let i = 0; i < fv.length; i += 200) cmds.push(["HSET", key(col), ...fv.slice(i, i + 200)]);
    }
    cmds.push(["SADD", "cols", ...byCol.keys()]);
    await pipeline(cmds);
  }

  async update(p: string, patch: Record<string, unknown>): Promise<void> {
    const existing = await this.get<Record<string, unknown>>(p);
    if (!existing) throw new Error(`Document not found: ${p}`);
    await this.set(p, { ...existing, ...patch });
  }

  async delete(p: string): Promise<void> {
    const { col, id } = splitPath(p);
    await call(["HDEL", key(col), id]);
  }

  async deleteCollection(collectionPath: string): Promise<void> {
    const cols = (await call<string[]>(["SMEMBERS", "cols"])) ?? [];
    const doomed = cols.filter((c) => c === collectionPath || c.startsWith(collectionPath + "/"));
    if (!doomed.length) return;
    await pipeline([["DEL", ...doomed.map(key)], ["SREM", "cols", ...doomed]]);
  }

  async listCollectionIds(docPath: string): Promise<string[]> {
    const prefix = docPath + "/";
    const cols = (await call<string[]>(["SMEMBERS", "cols"])) ?? [];
    return cols.filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes("/")).map((k) => k.slice(prefix.length));
  }

  /** True once demo data has been loaded into this database. */
  async isSeeded() {
    return (await call<string | null>(["GET", "seeded"])) === "1";
  }
  /** Only one server instance seeds; the others wait for it. */
  async tryLockSeed() {
    return (await call<string | null>(["SET", "seed-lock", "1", "NX", "EX", "120"])) === "OK";
  }
  async markSeeded() {
    await call(["SET", "seeded", "1"]);
  }
}
