"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const PHASES = ["Breathe in", "Hold", "Breathe out", "Hold"];

/** Paced (box) breathing guide with an always-visible Stop. Respects reduced motion. */
export function BreathingExercise() {
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const phase = PHASES[Math.floor(t / 4) % 4];
  const count = 4 - (t % 4);
  const scale = phase === "Breathe in" ? 0.6 + ((t % 4) + 1) * 0.1 : phase === "Breathe out" ? 1 - ((t % 4) + 1) * 0.1 : phase === "Hold" && Math.floor(t / 4) % 4 === 1 ? 1 : 0.6;
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="relative flex h-40 w-40 items-center justify-center">
        <div className="hero-gradient absolute inset-0 rounded-full opacity-20" />
        <div className="hero-gradient flex items-center justify-center rounded-full text-white shadow-[var(--shadow-pop)] transition-all duration-1000 motion-reduce:transition-none" style={{ width: `${(running ? scale : 0.7) * 100}%`, height: `${(running ? scale : 0.7) * 100}%` }}>
          <span className="text-center text-sm font-semibold" aria-live="polite">
            {running ? (
              <>
                {phase}
                <br />
                {count}
              </>
            ) : (
              "Ready"
            )}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        {running ? (
          <Button variant="outline" onClick={() => setRunning(false)}>
            Stop
          </Button>
        ) : (
          <Button
            onClick={() => {
              setT(0);
              setRunning(true);
            }}
          >
            Start 4-4-4-4 breathing
          </Button>
        )}
      </div>
      <p className="max-w-xs text-center text-xs text-muted">Stop at any time if you feel uncomfortable. Grounding: notice 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.</p>
    </div>
  );
}
