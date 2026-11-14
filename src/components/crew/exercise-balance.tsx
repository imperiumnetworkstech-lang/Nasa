import { CalendarPlus } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { CategoryBalance, Slot } from "@/lib/exercise/balance";
import { fmtDateTime } from "@/lib/utils";

const META = {
  resistance: { label: "Strength", emoji: "🏋️", color: "var(--violet)" },
  aerobic: { label: "Cardio", emoji: "🚴", color: "var(--coral)" },
  mobility: { label: "Stretch", emoji: "🧘", color: "var(--teal)" },
} as const;

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90" aria-hidden>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="9" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className="transition-[stroke-dashoffset] duration-700" />
    </svg>
  );
}

/**
 * Exercise Balance: last 7 days vs the weekly targets from the medical team, plus free
 * schedule slots to catch up. Helps crew act on bone/muscle countermeasures before a deficit grows.
 */
export function ExerciseBalance({ balance, slots, setBy, tz }: { balance: CategoryBalance[] | null; slots: Slot[]; setBy: string | null; tz: string }) {
  if (!balance) {
    return (
      <Card>
        <CardHeader title="Exercise balance" />
        <CardBody>
          <p className="text-sm text-muted">Your medical team hasn&apos;t set weekly targets yet. Keep logging — your balance will appear once they do.</p>
        </CardBody>
      </Card>
    );
  }
  const debt = balance.reduce((s, b) => s + b.debtMin, 0);
  return (
    <Card>
      <CardHeader title="Exercise balance" description={`Last 7 days vs your weekly targets${setBy ? ` (set by ${setBy})` : ""}`} />
      <CardBody className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          {balance.map((b) => {
            const m = META[b.category as keyof typeof META];
            return (
              <div key={b.category} className="flex flex-col items-center">
                <div className="relative">
                  <Ring pct={b.pct} color={m.color} />
                  <span aria-hidden className="absolute inset-0 flex items-center justify-center text-2xl">
                    {m.emoji}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold">{m.label}</p>
                <p className="text-xs text-muted">
                  {b.doneMin} / {b.targetMin} min
                </p>
                <p className={`text-xs font-semibold ${b.debtMin ? "text-warn" : "text-ok"}`}>{b.debtMin ? `${b.debtMin} min to go` : "On track ✓"}</p>
              </div>
            );
          })}
        </div>
        {debt > 0 && slots.length ? (
          <div className="rounded-2xl bg-primary-soft p-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <CalendarPlus aria-hidden className="h-4 w-4" /> Free slots to catch up
            </p>
            <ul className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <li key={s.start} className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium">
                  {fmtDateTime(s.start, tz, { weekday: "short", hour: "2-digit", minute: "2-digit", dateStyle: undefined, timeStyle: undefined })}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted">From your mission schedule — times with nothing else planned.</p>
          </div>
        ) : debt === 0 ? (
          <p className="rounded-2xl bg-ok-soft px-3 py-2 text-sm text-ok">You&apos;re on track this week. Great job! 🎉</p>
        ) : null}
      </CardBody>
    </Card>
  );
}
