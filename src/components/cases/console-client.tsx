"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScenarioGrid, type ScenarioCard } from "./scenario-grid";

/** Scenario console: choose an astronaut, then tap a scenario. */
export function ConsoleClient({ crew, scenarios }: { crew: { uid: string; name: string; callSign: string }[]; scenarios: ScenarioCard[] }) {
  const [uid, setUid] = useState(crew[0]?.uid ?? "");
  const chosen = crew.find((c) => c.uid === uid);
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold">1. Choose an astronaut</p>
        <div role="radiogroup" aria-label="Astronaut" className="flex flex-wrap gap-2">
          {crew.map((c) => (
            <button
              key={c.uid}
              role="radio"
              aria-checked={uid === c.uid}
              onClick={() => setUid(c.uid)}
              className={cn("flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm transition-all active:scale-95", uid === c.uid ? "hero-gradient font-semibold text-white shadow-[var(--shadow-pop)]" : "bg-surface shadow-[var(--shadow-card)] hover:bg-primary-soft")}
            >
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold", uid === c.uid ? "bg-white/25" : "bg-primary-soft text-primary")}>{c.callSign.slice(0, 2).toUpperCase()}</span>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">2. Send a suit scenario for {chosen?.name ?? "…"}</p>
        <ScenarioGrid scenarios={scenarios} crewUid={uid} mode="console" />
      </div>
    </div>
  );
}
