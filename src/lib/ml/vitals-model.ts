import model from "./vitals-model.json";
import { featurize, type Baseline } from "./vitals-features";
import { CONDITIONS, GUIDE, type Condition } from "./condition-guide";
import { RANGES, VITAL_KEYS, deviationPct, statusOf, type Readings, type VitalKey } from "./vitals-reference";

/**
 * Analyses one set of suit readings:
 *  1. the trained model gives a probability (%) for each condition, using both the general
 *     normal ranges AND the astronaut's own usual values (personal baseline);
 *  2. every parameter is compared with its reference range (status + % outside the range)
 *     and with the astronaut's usual value (% change);
 *  3. activity context (e.g. a scheduled workout) can mark an alert as expected;
 *  4. a personalised message is built.
 */
export interface ParamResult {
  key: VitalKey;
  label: string;
  value: number;
  unit: string;
  low: number;
  high: number;
  status: "low" | "normal" | "high";
  deviationPct: number;
  /** The astronaut's own usual value (personal baseline), when known. */
  usual?: number;
  /** % change from the astronaut's usual value. */
  pctFromUsual?: number;
  /** Inside the general range but a big change for this astronaut. */
  unusual?: boolean;
}

export interface VitalsAnalysis {
  condition: Condition;
  confidencePct: number;
  probabilities: { condition: Condition; label: string; pct: number }[];
  params: ParamResult[];
  message: string;
  severity: "normal" | "attention" | "urgent";
  modelVersion: string;
  personalBaseline: boolean;
  /** True when the finding is expected for what the astronaut is doing (e.g. a workout). */
  expected: boolean;
  contextNote: string | null;
}

export const vitalsModel = model;

export function predictConditions(r: Readings, baseline?: Baseline): number[] {
  const x = featurize(r, baseline);
  const z = model.weights.map((w, k) => model.bias[k] + w.reduce((s, v, j) => s + v * x[j], 0));
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

const fmt = (k: VitalKey, v: number) => (k === "temp" || k === "skinTemp" || k === "eda" ? v.toFixed(1) : Math.round(v).toString());

/** How big a change from someone's usual counts as "unusual for them" (in that vital's units). */
const UNUSUAL_CHANGE: Partial<Record<VitalKey, number>> = { hr: 22, temp: 0.8, rr: 6, sbp: 22, dbp: 15, eda: 6, skinTemp: 1.8 };

/** Findings that are normal while exercising (only when not dangerous). */
const EXPECTED_DURING_EXERCISE: Condition[] = ["tachycardia", "dehydration", "tachypnea"];

export interface AnalyzeOptions {
  /** The astronaut's own usual values. */
  baseline?: Baseline;
  /** What the astronaut is doing right now. */
  activity?: "exercise" | null;
}

export function analyzeVitals(r: Readings, name: string, opts: AnalyzeOptions = {}): VitalsAnalysis {
  const { baseline, activity } = opts;
  const p = predictConditions(r, baseline);
  const order = p.map((pct, i) => ({ condition: model.conditions[i] as Condition, pct })).sort((a, b) => b.pct - a.pct);
  const params: ParamResult[] = VITAL_KEYS.map((k) => {
    const usual = baseline?.[k];
    const status = statusOf(k, r[k]);
    const change = usual !== undefined ? r[k] - usual : 0;
    return {
      key: k,
      label: RANGES[k].label,
      value: +fmt(k, r[k]),
      unit: RANGES[k].unit,
      low: RANGES[k].low,
      high: RANGES[k].high,
      status,
      deviationPct: k === "spo2" && r[k] > RANGES[k].high ? 0 : deviationPct(k, r[k]),
      ...(usual !== undefined
        ? {
            usual: +fmt(k, usual),
            pctFromUsual: Math.round((change / usual) * 100),
            unusual: status === "normal" && UNUSUAL_CHANGE[k] !== undefined && Math.abs(change) >= UNUSUAL_CHANGE[k]!,
          }
        : {}),
    };
  });
  let condition = order[0].condition;
  // Safety net: if any parameter is out of range, never report "normal".
  const abnormal = params.filter((x) => x.status !== "normal");
  if (condition === "normal" && abnormal.length) condition = order.find((o) => o.condition !== "normal")!.condition;
  const g = GUIDE[condition];
  let severity = g.severity;
  // Escalate clearly dangerous values.
  const dangerous = r.spo2 < 90 || r.hr < 40 || r.hr > 160 || r.temp >= 39.5 || r.sbp < 80 || r.sbp >= 170;
  if (dangerous || (activity !== "exercise" && r.hr > 140)) severity = "urgent";

  // Context: during a scheduled workout a fast heart rate, sweating and fast breathing are expected.
  const expected = activity === "exercise" && EXPECTED_DURING_EXERCISE.includes(condition) && !dangerous;
  const contextNote = expected ? "Expected during exercise — re-check 10 minutes after the workout ends." : null;

  const unusual = params.filter((x) => x.unusual);
  const why = [
    ...abnormal.map((x) => `${x.label} ${x.value} ${x.unit} is ${x.status} (${Math.abs(x.deviationPct)}% ${x.status === "low" ? "below" : "above"} the ${x.low}–${x.high} range)`),
    ...unusual.map((x) => `${x.label} ${x.value} ${x.unit} is within range but ${Math.abs(x.pctFromUsual!)}% ${x.pctFromUsual! > 0 ? "above" : "below"} their usual ${x.usual}`),
  ];
  const message =
    condition === "normal"
      ? `${name} is normal — all ${params.length} readings are within range${baseline ? " and close to their usual" : ""}.`
      : `${name}: ${g.label.toLowerCase()}${expected ? " (expected during exercise)" : ""}. ${why.join("; ")}.`;
  return {
    condition,
    confidencePct: Math.round(order.find((o) => o.condition === condition)!.pct * 100),
    probabilities: order.map((o) => ({ condition: o.condition, label: GUIDE[o.condition].label, pct: Math.round(o.pct * 1000) / 10 })),
    params,
    message,
    severity,
    modelVersion: model.version,
    personalBaseline: Boolean(baseline),
    expected,
    contextNote,
  };
}

export { CONDITIONS };
