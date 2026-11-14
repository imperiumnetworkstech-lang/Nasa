"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Inbox, Radio, Satellite, Stethoscope } from "lucide-react";
import { questionStage } from "@/lib/questions/eta";
import { cn } from "@/lib/utils";

function countdown(ms: number) {
  if (ms <= 0) return "now";
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : m ? `${m} min ${s.toString().padStart(2, "0")} s` : `${s} s`;
}

const STEPS = [
  { key: "waiting-window", label: "Waiting for link", icon: Clock },
  { key: "travelling", label: "Travelling to Earth", icon: Satellite },
  { key: "with-doctor", label: "With your doctor", icon: Stethoscope },
  { key: "reply-travelling", label: "Reply on its way", icon: Radio },
  { key: "answered", label: "Answer here", icon: Inbox },
] as const;

/**
 * Live journey of a store-and-forward question. Ticks every second so crew can see honest
 * light-delay countdowns instead of wondering whether anyone got the message.
 */
export function QuestionTracker({ q }: { q: { sendAt: string; arriveAt: string; answer: { arriveAt: string } | null } }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const stage = questionStage(q, now);
  // When the reply physically "arrives", reload so the answer text appears without a manual refresh.
  const router = useRouter();
  const prev = useRef(stage);
  useEffect(() => {
    if (prev.current !== stage && (stage === "answered" || stage === "with-doctor")) router.refresh();
    prev.current = stage;
  }, [stage, router]);
  const idx = STEPS.findIndex((s) => s.key === stage);
  const hint =
    stage === "waiting-window"
      ? `Leaves in ${countdown(Date.parse(q.sendAt) - now)}`
      : stage === "travelling"
        ? `Reaches Earth in ${countdown(Date.parse(q.arriveAt) - now)}`
        : stage === "with-doctor"
          ? "Your doctor can read it now"
          : stage === "reply-travelling"
            ? `Reply arrives in ${countdown(Date.parse(q.answer!.arriveAt) - now)}`
            : "Your answer has arrived";
  return (
    <div className="space-y-2">
      <ol className="flex items-center gap-1" aria-label={`Status: ${STEPS[idx].label}`}>
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex flex-1 items-center gap-1">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
                i < idx ? "bg-ok-soft text-ok" : i === idx ? "hero-gradient text-white shadow-[var(--shadow-pop)]" : "bg-surface-2 text-muted",
                i === idx && stage !== "answered" && "animate-pulse motion-reduce:animate-none",
              )}
              title={s.label}
            >
              {i < idx ? <CheckCircle2 aria-hidden className="h-4 w-4" /> : <s.icon aria-hidden className="h-4 w-4" />}
            </span>
            {i < STEPS.length - 1 ? <span className={cn("h-0.5 flex-1 rounded-full", i < idx ? "bg-ok" : "bg-line")} /> : null}
          </li>
        ))}
      </ol>
      <p className="text-xs font-medium text-primary" aria-live="polite" suppressHydrationWarning>
        {STEPS[idx].label} · {hint}
      </p>
    </div>
  );
}
