"use client";

import { useState } from "react";
import { Eye, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRecordSubmit } from "./use-submit";

interface Card {
  id: string;
  title: string;
  prompt: string;
  answer: string;
  freshness: number;
}

const RESULTS = [
  { k: "forgot", l: "Forgot", cls: "bg-danger-soft text-danger" },
  { k: "hard", l: "Hard", cls: "bg-warn-soft text-warn" },
  { k: "ok", l: "Got it", cls: "bg-primary-soft text-primary" },
  { k: "easy", l: "Easy", cls: "bg-ok-soft text-ok" },
] as const;

/** Flashcard practice: think of the answer, reveal, then say how well you remembered. */
export function SkillPractice({ cards }: { cards: Card[] }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const { submit, busy } = useRecordSubmit("skillReviews");
  const card = cards[i];

  if (!cards.length || !card) {
    return (
      <div className="pop-in flex flex-col items-center gap-2 py-8 text-center">
        <PartyPopper aria-hidden className="h-10 w-10 text-primary" />
        <p className="text-lg font-bold">All fresh!</p>
        <p className="text-sm text-muted">Nothing needs practice right now. Check back in a few days.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Card {i + 1} of {cards.length}
        </span>
        <span>Freshness {card.freshness}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="hero-gradient h-full rounded-full transition-all" style={{ width: `${(i / cards.length) * 100}%` }} />
      </div>
      <div key={card.id} className="pop-in hero-gradient rounded-[var(--radius-card)] p-6 text-white shadow-[var(--shadow-pop)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/75">{card.title}</p>
        <p className="mt-2 text-xl font-bold leading-snug">{card.prompt}</p>
        {shown ? <p className="pop-in mt-4 rounded-2xl bg-white/15 p-4 text-sm leading-relaxed">{card.answer}</p> : null}
      </div>
      {!shown ? (
        <Button size="lg" className="w-full" onClick={() => setShown(true)}>
          <Eye aria-hidden className="h-4 w-4" /> Show answer
        </Button>
      ) : (
        <div className="pop-in space-y-2">
          <p className="text-center text-sm font-medium">How well did you remember?</p>
          <div className="grid grid-cols-4 gap-2">
            {RESULTS.map((r) => (
              <button
                key={r.k}
                disabled={busy}
                onClick={async () => {
                  await submit({ cardId: card.id, result: r.k }, r.k === "forgot" ? "No worries — we'll bring it back soon" : "Nice! Practice saved");
                  setShown(false);
                  setI((x) => x + 1);
                }}
                className={cn("min-h-12 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50", r.cls)}
              >
                {r.l}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
