import { RANGES, VITAL_KEYS, type Readings, type VitalKey } from "@/lib/ml/vitals-reference";
import type { Vital } from "@/lib/types";

/**
 * Personal baseline ("digital twin", made simple) and the Drift Score.
 *
 * Baseline: each astronaut's own usual value per vital = the median of their valid readings over
 * the last 21 days (needs at least 5 readings; suit-scenario test readings are excluded so a demo
 * doesn't shift anyone's "normal").
 *
 * Drift Score (0–100): how far the astronaut's latest readings are from their own usual,
 * averaged across vitals. 0 = exactly their usual; 100 = very far from it. Each vital's distance
 * is measured in its own day-to-day variation (how much it normally moves), capped at 4.
 */
const KIND_TO_KEY: Partial<Record<Vital["kind"], VitalKey>> = {
  heart_rate: "hr",
  spo2: "spo2",
  temperature: "temp",
  skin_temp: "skinTemp",
  resp_rate: "rr",
  eda: "eda",
};

/** Smallest variation we assume per vital, so a very steady history doesn't make tiny changes look huge. */
const MIN_SPREAD: Record<VitalKey, number> = { hr: 3, spo2: 0.8, sbp: 5, dbp: 4, temp: 0.2, skinTemp: 0.4, rr: 1.2, eda: 0.6 };
const MIN_READINGS = 5;
const WINDOW_DAYS = 21;

export interface PersonalProfile {
  baseline: Partial<Readings>;
  spread: Partial<Readings>;
  readings: number;
  drift: number | null;
  /** Drift Score per day for the last 7 days (oldest first); null where there's no data. */
  trend: (number | null)[];
}

const isScenario = (v: Vital) => (v.device ?? "").includes("demo scenario");

function points(vitals: Vital[]): Record<VitalKey, { t: number; v: number }[]> {
  const out = Object.fromEntries(VITAL_KEYS.map((k) => [k, [] as { t: number; v: number }[]])) as Record<VitalKey, { t: number; v: number }[]>;
  for (const v of vitals) {
    if (v.quality !== "valid") continue;
    const t = Date.parse(v.measuredAt);
    if (v.kind === "blood_pressure") {
      out.sbp.push({ t, v: v.value });
      if (typeof v.value2 === "number") out.dbp.push({ t, v: v.value2 });
      continue;
    }
    const k = KIND_TO_KEY[v.kind];
    if (k) out[k].push({ t, v: v.value });
  }
  return out;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mad = (xs: number[], med: number) => median(xs.map((x) => Math.abs(x - med))) * 1.4826; // robust spread

function scoreFrom(latest: Partial<Readings>, baseline: Partial<Readings>, spread: Partial<Readings>): number | null {
  const zs: number[] = [];
  for (const k of VITAL_KEYS) {
    const b = baseline[k];
    const v = latest[k];
    if (b === undefined || v === undefined) continue;
    const s = Math.max(spread[k] ?? 0, MIN_SPREAD[k]);
    zs.push(Math.min(4, Math.abs(v - b) / s));
  }
  if (!zs.length) return null;
  return Math.round((zs.reduce((a, b) => a + b, 0) / zs.length / 4) * 100);
}

/**
 * Builds the profile. `vitals` = the astronaut's readings (any order, last ~28 days).
 * The baseline uses history only (not the last 2 hours, not scenario test readings); the drift
 * score uses the most recent reading of each vital, including scenario readings.
 */
export function personalProfile(vitals: Vital[], now = new Date()): PersonalProfile {
  const nowT = now.getTime();
  const history = points(vitals.filter((v) => !isScenario(v) && Date.parse(v.measuredAt) < nowT - 2 * 3_600_000 && Date.parse(v.measuredAt) >= nowT - WINDOW_DAYS * 86_400_000));
  const baseline: Partial<Readings> = {};
  const spread: Partial<Readings> = {};
  let count = 0;
  for (const k of VITAL_KEYS) {
    const xs = history[k].map((p) => p.v);
    if (xs.length < MIN_READINGS) continue;
    const m = median(xs);
    baseline[k] = Math.round(m * 10) / 10;
    spread[k] = mad(xs, m);
    count += xs.length;
  }

  const all = points(vitals);
  const latest: Partial<Readings> = {};
  for (const k of VITAL_KEYS) {
    const xs = all[k].filter((p) => p.t <= nowT).sort((a, b) => b.t - a.t);
    if (xs.length) latest[k] = xs[0].v;
  }
  const drift = scoreFrom(latest, baseline, spread);

  const trend: (number | null)[] = [];
  for (let d = 6; d >= 0; d--) {
    const end = nowT - d * 86_400_000;
    const start = end - 86_400_000;
    const day: Partial<Readings> = {};
    for (const k of VITAL_KEYS) {
      const xs = all[k].filter((p) => p.t > start && p.t <= end).map((p) => p.v);
      if (xs.length) day[k] = xs.reduce((a, b) => a + b, 0) / xs.length;
    }
    trend.push(scoreFrom(day, baseline, spread));
  }
  return { baseline, spread, readings: count, drift, trend };
}

export function driftLabel(score: number | null): { label: string; tone: "ok" | "warn" | "danger" | "neutral" } {
  if (score === null) return { label: "Not enough data", tone: "neutral" };
  if (score < 25) return { label: "Close to usual", tone: "ok" };
  if (score < 50) return { label: "Drifting", tone: "warn" };
  return { label: "Far from usual", tone: "danger" };
}

/** Typical range for a vital, shown next to the personal usual value. */
export const rangeText = (k: VitalKey) => `${RANGES[k].low}–${RANGES[k].high} ${RANGES[k].unit}`;
