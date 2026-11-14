import { RANGES, VITAL_KEYS, type Readings } from "./vitals-reference";

/** Model features: standardised value + distance below / above the normal range, per vital. */
export function featurize(r: Readings): number[] {
  const f: number[] = [];
  for (const k of VITAL_KEYS) {
    const { low, high } = RANGES[k];
    const span = high - low;
    f.push((r[k] - (low + high) / 2) / span);
    f.push(Math.max(0, low - r[k]) / span);
    f.push(Math.max(0, r[k] - high) / span);
  }
  return f;
}
