import model from "./vitals-model.json";
import { featurize } from "./vitals-features";
import { CONDITIONS, GUIDE, type Condition } from "./condition-guide";
import { RANGES, VITAL_KEYS, deviationPct, statusOf, type Readings, type VitalKey } from "./vitals-reference";

/**
 * Analyses one set of suit readings:
 *  1. the trained model gives a probability (%) for each condition;
 *  2. every parameter is compared with its reference range (status + % outside the range);
 *  3. a personalised message and the condition guide (precautions, remedy, medicines) are attached.
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
}

export interface VitalsAnalysis {
  condition: Condition;
  confidencePct: number;
  probabilities: { condition: Condition; label: string; pct: number }[];
  params: ParamResult[];
  message: string;
  severity: "normal" | "attention" | "urgent";
  modelVersion: string;
}

export const vitalsModel = model;

export function predictConditions(r: Readings): number[] {
  const x = featurize(r);
  const z = model.weights.map((w, k) => model.bias[k] + w.reduce((s, v, j) => s + v * x[j], 0));
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

const fmt = (k: VitalKey, v: number) => (k === "temp" || k === "skinTemp" || k === "eda" ? v.toFixed(1) : Math.round(v).toString());

export function analyzeVitals(r: Readings, name: string): VitalsAnalysis {
  const p = predictConditions(r);
  const order = p.map((pct, i) => ({ condition: model.conditions[i] as Condition, pct })).sort((a, b) => b.pct - a.pct);
  const params: ParamResult[] = VITAL_KEYS.map((k) => ({
    key: k,
    label: RANGES[k].label,
    value: +fmt(k, r[k]),
    unit: RANGES[k].unit,
    low: RANGES[k].low,
    high: RANGES[k].high,
    status: statusOf(k, r[k]),
    deviationPct: k === "spo2" && r[k] > RANGES[k].high ? 0 : deviationPct(k, r[k]),
  }));
  let condition = order[0].condition;
  // Safety net: if any parameter is out of range, never report "normal".
  const abnormal = params.filter((x) => x.status !== "normal");
  if (condition === "normal" && abnormal.length) condition = order.find((o) => o.condition !== "normal")!.condition;
  const g = GUIDE[condition];
  let severity = g.severity;
  // Escalate clearly dangerous values.
  if (r.spo2 < 90 || r.hr < 40 || r.hr > 140 || r.temp >= 39.5 || r.sbp < 80 || r.sbp >= 170) severity = "urgent";
  const message =
    condition === "normal"
      ? `${name} is normal — all ${params.length} readings are within range.`
      : `${name}: ${g.label.toLowerCase()}. ${abnormal
          .map((x) => `${x.label} ${x.value} ${x.unit} is ${x.status} (${Math.abs(x.deviationPct)}% ${x.status === "low" ? "below" : "above"} the ${x.low}–${x.high} range)`)
          .join("; ")}.`;
  return {
    condition,
    confidencePct: Math.round(order.find((o) => o.condition === condition)!.pct * 100),
    probabilities: order.map((o) => ({ condition: o.condition, label: GUIDE[o.condition].label, pct: Math.round(o.pct * 1000) / 10 })),
    params,
    message,
    severity,
    modelVersion: model.version,
  };
}

export { CONDITIONS };
