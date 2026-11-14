"use client";

/**
 * Client-side offline queue for NON-EMERGENCY entries (check-ins, hydration, sleep, mood,
 * activity, meals). Items stay visibly "Queued — not sent" until the server confirms them.
 * Symptom reports and messages are never queued: the UI must not imply delivery.
 */
export const QUEUEABLE = ["checkIns", "hydrationLogs", "sleepLogs", "moodLogs", "activityLogs", "mealLogs", "foodRatings", "skillReviews"] as const;
export type QueueKind = (typeof QUEUEABLE)[number];

export interface QueueItem {
  clientId: string;
  kind: QueueKind;
  data: unknown;
  queuedAt: string;
  error?: string;
}

const KEY = "ak-offline-queue";
const SYNC_KEY = "ak-last-sync";
const EVT = "ak-queue-changed";

function read(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QueueItem[];
  } catch {
    return [];
  }
}
function write(items: QueueItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(EVT));
}

export function newClientId() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function getQueue(): QueueItem[] {
  return typeof window === "undefined" ? [] : read();
}

export function enqueue(kind: QueueKind, data: unknown, clientId = newClientId()): QueueItem {
  const item: QueueItem = { clientId, kind, data, queuedAt: new Date().toISOString() };
  write([...read(), item]);
  return item;
}

export function getLastSync(): string | null {
  try {
    return localStorage.getItem(SYNC_KEY);
  } catch {
    return null;
  }
}
export function setLastSync(iso: string) {
  try {
    localStorage.setItem(SYNC_KEY, iso);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVT));
}

export function onQueueChange(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

let flushing = false;
/** Sends queued items. Synced and duplicate items are removed; rejected items stay with an error. */
export async function flushQueue(): Promise<{ synced: number; failed: number } | null> {
  if (flushing || !navigator.onLine) return null;
  const items = read();
  if (!items.length) return { synced: 0, failed: 0 };
  flushing = true;
  try {
    const res = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items }) });
    if (!res.ok) return null;
    const json = (await res.json()) as { results: { clientId: string; status: string; error?: string }[]; syncedAt: string };
    const byId = new Map(json.results.map((r) => [r.clientId, r]));
    const remaining = read()
      .filter((i) => {
        const r = byId.get(i.clientId);
        return !r || r.status === "rejected";
      })
      .map((i) => (byId.get(i.clientId)?.error ? { ...i, error: byId.get(i.clientId)!.error } : i));
    write(remaining);
    setLastSync(json.syncedAt);
    return { synced: json.results.filter((r) => r.status !== "rejected").length, failed: json.results.filter((r) => r.status === "rejected").length };
  } catch {
    return null;
  } finally {
    flushing = false;
  }
}

export function discardQueued(clientId: string) {
  write(read().filter((i) => i.clientId !== clientId));
}

export type SubmitOutcome =
  | { status: "saved"; id: string; newAlerts: number; extra?: Record<string, unknown> }
  | { status: "queued"; clientId: string }
  | { status: "error"; error: string; fieldErrors?: Record<string, string> };

/** Submit a personal record; queues it locally when offline and the kind allows it. */
export async function submitRecord(kind: string, data: unknown): Promise<SubmitOutcome> {
  const clientId = newClientId();
  const queueable = (QUEUEABLE as readonly string[]).includes(kind);
  if (!navigator.onLine) {
    if (queueable) {
      enqueue(kind as QueueKind, data, clientId);
      return { status: "queued", clientId };
    }
    return { status: "error", error: "You are offline. This entry has NOT been sent and cannot be queued. If this is urgent, use your mission's emergency procedure now." };
  }
  try {
    const res = await fetch("/api/records", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, data, clientId }) });
    const json = (await res.json()) as { ok: boolean; id?: string; error?: string; newAlerts?: number; fieldErrors?: Record<string, string>; extra?: Record<string, unknown> };
    if (json.ok && json.id) {
      setLastSync(new Date().toISOString());
      return { status: "saved", id: json.id, newAlerts: json.newAlerts ?? 0, extra: json.extra };
    }
    return { status: "error", error: json.error ?? "Could not save", fieldErrors: json.fieldErrors };
  } catch {
    if (queueable) {
      enqueue(kind as QueueKind, data, clientId);
      return { status: "queued", clientId };
    }
    return { status: "error", error: "Connection failed. This entry has NOT been sent. If this is urgent, use your mission's emergency procedure now." };
  }
}
