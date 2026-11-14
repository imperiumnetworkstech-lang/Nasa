"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useRecordSubmit } from "./use-submit";

const FACES = [
  { v: 1, e: "😣", l: "Very low" },
  { v: 2, e: "🙁", l: "Low" },
  { v: 3, e: "😐", l: "Okay" },
  { v: 4, e: "🙂", l: "Good" },
  { v: 5, e: "😄", l: "Very good" },
];

/** One-tap "How are you feeling?" — saved as a private mood entry (not shared by default). */
export function QuickFeeling() {
  const { submit, busy } = useRecordSubmit("moodLogs");
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <div role="group" aria-label="How are you feeling right now?" className="grid grid-cols-5 gap-1.5">
        {FACES.map((f) => (
          <button
            key={f.v}
            disabled={busy}
            aria-pressed={picked === f.v}
            onClick={async () => {
              setPicked(f.v);
              const r = await submit({ mood: f.v, stress: null, shareWithMedical: false }, `Mood saved: ${f.l}`);
              if (r.status === "error") setPicked(null);
            }}
            className={`relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] leading-tight transition-all active:scale-95 disabled:opacity-60 ${picked === f.v ? "hero-gradient scale-105 text-white shadow-[var(--shadow-pop)]" : "bg-surface-2 hover:-translate-y-0.5 hover:bg-primary-soft hover:text-primary"}`}
          >
            {picked === f.v && !busy ? <Check aria-hidden className="absolute right-1.5 top-1.5 h-3 w-3" /> : null}
            <span aria-hidden className="text-2xl">
              {f.e}
            </span>
            <span className="w-full truncate text-center">{f.l}</span>
          </button>
        ))}
      </div>
      <p className="text-center text-[11px] text-muted">Private to you unless you choose to share.</p>
    </div>
  );
}
