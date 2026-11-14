"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, ScaleInput } from "@/components/ui/form";
import { useRecordSubmit } from "./use-submit";

type Test = "reaction" | "attention" | "memory";

function median(a: number[]) {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

/** Short, optional, NON-diagnostic tasks. Results only compare you with your own history. */
export function CognitiveTasks() {
  const [test, setTest] = useState<Test>("reaction");
  const [result, setResult] = useState<{ score: number; unit: string; detail: string } | null>(null);
  const [focus, setFocus] = useState<number | null | undefined>();
  const [fatigue, setFatigue] = useState<number | null | undefined>();
  const { submit, busy, state } = useRecordSubmit("cognitiveTests");

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Task" className="inline-flex rounded-full bg-surface-2 p-1">
        {(["reaction", "attention", "memory"] as Test[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={test === t}
            onClick={() => {
              setTest(t);
              setResult(null);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium ${test === t ? "hero-gradient text-white" : "text-muted"}`}
          >
            {t === "reaction" ? "Reaction" : t === "attention" ? "Attention" : "Memory"}
          </button>
        ))}
      </div>
      {test === "reaction" ? <ReactionTest onDone={setResult} /> : test === "attention" ? <AttentionTest onDone={setResult} /> : <MemoryTest onDone={setResult} />}
      {result ? (
        <div className="space-y-4 rounded-2xl bg-primary-soft p-4">
          <p className="text-sm">
            Result: <strong>{result.score} {result.unit}</strong> <span className="text-muted">({result.detail})</span>
          </p>
          <ScaleInput name="focus" legend="How focused do you feel?" kind="focus" value={focus} onChange={setFocus} />
          <ScaleInput name="mfat" legend="Mental fatigue" kind="fatigue" value={fatigue} onChange={setFatigue} />
          <FormMessage state={state} />
          <Button
            disabled={busy}
            onClick={async () => {
              const r = await submit({ test, score: result.score, unit: result.unit, detail: result.detail, selfFocus: focus ?? null, mentalFatigue: fatigue ?? null }, "Result saved to your own history.");
              if (r.status === "saved") setResult(null);
            }}
          >
            Save result
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ReactionTest({ onDone }: { onDone: (r: { score: number; unit: string; detail: string }) => void }) {
  const [phase, setPhase] = useState<"idle" | "wait" | "go" | "early">("idle");
  const [times, setTimes] = useState<number[]>([]);
  const start = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const arm = () => {
    setPhase("wait");
    timer.current = setTimeout(() => {
      start.current = performance.now();
      setPhase("go");
    }, 1200 + Math.random() * 2300);
  };
  const tap = () => {
    if (phase === "idle" || phase === "early") return arm();
    if (phase === "wait") {
      if (timer.current) clearTimeout(timer.current);
      return setPhase("early");
    }
    const ms = Math.round(performance.now() - start.current);
    const next = [...times, ms];
    setTimes(next);
    if (next.length >= 5) {
      onDone({ score: median(next), unit: "ms (median)", detail: `${next.length} trials: ${next.join(", ")} ms` });
      setTimes([]);
      setPhase("idle");
    } else arm();
  };
  return (
    <button
      onClick={tap}
      className={`flex h-48 w-full flex-col items-center justify-center rounded-[var(--radius-card)] text-lg font-semibold transition-colors ${phase === "go" ? "bg-teal text-white" : phase === "wait" ? "bg-tile-amber text-warn" : phase === "early" ? "bg-danger-soft text-danger" : "hero-gradient text-white"}`}
    >
      {phase === "idle" ? "Tap to start (5 trials)" : phase === "wait" ? "Wait for green…" : phase === "go" ? "TAP!" : "Too early — tap to retry"}
      <span className="mt-1 text-sm font-normal opacity-80">{times.length ? `Trial ${times.length + 1} of 5` : "Space or Enter also works"}</span>
    </button>
  );
}

function AttentionTest({ onDone }: { onDone: (r: { score: number; unit: string; detail: string }) => void }) {
  // Go/no-go: tap for ★, do not tap for ✕. 12 stimuli.
  const [i, setI] = useState(-1);
  const [seq] = useState(() => Array.from({ length: 12 }, () => (Math.random() < 0.7 ? "★" : "✕")));
  const tapped = useRef(false);
  const correct = useRef(0);
  useEffect(() => {
    if (i < 0) return;
    if (i >= seq.length) {
      onDone({ score: Math.round((correct.current / seq.length) * 100), unit: "% correct", detail: "Go/no-go, 12 stimuli" });
      return;
    }
    tapped.current = false;
    const id = setTimeout(() => {
      if (seq[i] === "✕" && !tapped.current) correct.current++;
      setI((x) => x + 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [i, seq, onDone]);
  if (i < 0 || i >= seq.length)
    return (
      <div className="space-y-3 text-sm">
        <p className="text-muted">Tap when you see ★. Don&apos;t tap for ✕. 12 symbols, one per second.</p>
        <Button
          onClick={() => {
            correct.current = 0;
            setI(0);
          }}
        >
          Start attention task
        </Button>
      </div>
    );
  return (
    <button
      onClick={() => {
        if (tapped.current) return;
        tapped.current = true;
        if (seq[i] === "★") correct.current++;
      }}
      className="flex h-48 w-full items-center justify-center rounded-[var(--radius-card)] bg-surface-2 text-7xl"
      aria-label={`Symbol ${seq[i] === "★" ? "star, tap" : "cross, do not tap"}`}
    >
      {seq[i]}
    </button>
  );
}

function MemoryTest({ onDone }: { onDone: (r: { score: number; unit: string; detail: string }) => void }) {
  const [len, setLen] = useState(3);
  const [digits, setDigits] = useState("");
  const [show, setShow] = useState(false);
  const [answer, setAnswer] = useState("");
  const [best, setBest] = useState(0);
  const start = (n: number) => {
    const d = Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
    setDigits(d);
    setAnswer("");
    setShow(true);
    setTimeout(() => setShow(false), 700 * n + 500);
  };
  if (!digits)
    return (
      <div className="space-y-3 text-sm">
        <p className="text-muted">Remember the digits, then type them back. The sequence grows until you miss.</p>
        <Button onClick={() => start(3)}>Start memory task</Button>
      </div>
    );
  return (
    <div className="space-y-3">
      <div className="flex h-32 items-center justify-center rounded-[var(--radius-card)] bg-surface-2 text-4xl font-bold tracking-[0.4em]" aria-live="polite">
        {show ? digits : "• • •"}
      </div>
      {!show ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (answer === digits) {
              setBest(len);
              setLen(len + 1);
              start(len + 1);
            } else {
              onDone({ score: best, unit: "digits", detail: `Longest sequence recalled (missed at ${len})` });
              setDigits("");
              setLen(3);
              setBest(0);
            }
          }}
        >
          <label htmlFor="mem" className="sr-only">
            Type the digits
          </label>
          <input id="mem" autoFocus inputMode="numeric" value={answer} onChange={(e) => setAnswer(e.target.value.replace(/\D/g, ""))} className="h-11 flex-1 rounded-2xl border border-line bg-surface px-4" />
          <Button type="submit">Check</Button>
        </form>
      ) : null}
    </div>
  );
}
