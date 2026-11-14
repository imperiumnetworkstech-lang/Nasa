import model from "./physio-state-model.json";

/**
 * Inference for the EXPERIMENTAL physiological-state indicator trained by
 * ml/train-physio-state.ts on the open PhysioNet "Non-EEG" dataset.
 * Output: which lab-protocol stage a 30 s wearable window most resembles, with per-feature
 * contributions so a human can see *why*. Never a diagnosis or fitness-for-duty signal.
 */
export type PhysioClass = "Relax" | "PhysicalStress" | "CognitiveStress" | "EmotionalStress";

export const CLASS_LABELS: Record<PhysioClass, string> = {
  Relax: "Resembles relaxed baseline",
  PhysicalStress: "Resembles physical exertion",
  CognitiveStress: "Resembles cognitive load",
  EmotionalStress: "Resembles emotional arousal",
};

export const physioModel = model;

export interface Contribution {
  feature: string;
  description: string;
  value: number;
  contribution: number;
}

export interface PhysioPrediction {
  top: PhysioClass;
  probabilities: Record<PhysioClass, number>;
  confidence: "low" | "moderate" | "high";
  contributions: Contribution[];
  modelVersion: string;
}

const clip = (v: number) => Math.max(-6, Math.min(6, v));

export function predictPhysioState(features: number[]): PhysioPrediction {
  if (features.length !== model.features.length || features.some((f) => !Number.isFinite(f))) {
    throw new Error(`Expected ${model.features.length} finite features`);
  }
  const { mu, sigma } = model.standardisation;
  const xs = features.map((v, j) => clip((v - mu[j]) / sigma[j]));
  const z = model.weights.map((wk, k) => model.bias[k] + wk.reduce((s, w, j) => s + w * xs[j], 0));
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const sum = e.reduce((a, b) => a + b, 0);
  const p = e.map((v) => v / sum);
  const k = p.indexOf(Math.max(...p));
  const classes = model.classes as PhysioClass[];
  const top = classes[k];
  const sortedP = [...p].sort((a, b) => b - a);
  const margin = sortedP[0] - sortedP[1];
  const descriptions = model.featureDescriptions as Record<string, string>;
  const contributions = model.features
    .map((f, j) => ({ feature: f, description: descriptions[f] ?? f, value: features[j], contribution: model.weights[k][j] * xs[j] }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return {
    top,
    probabilities: Object.fromEntries(classes.map((c, i) => [c, p[i]])) as Record<PhysioClass, number>,
    confidence: margin > 0.4 ? "high" : margin > 0.15 ? "moderate" : "low",
    contributions,
    modelVersion: model.version,
  };
}

/** Build model features from window summaries and a personal relaxed baseline. */
export function featuresFromWindow(
  w: { hr: number; spo2: number; eda: number; edaSlopePerMin: number; skinTemp: number; skinTempSlopePerMin: number; motionMean: number; motionSd: number },
  baseline: { hr: number; spo2: number; eda: number; edaSd: number; skinTemp: number; motion: number; motionSd: number },
): number[] {
  const edaSd = Math.max(baseline.edaSd, 0.05);
  const motionSd = Math.max(baseline.motionSd, 0.01);
  return [
    w.hr - baseline.hr,
    w.spo2 - baseline.spo2,
    (w.eda - baseline.eda) / edaSd,
    w.edaSlopePerMin / edaSd,
    w.skinTemp - baseline.skinTemp,
    w.skinTempSlopePerMin,
    (w.motionMean - baseline.motion) / motionSd,
    w.motionSd / motionSd,
  ];
}
