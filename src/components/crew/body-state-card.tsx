import { predictPhysioState, type PhysioClass } from "@/lib/ml/physio-state";
import type { WearableSession } from "@/lib/types";
import { fmtTime } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

/**
 * Astronaut-facing, plain-language view of the wrist-sensor estimate.
 * The model details (training data, accuracy) are deliberately kept to staff screens.
 */
const PLAIN: Record<PhysioClass, { emoji: string; label: string; tip: string }> = {
  Relax: { emoji: "😌", label: "Calm", tip: "Your body looked relaxed." },
  PhysicalStress: { emoji: "🏃", label: "Active", tip: "Looks like you were moving or exercising." },
  CognitiveStress: { emoji: "🧠", label: "Focused", tip: "Looks like a busy, high-focus moment." },
  EmotionalStress: { emoji: "😮‍💨", label: "Tense", tip: "Your body showed signs of tension. A short breathing break can help." },
};

export function BodyStateCard({ sessions, tz }: { sessions: WearableSession[]; tz: string }) {
  const recent = sessions.slice(0, 3);
  return (
    <Card>
      <CardHeader title="How your body looked today" description="From your wrist sensor" />
      <CardBody>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">No sensor readings yet today.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3">
            {recent.map((s) => {
              const p = PLAIN[predictPhysioState(s.features).top];
              return (
                <li key={s.id} className="rounded-2xl bg-surface-2 p-4 text-center">
                  <span aria-hidden className="text-3xl">
                    {p.emoji}
                  </span>
                  <p className="mt-1 font-semibold">{p.label}</p>
                  <p className="text-xs text-muted">
                    {s.context ?? "Reading"} · {fmtTime(s.at, tz)}
                  </p>
                  <p className="mt-2 text-xs">{p.tip}</p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">An automatic estimate — not a medical check.</p>
      </CardBody>
    </Card>
  );
}
