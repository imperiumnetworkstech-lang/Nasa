"use client";

import { useSyncExternalStore } from "react";
import { CloudUpload } from "lucide-react";
import { discardQueued, flushQueue, getQueue, onQueueChange, type QueueItem } from "@/lib/offline/queue";
import { Button } from "@/components/ui/button";

let cache: QueueItem[] = [];
let cacheKey = "";
function snapshot() {
  const q = getQueue();
  const k = JSON.stringify(q);
  if (k !== cacheKey) {
    cacheKey = k;
    cache = q;
  }
  return cache;
}
const EMPTY: QueueItem[] = [];

/** Shows entries saved on this device that have NOT been sent yet. */
export function QueuedList() {
  const items = useSyncExternalStore(onQueueChange, snapshot, () => EMPTY);
  if (!items.length) return <p className="text-sm text-muted">Nothing waiting on this device. Everything you entered has been sent.</p>;
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.clientId} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-warn/30 bg-warn-soft px-4 py-2.5 text-sm">
            <span className="flex items-center gap-2">
              <CloudUpload aria-hidden className="h-4 w-4 text-warn" />
              <span>
                <strong>{i.kind}</strong> — Queued, not sent
                <span className="block text-xs text-muted">Saved {new Date(i.queuedAt).toLocaleString()}</span>
                {i.error ? <span className="block text-xs text-danger">Rejected by server: {i.error}</span> : null}
              </span>
            </span>
            <Button size="sm" variant="outline" onClick={() => discardQueued(i.clientId)}>
              Discard
            </Button>
          </li>
        ))}
      </ul>
      <Button size="sm" onClick={() => flushQueue()}>
        Try sending now
      </Button>
    </div>
  );
}
