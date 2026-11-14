import "server-only";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { isDemoEnabled } from "@/lib/config";
import type { DocStore } from "./store";
import { getLocalStore } from "./local-store";
import { FirestoreStore } from "./firestore-store";
import { seedDemoData } from "./seed";

let firestore: FirestoreStore | null = null;
const g = globalThis as unknown as { __antarikshaSeeding?: Promise<void> };

/**
 * Returns the active data backend. Firestore when Firebase Admin credentials exist; otherwise
 * the local file store, which is auto-seeded with clearly-labelled synthetic demo data.
 */
export async function getStore(): Promise<DocStore> {
  if (isAdminConfigured()) return (firestore ??= new FirestoreStore());
  const local = getLocalStore();
  if (local.isEmpty() && isDemoEnabled()) {
    g.__antarikshaSeeding ??= seedDemoData(local, new Date()).then(() => local.flush());
    await g.__antarikshaSeeding;
  }
  return local;
}

export function backendName(): "firestore" | "local" {
  return isAdminConfigured() ? "firestore" : "local";
}
