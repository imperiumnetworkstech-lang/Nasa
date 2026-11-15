import { RANGES, VITAL_KEYS, type Readings } from "./vitals-reference";

/** An astronaut's own usual value for each reading (their personal baseline / "digital twin"). */
export type Baseline = Partial<Readings>;

/** Population typical values, used when an astronaut has no personal history yet. */
export const POPULATION_TYPICAL: Readings = Object.fromEntries(VITAL_KEYS.map((k) => [k, RANGES[k].typical])) as Readings;

/**
 * Model features (32 numbers):
 *  per vital, against the GENERAL normal range (24):
 *    1. where the value sits relative to the middle of the range
 *    2. how far it is below the range (0 if not below)
 *    3. how far it is above the range (0 if not above)
 *  per vital, against THIS astronaut's own usual value (8):
 *    4. how far the value is from their personal baseline
 * All are scaled by the width of the normal range so every vital counts on the same scale.
 */
export function featurize(r: Readings, baseline?: Baseline): number[] {
  const f: number[] = [];
  for (const k of VITAL_KEYS) {
    const { low, high } = RANGES[k];
    const span = high - low;
    f.push((r[k] - (low + high) / 2) / span);
    f.push(Math.max(0, low - r[k]) / span);
    f.push(Math.max(0, r[k] - high) / span);
  }
  for (const k of VITAL_KEYS) {
    const { low, high } = RANGES[k];
    const usual = baseline?.[k] ?? POPULATION_TYPICAL[k];
    f.push((r[k] - usual) / (high - low));
  }
  return f;
}
