import type { Readings } from "@/lib/ml/vitals-reference";

/**
 * Demo suit-sensor scenarios. Real readings would stream from the astronaut's suit; until a
 * device is connected these stand in for that feed. The model — not this list — decides what
 * each reading means.
 */
export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
  readings: Readings;
  /** What the astronaut is doing (makes some findings expected). */
  context?: "exercise";
}

/** Standard healthy values; readings a scenario leaves at these are replaced by the astronaut's own usual. */
export const SCENARIO_BASE: Readings = { hr: 66, spo2: 98, sbp: 112, dbp: 70, temp: 37.4, skinTemp: 33, rr: 15, eda: 4 };

const base = SCENARIO_BASE;

export const SCENARIOS: Scenario[] = [
  { id: "all-normal", title: "All normal", emoji: "✅", blurb: "Every reading in range", readings: { ...base } },
  { id: "low-heart-rate", title: "Low heart rate", emoji: "💓", blurb: "Heart rate drops to 41", readings: { ...base, hr: 41, sbp: 104, dbp: 66 } },
  { id: "low-oxygen", title: "Oxygen problem", emoji: "🫁", blurb: "SpO₂ falls to 87%", readings: { ...base, spo2: 87, hr: 92, rr: 21 } },
  { id: "heavy-sweating", title: "Sweat level issue", emoji: "💦", blurb: "Sweat level 24 µS after exercise", readings: { ...base, eda: 24, skinTemp: 35.8, hr: 98, sbp: 104 } },
  { id: "high-heart-rate", title: "High heart rate", emoji: "💗", blurb: "Resting heart rate 128", readings: { ...base, hr: 128, rr: 18 } },
  { id: "fever", title: "High temperature", emoji: "🌡️", blurb: "Body temperature 39.1 °C", readings: { ...base, temp: 39.1, hr: 94, skinTemp: 34.4 } },
  { id: "high-bp", title: "High blood pressure", emoji: "🩸", blurb: "152 / 96 mmHg", readings: { ...base, sbp: 152, dbp: 96 } },
  { id: "low-bp", title: "Low blood pressure", emoji: "🌀", blurb: "84 / 52 mmHg, feeling dizzy", readings: { ...base, sbp: 84, dbp: 52, hr: 104 } },
  { id: "fast-breathing", title: "Fast breathing", emoji: "🌬️", blurb: "28 breaths per minute", readings: { ...base, rr: 28, hr: 88 } },
  { id: "workout", title: "During a workout", emoji: "🏋️", blurb: "Heart rate 132 while exercising (expected)", readings: { ...base, hr: 132, rr: 24, eda: 14, skinTemp: 35.2 }, context: "exercise" },
  { id: "early-warning", title: "Early warning", emoji: "🔎", blurb: "Heart rate 96: in range, but far above their usual", readings: { ...base, hr: 96, rr: 18 } },
];

export function getScenario(id: string) {
  return SCENARIOS.find((s) => s.id === id) ?? null;
}
