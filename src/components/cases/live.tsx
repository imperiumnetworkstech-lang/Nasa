"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playAlarm } from "@/components/shell/notification-bell";

/** Refreshes server data every few seconds so dashboards stay in sync across tabs. */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}

interface MyCase {
  id: string;
  emoji: string;
  label: string;
  severity: string;
  message: string;
  precautions: string[];
  medicines: { name: string; purpose: string }[];
  medicineStatus: string;
  reviewedBy: string | null;
}

const SEEN = "ak-seen-case";

/**
 * Crew pop-up: when a new problem is detected from their suit (from any device or the scenario
 * console), the crew member immediately gets a pop-up with early precautions and a sound.
 */
export function CrewCaseWatcher() {
  const [c, setC] = useState<MyCase | null>(null);
  const router = useRouter();
  const lastId = useRef<string | null>(null);

  useEffect(() => {
    let stop = false;
    const check = async () => {
      try {
        const res = await fetch("/api/cases/mine", { cache: "no-store" });
        const j = (await res.json()) as { case: MyCase | null };
        if (stop || !j.case) return;
        let seen: string | null = null;
        try {
          seen = localStorage.getItem(SEEN);
        } catch {
          /* ignore */
        }
        if (j.case.id !== seen && j.case.id !== lastId.current) {
          lastId.current = j.case.id;
          playAlarm();
          setC(j.case);
          router.refresh();
        }
      } catch {
        /* offline */
      }
    };
    void check();
    const t = setInterval(check, 5000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [router]);

  if (!c) return null;
  const close = () => {
    try {
      localStorage.setItem(SEEN, c.id);
    } catch {
      /* ignore */
    }
    setC(null);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/60 p-4" role="alertdialog" aria-modal="true" aria-labelledby="case-alert-title">
      <div className="pop-in w-full max-w-md overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-2xl">
        <div className={`flex items-center gap-3 p-5 text-white ${c.severity === "urgent" ? "bg-[#d64545]" : "bg-[#e08a1e]"}`}>
          <AlertTriangle aria-hidden className="h-7 w-7 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/85">Health alert from your suit</p>
            <h2 id="case-alert-title" className="text-xl font-bold">
              {c.emoji} {c.label}
            </h2>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm">{c.message}</p>
          <div>
            <p className="mb-1 text-sm font-bold">Do this now</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {c.precautions.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          {c.medicines.length ? (
            <div className="rounded-2xl bg-surface-2 p-3 text-sm">
              <p className="mb-1 flex items-center gap-1.5 font-semibold">
                <Pill aria-hidden className="h-4 w-4 text-primary" /> Medicine
              </p>
              {c.medicines.map((m) => (
                <p key={m.name}>
                  {m.name} <span className="text-xs text-muted">— {m.purpose}</span>
                </p>
              ))}
              <p className="mt-1 text-xs font-semibold text-ok">Recommended by the health model · use the dose on the kit label</p>
            </div>
          ) : null}
          <p className="text-xs text-muted">Your doctor and commander have been alerted. In an emergency, follow your mission&apos;s emergency procedure.</p>
          <Button className="w-full" size="lg" onClick={close}>
            I understand
          </Button>
        </div>
      </div>
    </div>
  );
}
