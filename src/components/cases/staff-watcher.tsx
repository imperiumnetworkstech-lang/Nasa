"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Volume2 } from "lucide-react";
import { installAudioUnlock, isAudioUnlocked, onAudioUnlockChange, playAlarm, stopAlarm, unlockAudio } from "@/components/shell/sound";
import { Button } from "@/components/ui/button";

interface Active {
  id: string;
  crewName: string;
  label: string;
  emoji: string;
  severity: string;
  expected?: boolean;
  message: string;
}

const SEEN = "ak-staff-seen-cases";

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
function saveSeen(s: Set<string>) {
  try {
    sessionStorage.setItem(SEEN, JSON.stringify([...s].slice(-200)));
  } catch {
    /* ignore */
  }
}

/**
 * Live sync for the doctor and commander portals (mounted in their layouts, so it works on
 * every page). Polls a tiny endpoint every 2 s, refreshes the page only when a case changes,
 * and sounds the emergency siren + shows a banner for each NEW active case.
 */
export function StaffCaseWatcher() {
  const router = useRouter();
  const version = useRef<string | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const [alert, setAlert] = useState<Active[]>([]);
  const [unlocked, setUnlocked] = useState(true);

  useEffect(() => {
    installAudioUnlock();
    const t = setTimeout(() => setUnlocked(isAudioUnlocked()), 0);
    const off = onAudioUnlockChange(setUnlocked);
    return () => {
      clearTimeout(t);
      off();
    };
  }, []);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/cases/pulse", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { version: string; active: Active[] };
        if (stop) return;
        if (seen.current === null) {
          // First load: everything already open counts as seen (no siren on page load).
          seen.current = loadSeen();
          if (seen.current.size === 0) j.active.forEach((a) => seen.current!.add(a.id));
          saveSeen(seen.current);
        }
        // Expected findings (e.g. high heart rate during a scheduled workout) never sound the siren.
        const fresh = j.active.filter((a) => !seen.current!.has(a.id) && !a.expected);
        j.active.filter((a) => a.expected).forEach((a) => seen.current!.add(a.id));
        if (fresh.length) {
          fresh.forEach((a) => seen.current!.add(a.id));
          saveSeen(seen.current);
          setAlert((prev) => [...fresh, ...prev].slice(0, 4));
          playAlarm();
        }
        if (version.current !== null && version.current !== j.version) router.refresh();
        version.current = j.version;
      } catch {
        /* offline — next tick */
      }
    };
    void tick();
    const t = setInterval(tick, 2000);
    return () => {
      stop = true;
      clearInterval(t);
      stopAlarm();
    };
  }, [router]);

  return (
    <>
      {!unlocked ? (
        <button
          onClick={() => void unlockAudio()}
          className="pop-in fixed inset-x-4 bottom-24 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full bg-[#d64545] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-[var(--shadow-pop)] lg:bottom-6"
        >
          <Volume2 aria-hidden className="h-4 w-4" /> Tap to turn on emergency alarm sound
        </button>
      ) : null}
      {alert.length ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/60 p-4" role="alertdialog" aria-modal="true" aria-labelledby="staff-alert-title">
          <div className="pop-in w-full max-w-md overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-2xl">
            <div className="flex items-center gap-3 bg-[#d64545] p-5 text-white">
              <BellRing aria-hidden className="h-7 w-7 shrink-0 animate-[wiggle_1s_ease-in-out_infinite]" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/85">Emergency — crew health alert</p>
                <h2 id="staff-alert-title" className="text-xl font-bold">
                  {alert.length === 1 ? `${alert[0].emoji} ${alert[0].crewName}` : `${alert.length} new cases`}
                </h2>
              </div>
            </div>
            <div className="space-y-3 p-5">
              {alert.map((a) => (
                <div key={a.id} className="rounded-2xl bg-surface-2 p-3 text-sm">
                  <p className="font-bold">
                    {a.emoji} {a.crewName}: {a.label}
                  </p>
                  <p className="text-muted">{a.message}</p>
                </div>
              ))}
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  stopAlarm();
                  setAlert([]);
                  router.refresh();
                }}
              >
                Acknowledge & view case
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
