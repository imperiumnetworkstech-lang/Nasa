/**
 * Reference ranges used to label training data and to explain results.
 * They combine general adult clinical norms with published spaceflight findings. They are
 * DEMO defaults: a mission's medical team must set the real limits for each astronaut.
 *
 * Sources:
 *  - Norsk P. et al., J Physiol 2015 — on the ISS, 24-h blood pressure fell ~8–10 mmHg while
 *    heart rate was unchanged.  https://pmc.ncbi.nlm.nih.gov/articles/4324706/
 *  - Stahn A.C. et al., Sci Rep 2017 — resting core body temperature rose ~1 °C (to ~38 °C)
 *    over long missions.  https://pmc.ncbi.nlm.nih.gov/articles/PMC5701078
 *  - NASA OCHMO habitable-atmosphere brief — ISS cabin is sea-level equivalent (14.7 psia, 21% O2),
 *    so normal SpO2 is expected.  https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf
 *  - Posada-Quintero 2016 / Geršak 2020 — skin conductance is usually a few to ~20 µS and is best
 *    compared with the person's own resting level.
 *  - Fluid loading with salt is an operational countermeasure for orthostatic intolerance
 *    (Bungo et al. 1985; NASA).  https://pubmed.ncbi.nlm.nih.gov/4062772/
 *  - General adult norms: resting HR 60–100 bpm (fit adults often 50–60), RR 12–20/min, SpO2 ≥ 95%.
 */
export type VitalKey = "hr" | "spo2" | "sbp" | "dbp" | "temp" | "skinTemp" | "rr" | "eda";

export interface Range {
  key: VitalKey;
  label: string;
  unit: string;
  low: number; // below this = low
  high: number; // above this = high
  /** Typical resting value used as the centre of "normal" training samples. */
  typical: number;
  note: string;
}

export const RANGES: Record<VitalKey, Range> = {
  hr: { key: "hr", label: "Heart rate", unit: "bpm", low: 50, high: 100, typical: 66, note: "Resting. Fit astronauts are often 50–60; unchanged in orbit (Norsk 2015)." },
  spo2: { key: "spo2", label: "Oxygen (SpO₂)", unit: "%", low: 95, high: 100, typical: 98, note: "ISS air is sea-level equivalent, so 95–100% is expected. High is not a problem." },
  sbp: { key: "sbp", label: "Blood pressure (top)", unit: "mmHg", low: 90, high: 135, typical: 112, note: "In-flight pressure runs ~8–10 mmHg lower than on Earth (Norsk 2015)." },
  dbp: { key: "dbp", label: "Blood pressure (bottom)", unit: "mmHg", low: 55, high: 88, typical: 70, note: "Lower in orbit than on the ground." },
  temp: { key: "temp", label: "Body temperature", unit: "°C", low: 36.0, high: 38.3, typical: 37.4, note: "Resting core temperature rises ~1 °C in long missions (Stahn 2017), so the fever line is set higher." },
  skinTemp: { key: "skinTemp", label: "Skin temperature", unit: "°C", low: 30.5, high: 35.5, typical: 33, note: "Wrist/suit skin sensor." },
  rr: { key: "rr", label: "Breathing rate", unit: "/min", low: 10, high: 22, typical: 15, note: "Resting adult norm 12–20; small margin for sensor noise." },
  eda: { key: "eda", label: "Sweat level (EDA)", unit: "µS", low: 0.5, high: 12, typical: 4, note: "Skin conductance; sweat clings to skin in microgravity. Best judged vs the person's own resting level." },
};

export const VITAL_KEYS = Object.keys(RANGES) as VitalKey[];

export type Readings = Record<VitalKey, number>;

/** How far a value is outside its range, as a % of the range edge (0 when inside). */
export function deviationPct(key: VitalKey, v: number): number {
  const r = RANGES[key];
  if (v < r.low) return -Math.round(((r.low - v) / r.low) * 100);
  if (v > r.high) return Math.round(((v - r.high) / r.high) * 100);
  return 0;
}

export function statusOf(key: VitalKey, v: number): "low" | "normal" | "high" {
  const r = RANGES[key];
  if (v < r.low) return "low";
  // High oxygen saturation is never a problem.
  if (v > r.high && key !== "spo2") return "high";
  return "normal";
}
