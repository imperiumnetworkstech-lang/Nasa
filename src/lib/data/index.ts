import "server-only";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { isDemoEnabled } from "@/lib/config";
import type { DocStore } from "./store";
import { getLocalStore } from "./local-store";
import { FirestoreStore } from "./firestore-store";
import { RedisStore, isRedisConfigured } from "./redis-store";
import { seedDemoData } from "./seed";

let firestore: FirestoreStore | null = null;
let redis: RedisStore | null = null;
const g = globalThis as unknown as { __antarikshaSeeding?: Promise<void>; __antarikshaRedisReady?: Promise<void> };

/**
 * Returns the active data backend:
 *  - Firestore only when switched on (USE_FIREBASE=true + keys);
 *  - Redis (Upstash) when its REST URL/token are set — shared by every server instance, so
 *    alerts travel between PCs on the Vercel link;
 *  - otherwise the local file store (single machine).
 * Redis and local are auto-seeded with clearly-labelled synthetic demo data.
 */
export async function getStore(): Promise<DocStore> {
  if (isAdminConfigured()) return (firestore ??= new FirestoreStore());
  if (isRedisConfigured()) {
    const r = (redis ??= new RedisStore());
    g.__antarikshaRedisReady ??= ensureRedisSeeded(r).catch((e) => {
      g.__antarikshaRedisReady = undefined;
      throw e;
    });
    await g.__antarikshaRedisReady;
    return r;
  }
  const local = getLocalStore();
  if (local.isEmpty() && isDemoEnabled()) {
    g.__antarikshaSeeding ??= seedDemoData(local, new Date()).then(() => local.flush());
    await g.__antarikshaSeeding;
  }
  return local;
}

async function ensureRedisSeeded(r: RedisStore) {
  if (await r.isSeeded()) return;
  if (!isDemoEnabled()) return;
  if (await r.tryLockSeed()) {
    await seedDemoData(r, new Date());
    await r.markSeeded();
    return;
  }
  // Another instance is seeding: wait for it (up to ~60 s).
  for (let i = 0; i < 60; i++) {
    await new Promise((res) => setTimeout(res, 1000));
    if (await r.isSeeded()) return;
  }
}

export function backendName(): "firestore" | "redis" | "local" {
  return isAdminConfigured() ? "firestore" : isRedisConfigured() ? "redis" : "local";
}
