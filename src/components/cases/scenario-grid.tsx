"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { runConsoleScenario, runMyScenario } from "@/lib/actions/cases";
import type { HealthCase } from "@/lib/types";
import { toast } from "@/components/ui/toast";
import { playAlarm, playChime, stopAlarm, unlockAudio } from "@/components/shell/sound";
import { cn } from "@/lib/utils";
import { CaseView } from "./case-view";

export interface ScenarioCard {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
}

/**
 * Scenario boxes. Each click sends that (demo) suit reading to the model, creates a case,
 * alerts the doctor and commander, and shows the full result here.
 */
export function ScenarioGrid({ scenarios, crewUid, mode }: { scenarios: ScenarioCard[]; crewUid?: string; mode: "crew" | "console" }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<HealthCase | null>(null);
  const router = useRouter();

  async function run(id: string) {
    void unlockAudio();
    setBusy(id);
    try {
      const r = mode === "crew" ? await runMyScenario(id) : await runConsoleScenario(crewUid ?? "", id);
      if (!r.ok || !r.data) {
        toast({ tone: "error", title: "Couldn't run scenario", body: r.message });
        return;
      }
      const c = r.data;
      if (mode === "crew") {
        try {
          localStorage.setItem("ak-seen-case", c.id);
        } catch {
          /* ignore */
        }
      }
      // The console only confirms with a chime; the siren sounds on the doctor and commander portals
      // (and briefly on the astronaut's own device when they trigger it themselves).
      if (c.analysis.severity !== "normal" && mode === "crew") playAlarm(6000);
      else playChime();
      toast({
        tone: c.analysis.severity === "normal" ? "success" : "error",
        title: `${c.analysis.emoji} ${c.analysis.label}`,
        body: c.analysis.severity === "normal" ? "Sent to the doctor and commander: all normal." : "Doctor and commander have been alerted.",
      });
      setResult(c);
      router.refresh();
    } catch {
      toast({ tone: "error", title: "Couldn't run scenario", body: "Connection problem — nothing was sent." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => run(s.id)}
            disabled={busy !== null}
            className={cn(
              "lift flex min-h-28 flex-col items-start gap-1 rounded-[var(--radius-card)] p-4 text-left shadow-[var(--shadow-card)] disabled:opacity-60",
              s.id === "all-normal" ? "bg-ok-soft" : "bg-surface",
            )}
          >
            <span aria-hidden className="text-3xl">
              {busy === s.id ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : s.emoji}
            </span>
            <span className="font-bold leading-tight">{s.title}</span>
            <span className="text-xs text-muted">{s.blurb}</span>
          </button>
        ))}
      </div>

      {result ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Scenario result" onClick={() => setResult(null)}>
          <div className="pop-in max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[var(--radius-card)] bg-surface p-5 shadow-2xl sm:rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Suit reading analysed{mode === "console" ? ` · ${result.crewName}` : ""}</p>
              <button onClick={() => {
                  stopAlarm();
                  setResult(null);
                }} className="rounded-full p-2 hover:bg-surface-2" aria-label="Close">
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>
            <CaseView c={result} audience={mode === "crew" ? "crew" : "staff"} />
            <p className="mt-4 rounded-2xl bg-surface-2 px-3 py-2 text-xs text-muted">
              {result.analysis.severity === "normal" ? "✅ The doctor and commander now see this astronaut as normal." : "🚨 Sent to the base-station doctor and mission commander. The doctor can add more medicine or advice."} Demo scenario — not real suit data. Not a diagnosis.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
