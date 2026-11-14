import Link from "next/link";
import { Brain } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { CLASS_LABELS, physioModel, predictPhysioState, type PhysioClass } from "@/lib/ml/physio-state";
import type { WearableSession } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";

/** Shows the experimental model's read of recent wearable windows, with factors and caveats. */
export function PhysioStateCard({ sessions, tz, compact = false }: { sessions: WearableSession[]; tz: string; compact?: boolean }) {
  const recent = sessions.slice(0, compact ? 3 : 6);
  return (
    <Card>
      <CardHeader
        icon={<Brain className="h-4 w-4" />}
        title="Physiological state indicator"
        description="Experimental · which lab condition each 30 s sensor window most resembles"
        action={
          <Badge tone="warn" className="hidden sm:inline-flex">
            Experimental
          </Badge>
        }
      />
      <CardBody className="space-y-3">
        {recent.length === 0 ? (
          <p className="text-sm text-muted">No wearable windows recorded yet. Add one from Vitals & sensors.</p>
        ) : (
          <ul className="space-y-3">
            {recent.map((s) => {
              const p = predictPhysioState(s.features);
              const top = p.contributions.slice(0, 2);
              return (
                <li key={s.id} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{CLASS_LABELS[p.top]}</span>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      {Math.round(p.probabilities[p.top] * 100)}% · {p.confidence} confidence
                      {s.origin === "simulated" ? <DemoBadge label="Simulated" /> : null}
                    </span>
                  </div>
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    {(Object.entries(p.probabilities) as [PhysioClass, number][]).map(([k, v]) => (
                      <div key={k} style={{ width: `${v * 100}%`, background: k === "Relax" ? "var(--teal)" : k === "PhysicalStress" ? "var(--space)" : k === "CognitiveStress" ? "var(--amber)" : "var(--coral)" }} />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {s.context ?? "Window"} · {fmtDateTime(s.at, tz)} · HR {s.hrMean} bpm · SpO₂ {s.spo2Mean}% · EDA {s.edaMean} µS · skin {s.skinTempMean} °C
                  </p>
                  {!compact ? (
                    <p className="mt-1 text-xs text-muted">
                      Main factors: {top.map((c) => `${c.description} (${c.value >= 0 ? "+" : ""}${c.value.toFixed(1)})`).join("; ")}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted">
          Trained on {physioModel.evaluation.subjects} healthy volunteers on Earth (PhysioNet, ODC-By). Leave-one-subject-out accuracy {Math.round(physioModel.evaluation.accuracy * 100)}%. Not validated for astronauts or microgravity; never diagnostic.{" "}
          <Link href="/app/research/methodology#model" className="text-primary hover:underline">
            How it works
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
