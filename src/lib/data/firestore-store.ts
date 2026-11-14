import "server-only";
import type { Firestore, Query } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { applyQuery, type DocStore, type QueryOptions } from "./store";

/** Firestore implementation of DocStore using the Admin SDK (server-side only). */
export class FirestoreStore implements DocStore {
  readonly backend = "firestore" as const;
  private get db(): Firestore {
    return adminDb();
  }

  async get<T>(path: string): Promise<T | null> {
    const snap = await this.db.doc(path).get();
    return snap.exists ? (snap.data() as T) : null;
  }

  async list<T>(collectionPath: string, q?: QueryOptions): Promise<T[]> {
    let ref: Query = this.db.collection(collectionPath);
    for (const [field, op, value] of q?.where ?? []) ref = ref.where(field, op, value);
    // Firestore needs composite indexes for where+orderBy on different fields; to keep the demo
    // index-free we only push orderBy/limit down when there are no where clauses.
    const pushDown = !q?.where?.length;
    if (pushDown && q?.orderBy) ref = ref.orderBy(q.orderBy.field, q.orderBy.dir);
    if (pushDown && q?.limit) ref = ref.limit(q.limit);
    const snap = await ref.get();
    const docs = snap.docs.map((d) => d.data() as T);
    return pushDown ? docs : applyQuery(docs, { orderBy: q?.orderBy, limit: q?.limit });
  }

  async set<T extends object>(path: string, data: T): Promise<void> {
    await this.db.doc(path).set(stripUndefined(data));
  }

  async setMany(entries: { path: string; data: object }[]): Promise<void> {
    for (let i = 0; i < entries.length; i += 450) {
      const batch = this.db.batch();
      for (const e of entries.slice(i, i + 450)) batch.set(this.db.doc(e.path), stripUndefined(e.data));
      await batch.commit();
    }
  }

  async update(path: string, patch: Record<string, unknown>): Promise<void> {
    await this.db.doc(path).update(stripUndefined(patch));
  }

  async delete(path: string): Promise<void> {
    await this.db.doc(path).delete();
  }

  async deleteCollection(collectionPath: string): Promise<void> {
    await this.db.recursiveDelete(this.db.collection(collectionPath));
  }

  async listCollectionIds(docPath: string): Promise<string[]> {
    const cols = await this.db.doc(docPath).listCollections();
    return cols.map((c) => c.id);
  }
}

function stripUndefined<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}
