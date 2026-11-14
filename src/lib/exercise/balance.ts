import type { ActivityLog, ExercisePlan, MissionEvent } from "@/lib/types";

/**
 * Exercise Balance — "countermeasure debt".
 * Compares the last 7 days of logged exercise with the weekly targets the medical team set,
 * per category, and finds free slots in the coming 48 h to catch up. A planning aid, not a
 * prescription: targets always come from the medical team.
 */
export type Category = "resistance" | "aerobic" | "mobility";
export const CATEGORIES: Category[] = ["resistance", "aerobic", "mobility"];

export interface CategoryBalance {
  category: Category;
  targetMin: number;
  doneMin: number;
  /** Minutes still needed this week (0 when on track). */
  debtMin: number;
  pct: number;
}

export interface Slot {
  start: string;
  end: string;
}

export function weeklyBalance(acts: ActivityLog[], plan: Pick<ExercisePlan, "resistanceMinPerWeek" | "aerobicMinPerWeek" | "mobilityMinPerWeek">, now: Date): CategoryBalance[] {
  const since = now.getTime() - 7 * 86_400_000;
  const recent = acts.filter((a) => Date.parse(a.at) >= since && Date.parse(a.at) <= now.getTime());
  const target: Record<Category, number> = { resistance: plan.resistanceMinPerWeek, aerobic: plan.aerobicMinPerWeek, mobility: plan.mobilityMinPerWeek };
  return CATEGORIES.map((category) => {
    const doneMin = recent.filter((a) => a.category === category).reduce((s, a) => s + a.durationMin, 0);
    const targetMin = target[category];
    return { category, targetMin, doneMin, debtMin: Math.max(0, targetMin - doneMin), pct: targetMin ? Math.min(100, (doneMin / targetMin) * 100) : 100 };
  });
}

/**
 * Free 1-hour slots in the next 48 h between 08:00 and 20:00 UTC that do not overlap the
 * crew member's planned mission events.
 */
export function freeSlots(events: MissionEvent[], crewUid: string, now: Date, max = 3): Slot[] {
  const busy = events
    .filter((e) => e.crewUids.length === 0 || e.crewUids.includes(crewUid))
    .map((e) => [Date.parse(e.start), Date.parse(e.end ?? e.start) + 1] as const);
  const out: Slot[] = [];
  const startHour = new Date(now);
  startHour.setUTCMinutes(0, 0, 0);
  for (let h = 1; h <= 48 && out.length < max; h++) {
    const s = startHour.getTime() + h * 3_600_000;
    const hour = new Date(s).getUTCHours();
    if (hour < 8 || hour > 19) continue;
    const e = s + 3_600_000;
    if (busy.some(([b0, b1]) => s < b1 && b0 < e)) continue;
    if (out.length && Date.parse(out[out.length - 1].end) + 3 * 3_600_000 > s) continue; // spread suggestions out
    out.push({ start: new Date(s).toISOString(), end: new Date(e).toISOString() });
  }
  return out;
}
