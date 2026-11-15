import { describe, expect, it } from "vitest";
import { analyzeVitals, vitalsModel } from "@/lib/ml/vitals-model";
import { personalProfile, driftLabel } from "@/lib/health/personal";
import { SCENARIO_BASE } from "@/lib/scenarios";
import type { Vital } from "@/lib/types";

const now = new Date("2026-11-15T12:00:00Z");
const day = 86_400_000;
const vega = { hr: 58, spo2: 97.6, temp: 36.7, skinTemp: 33.2, rr: 14, eda: 2.1, sbp: 116, dbp: 75 };

function history(base: typeof vega, days = 14, extra: Partial<typeof vega> = {}, extraAtHoursAgo = 0): Vital[] {
  const out: Vital[] = [];
  const mk = (kind: Vital["kind"], value: number, t: number, value2?: number): Vital => ({ id: `${kind}${t}`, uid: "u", missionId: "m", origin: "simulated", createdAt: "", enteredBy: "u", kind, value, value2, unit: "", measuredAt: new Date(t).toISOString(), source: "simulated", quality: "valid" });
  for (let d = 1; d <= days; d++) {
    const t = now.getTime() - d * day;
    const w = (d % 3) - 1; // small wobble
    out.push(mk("heart_rate", base.hr + w, t), mk("spo2", base.spo2, t), mk("temperature", base.temp + w * 0.1, t), mk("skin_temp", base.skinTemp, t), mk("resp_rate", base.rr + w, t), mk("eda", base.eda, t), mk("blood_pressure", base.sbp + w, t, base.dbp));
  }
  if (Object.keys(extra).length) {
    const t = now.getTime() - extraAtHoursAgo * 3_600_000;
    if (extra.hr) out.push({ ...mk("heart_rate", extra.hr, t), device: "Suit sensor (demo scenario)" });
  }
  return out;
}

describe("Model 2.0 with personal baselines", () => {
  it("is trained with personal features and reports the comparison", () => {
    expect(vitalsModel.version).toBe("2.0.0");
    expect(vitalsModel.weights[0]).toHaveLength(32);
    expect(vitalsModel.evaluation.accuracy).toBeGreaterThan(vitalsModel.evaluation.withoutPersonalBaseline.accuracy);
    expect(vitalsModel.evaluation.earlyWarning.right).toBeGreaterThan(vitalsModel.evaluation.withoutPersonalBaseline.earlyWarning.right);
  });

  it("catches an early warning: in range, but far above the astronaut's usual", () => {
    const a = analyzeVitals({ ...vega, hr: 96, rr: 18 }, "Vega", { baseline: vega });
    expect(a.condition).toBe("tachycardia");
    const hr = a.params.find((p) => p.key === "hr")!;
    expect(hr.status).toBe("normal");
    expect(hr.unusual).toBe(true);
    expect(hr.pctFromUsual).toBe(66);
    expect(a.message).toMatch(/within range but 66% above their usual 58/);
  });

  it("their own usual values are normal", () => {
    const a = analyzeVitals(vega, "Vega", { baseline: vega });
    expect(a.condition).toBe("normal");
    expect(a.message).toMatch(/close to their usual/);
  });
});

describe("Context-aware alerts", () => {
  it("a high heart rate during a workout is expected (no siren)", () => {
    const a = analyzeVitals({ ...SCENARIO_BASE, hr: 132, rr: 24, eda: 14 }, "Vega", { activity: "exercise" });
    expect(a.expected).toBe(true);
    expect(a.contextNote).toMatch(/Expected during exercise/);
  });
  it("the same reading at rest is NOT expected", () => {
    expect(analyzeVitals({ ...SCENARIO_BASE, hr: 132, rr: 24, eda: 14 }, "Vega").expected).toBe(false);
  });
  it("danger is never excused by exercise", () => {
    const a = analyzeVitals({ ...SCENARIO_BASE, spo2: 86, hr: 130 }, "Vega", { activity: "exercise" });
    expect(a.expected).toBe(false);
    expect(a.severity).toBe("urgent");
  });
});

describe("Personal baseline and Drift Score", () => {
  it("learns the astronaut's own usual values from history", () => {
    const p = personalProfile(history(vega), now);
    expect(p.baseline.hr).toBe(58);
    expect(p.baseline.temp).toBeCloseTo(36.7, 1);
    expect(p.drift).toBeLessThan(25);
    expect(driftLabel(p.drift).label).toBe("Close to usual");
    expect(p.trend).toHaveLength(7);
  });
  it("scenario test readings don't change the baseline but do raise the drift score", () => {
    const p = personalProfile(history(vega, 14, { hr: 120 }, 0.1), now);
    expect(p.baseline.hr).toBe(58);
    expect(p.drift!).toBeGreaterThan(10);
  });
  it("needs enough history before giving a baseline", () => {
    expect(personalProfile(history(vega, 3), now).baseline.hr).toBeUndefined();
  });
});
