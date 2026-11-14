/**
 * Personal Baseline Drift Monitor.
 * Compares an individual's latest observation with THEIR OWN recent history (not a population norm).
 * Conclusions are suppressed when data is sparse. This is decision support, never a diagnosis.
 */
export interface Point {
  t: string; // ISO timestamp
  v: number;
}

export interface Baseline {
  mean: number;
  sd: number;
  n: number;
  windowStart: string;
  windowEnd: string;
  sufficient: boolean;
}

export interface Drift {
  latest: Point | null;
  baseline: Baseline;
  z: number | null;
  flagged: boolean;
  confidence: "insufficient" | "low" | "moderate" | "high";
  explanation: string;
}

export function computeBaseline(
  points: Point[],
  opts: { windowDays: number; minObs: number; now: Date; excludeLatest?: boolean },
): Baseline {
  const end = opts.now.getTime();
  const start = end - opts.windowDays * 86_400_000;
  let pts = points
    .filter((p) => {
      const t = Date.parse(p.t);
      return t >= start && t <= end && Number.isFinite(p.v);
    })
    .sort((a, b) => a.t.localeCompare(b.t));
  if (opts.excludeLatest && pts.length) pts = pts.slice(0, -1);
  const n = pts.length;
  const mean = n ? pts.reduce((s, p) => s + p.v, 0) / n : 0;
  const variance = n > 1 ? pts.reduce((s, p) => s + (p.v - mean) ** 2, 0) / (n - 1) : 0;
  return {
    mean,
    sd: Math.sqrt(variance),
    n,
    windowStart: new Date(start).toISOString(),
    windowEnd: new Date(end).toISOString(),
    sufficient: n >= opts.minObs,
  };
}

export function confidenceFor(n: number, minObs: number): Drift["confidence"] {
  if (n < minObs) return "insufficient";
  if (n < minObs * 2) return "low";
  if (n < minObs * 3) return "moderate";
  return "high";
}

export function computeDrift(
  points: Point[],
  opts: { windowDays: number; minObs: number; zThreshold: number; now: Date; unit: string; label: string },
): Drift {
  const sorted = [...points].sort((a, b) => a.t.localeCompare(b.t));
  const latest = sorted.at(-1) ?? null;
  const baseline = computeBaseline(sorted, { ...opts, excludeLatest: true });
  const confidence = confidenceFor(baseline.n, opts.minObs);
  if (!latest) {
    return { latest, baseline, z: null, flagged: false, confidence, explanation: `No ${opts.label} observations recorded yet.` };
  }
  if (!baseline.sufficient) {
    return {
      latest,
      baseline,
      z: null,
      flagged: false,
      confidence,
      explanation: `Only ${baseline.n} of the ${opts.minObs} observations needed to form a personal baseline. No conclusion drawn.`,
    };
  }
  // Floor the SD so that an unusually flat baseline does not produce huge z-scores.
  const sd = Math.max(baseline.sd, Math.abs(baseline.mean) * 0.02, 0.5);
  const z = (latest.v - baseline.mean) / sd;
  const flagged = Math.abs(z) >= opts.zThreshold;
  const dir = z > 0 ? "above" : "below";
  const explanation = flagged
    ? `Latest ${opts.label} ${latest.v.toFixed(1)} ${opts.unit} is ${Math.abs(z).toFixed(1)} SD ${dir} this person's ${opts.windowDays}-day baseline (${baseline.mean.toFixed(1)} ± ${baseline.sd.toFixed(1)} ${opts.unit}, n=${baseline.n}). Threshold: ${opts.zThreshold} SD.`
    : `Latest ${opts.label} ${latest.v.toFixed(1)} ${opts.unit} is within ${opts.zThreshold} SD of this person's baseline (${baseline.mean.toFixed(1)} ± ${baseline.sd.toFixed(1)} ${opts.unit}, n=${baseline.n}).`;
  return { latest, baseline, z, flagged, confidence, explanation };
}

export function average(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}
