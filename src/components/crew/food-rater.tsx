"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useRecordSubmit } from "./use-submit";

const FACES = [
  { v: 1, e: "😖", l: "Didn't like" },
  { v: 2, e: "😕", l: "Meh" },
  { v: 3, e: "😐", l: "OK" },
  { v: 4, e: "🙂", l: "Good" },
  { v: 5, e: "😋", l: "Loved it" },
];
const ATE = [
  ["all", "All of it"],
  ["some", "Some"],
  ["none", "Hardly any"],
] as const;

/** Three taps: what you ate → how it tasted → how much you ate. Works offline. */
export function FoodRater({ items, suggested }: { items: { name: string; emoji: string }[]; suggested: string[] }) {
  const { submit, busy, state } = useRecordSubmit("foodRatings");
  const [item, setItem] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [ate, setAte] = useState<"all" | "some" | "none">("all");
  const [showAll, setShowAll] = useState(false);
  const ordered = [...items].sort((a, b) => Number(suggested.includes(b.name)) - Number(suggested.includes(a.name)));
  const visible = showAll ? ordered : ordered.slice(0, 8);
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">1. What did you eat?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {visible.map((m) => (
            <button
              key={m.name}
              type="button"
              aria-pressed={item === m.name}
              onClick={() => setItem(m.name)}
              className={cn("flex items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs transition-all active:scale-95", item === m.name ? "hero-gradient text-white shadow-[var(--shadow-pop)]" : "bg-surface-2 hover:bg-primary-soft")}
            >
              <span aria-hidden className="text-xl">
                {m.emoji}
              </span>
              <span className="min-w-0 truncate">{m.name}</span>
            </button>
          ))}
        </div>
        {!showAll ? (
          <button type="button" onClick={() => setShowAll(true)} className="mt-2 text-xs font-semibold text-primary">
            Show all {items.length} items
          </button>
        ) : null}
      </div>
      {item ? (
        <div className="pop-in space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">2. How was it?</p>
            <div className="grid grid-cols-5 gap-1.5">
              {FACES.map((f) => (
                <button key={f.v} type="button" aria-pressed={rating === f.v} onClick={() => setRating(f.v)} className={cn("flex min-h-16 flex-col items-center justify-center rounded-2xl text-[10px] transition-all active:scale-95", rating === f.v ? "hero-gradient scale-105 text-white" : "bg-surface-2 hover:bg-primary-soft")}>
                  <span aria-hidden className="text-2xl">
                    {f.e}
                  </span>
                  {f.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">3. How much did you eat?</p>
            <div className="inline-flex rounded-full bg-surface-2 p-1">
              {ATE.map(([k, l]) => (
                <button key={k} type="button" aria-pressed={ate === k} onClick={() => setAte(k)} className={cn("rounded-full px-4 py-1.5 text-sm", ate === k ? "bg-surface font-semibold text-primary shadow-sm" : "text-muted")}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <FormMessage state={state && !state.ok ? state : null} />
          <Button
            loading={busy}
            disabled={!rating}
            onClick={async () => {
              const r = await submit({ item, rating, ate }, `${item} rated — thanks!`);
              if (r.status !== "error") {
                setItem(null);
                setRating(null);
                setAte("all");
              }
            }}
          >
            Save rating
          </Button>
        </div>
      ) : null}
    </div>
  );
}
