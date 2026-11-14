"use client";

import { FormMessage } from "@/components/ui/form";
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
  const { submit, busy, state } = useRecordSubmit("moodLogs");
  return (
    <div className="space-y-3">
      <div role="group" aria-label="How are you feeling right now?" className="grid grid-cols-5 gap-1.5">
        {FACES.map((f) => (
          <button
            key={f.v}
            disabled={busy}
            onClick={() => submit({ mood: f.v, stress: null, shareWithMedical: false }, `Logged “${f.l}”. Private to you unless you share it.`)}
            className="flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-surface-2 px-1 text-[10px] leading-tight hover:bg-primary-soft hover:text-primary disabled:opacity-50"
          >
            <span aria-hidden className="text-2xl">
              {f.e}
            </span>
            <span className="w-full truncate text-center">{f.l}</span>
          </button>
        ))}
      </div>
      <FormMessage state={state} />
    </div>
  );
}
