import { computeBaseline } from "./baseline";
import type { CheckIn, HydrationLog, SleepLog, SymptomReport, Vital } from "@/lib/types";

/**
 * Optional, transparent readiness SUMMARY — explicitly not a single opaque score and not a
 * fitness-for-duty decision. Each factor states its status, the data behind it and freshness.
 */
export type FactorStatus = "usual" | "outside" | "missing" | "attention";
export interface Factor {
  name: string;
  status: FactorStatus;
  detail: string;
  at: string | null;
  href: string;
}

export function readinessFactors(input: {
  now: Date;
  sleep: SleepLog[];
  vitals: Vital[];
  checkIns: CheckIn[];
  hydration: HydrationLog[];
  symptoms: SymptomReport[];
  hydrationTargetMl: number | null;
  tz: string;
}): Factor[] {
  const { now } = input;
  const factors: Factor[] = [];
  const sleepSorted = [...input.sleep].sort((a, b) => b.end.localeCompare(a.end));
  const lastSleep = sleepSorted[0];
  if (!lastSleep || now.getTime() - Date.parse(lastSleep.end) > 36 * 3_600_000) {
    factors.push({ name: "Sleep", status: "missing", detail: "No sleep logged in the last 36 h.", at: lastSleep?.end ?? null, href: "/app/crew/sleep" });
  } else {
    const b = computeBaseline(
      sleepSorted.map((s) => ({ t: s.end, v: s.durationMin / 60 })),
      { windowDays: 21, minObs: 7, now, excludeLatest: true },
    );
    const h = lastSleep.durationMin / 60;
    const outside = b.sufficient && h < b.mean - Math.max(1, 1.5 * b.sd);
    factors.push({
      name: "Sleep",
      status: outside ? "outside" : "usual",
      detail: b.sufficient ? `${h.toFixed(1)} h last night vs your usual ${b.mean.toFixed(1)} h (n=${b.n}).` : `${h.toFixed(1)} h last night. Not enough history for a personal baseline yet.`,
      at: lastSleep.end,
      href: "/app/crew/sleep",
    });
  }

  const hr = input.vitals.filter((v) => v.kind === "heart_rate" && v.quality === "valid").sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
  if (!hr[0] || now.getTime() - Date.parse(hr[0].measuredAt) > 48 * 3_600_000) {
    factors.push({ name: "Resting heart rate", status: "missing", detail: "No valid heart-rate reading in the last 48 h.", at: hr[0]?.measuredAt ?? null, href: "/app/crew/health" });
  } else {
    const b = computeBaseline(hr.map((v) => ({ t: v.measuredAt, v: v.value })), { windowDays: 21, minObs: 7, now, excludeLatest: true });
    const z = b.sufficient ? (hr[0].value - b.mean) / Math.max(b.sd, 1) : 0;
    factors.push({
      name: "Resting heart rate",
      status: b.sufficient && Math.abs(z) >= 2.5 ? "outside" : "usual",
      detail: b.sufficient ? `${hr[0].value} bpm vs your baseline ${b.mean.toFixed(0)} ± ${b.sd.toFixed(1)} bpm (n=${b.n}).` : `${hr[0].value} bpm. Baseline needs at least 7 readings.`,
      at: hr[0].measuredAt,
      href: "/app/crew/health",
    });
  }

  const today = now.toISOString().slice(0, 10);
  const ci = [...input.checkIns].sort((a, b) => b.at.localeCompare(a.at))[0];
  if (!ci || ci.at.slice(0, 10) !== today) {
    factors.push({ name: "Today's check-in", status: "missing", detail: "Not completed yet today.", at: ci?.at ?? null, href: "/app/crew/check-in" });
  } else {
    const high = (ci.fatigue ?? 0) >= 4 || (ci.stress ?? 0) >= 4 || (ci.pain ?? 0) >= 4;
    factors.push({
      name: "Today's check-in",
      status: high ? "attention" : "usual",
      detail: high ? "You reported high fatigue, stress or pain today." : "Completed — self-reported values within your typical range.",
      at: ci.at,
      href: "/app/crew/check-in",
    });
  }

  const todayMl = input.hydration.filter((h) => h.at.slice(0, 10) === today).reduce((s, h) => s + h.amountMl, 0);
  if (!input.hydrationTargetMl) {
    factors.push({ name: "Hydration", status: todayMl ? "usual" : "missing", detail: `${todayMl} ml logged today. No target configured — set one in Profile (you or your medical team decide).`, at: input.hydration[0]?.at ?? null, href: "/app/crew/hydration" });
  } else {
    factors.push({
      name: "Hydration",
      status: todayMl === 0 ? "missing" : "usual",
      detail: `${todayMl} of ${input.hydrationTargetMl} ml target logged today.`,
      at: input.hydration[0]?.at ?? null,
      href: "/app/crew/hydration",
    });
  }

  const open = input.symptoms.filter((s) => s.status !== "resolved");
  factors.push({
    name: "Open symptom reports",
    status: open.length ? "attention" : "usual",
    detail: open.length ? `${open.length} open report(s) with your care team.` : "None open.",
    at: open[0]?.createdAt ?? null,
    href: "/app/crew/symptoms",
  });
  return factors;
}
