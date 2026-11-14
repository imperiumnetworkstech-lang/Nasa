"use client";

import { CloudOff, CloudUpload, RefreshCw, Wifi } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { flushQueue, getLastSync, getQueue, onQueueChange } from "@/lib/offline/queue";
import { relativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Persistent but unobtrusive connectivity + offline-queue indicator. */
export function SyncStatus({ commDelaySeconds }: { commDelaySeconds: number }) {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const queued = useSyncExternalStore(onQueueChange, () => getQueue().length, () => 0);
  const lastSync = useSyncExternalStore(onQueueChange, getLastSync, () => null);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  const router = useRouter();

  const sync = useCallback(async () => {
    setBusy(true);
    const r = await flushQueue();
    setBusy(false);
    if (r && r.synced) router.refresh();
  }, [router]);

  useEffect(() => {
    if (!online || queued === 0) return;
    const t = setTimeout(() => void sync(), 0);
    return () => clearTimeout(t);
  }, [online, queued, sync]);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs" aria-live="polite">
      {online ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-1 text-muted" title={lastSync ? `Last successful sync ${new Date(lastSync).toLocaleString()}` : "No sync yet on this device"}>
          <Wifi aria-hidden className="h-3.5 w-3.5 text-ok" />
          <span className="hidden sm:inline">Online · synced {relativeTime(lastSync)}</span>
          <span className="sm:hidden">Online</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-warn/30 bg-warn-soft px-2 py-1 font-medium text-warn">
          <CloudOff aria-hidden className="h-3.5 w-3.5" /> Offline
        </span>
      )}
      {queued > 0 ? (
        <Link href="/app/crew/history#queued" className="inline-flex items-center gap-1 rounded-full border border-warn/30 bg-warn-soft px-2 py-1 font-medium text-warn">
          <CloudUpload aria-hidden className="h-3.5 w-3.5" /> {queued} queued — not sent
        </Link>
      ) : null}
      {queued > 0 && online ? (
        <button onClick={sync} disabled={busy} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-primary hover:bg-surface-2" aria-label="Sync queued entries now">
          <RefreshCw aria-hidden className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Sync
        </button>
      ) : null}
      {commDelaySeconds > 0 ? (
        <span className="hidden items-center gap-1 rounded-full border border-primary/20 bg-primary-soft px-2 py-1 text-primary md:inline-flex" title="Simulated one-way communication delay configured by an administrator">
          Comm delay {Math.round(commDelaySeconds / 60)} min (simulated)
        </span>
      ) : null}
    </div>
  );
}
