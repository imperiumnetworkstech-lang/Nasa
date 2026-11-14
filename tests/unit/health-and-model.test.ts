import { describe, expect, it } from "vitest";
import { computeBaseline, computeDrift, confidenceFor } from "@/lib/health/baseline";
import { featuresFromWindow, physioModel, predictPhysioState } from "@/lib/ml/physio-state";
import holdout from "@/lib/ml/physio-holdout-samples.json";
import { detectConflicts } from "@/lib/mission/planner";
import { deliveryState } from "@/lib/messages";
import type { MissionEvent } from "@/lib/types";

const now = new Date("2026-11-14T12:00:00Z");
const pts = (vals: number[]) => vals.map((v, i) => ({ t: new Date(now.getTime() - (vals.length - i) * 86_400_000).toISOString(), v }));

describe("personal baseline", () => {
  it("uses only the configured window and reports sufficiency", () => {
    const b = computeBaseline(pts([60, 61, 62, 59, 60, 61, 60]), { windowDays: 21, minObs: 7, now });
    expect(b.n).toBe(7);
    expect(b.sufficient).toBe(true);
    expect(b.mean).toBeCloseTo(60.43, 1);
  });

  it("suppresses conclusions with sparse data", () => {
    const d = computeDrift(pts([60, 61, 90]), { windowDays: 21, minObs: 7, zThreshold: 2.5, now, unit: "bpm", label: "HR" });
    expect(d.flagged).toBe(false);
    expect(d.confidence).toBe("insufficient");
    expect(d.explanation).toMatch(/No conclusion/);
  });

  it("confidence grows with observations", () => {
    expect(confidenceFor(3, 7)).toBe("insufficient");
    expect(confidenceFor(10, 7)).toBe("low");
    expect(confidenceFor(30, 7)).toBe("high");
  });
});

describe("physiological-state model", () => {
  it("ships evaluation metrics and dataset provenance", () => {
    expect(physioModel.dataset.licence).toMatch(/Open Data Commons/);
    expect(physioModel.evaluation.subjects).toBe(20);
    expect(physioModel.evaluation.balancedAccuracy).toBeGreaterThan(0.4); // well above 25% chance
    expect(physioModel.limitations.join(" ")).toMatch(/not astronauts/i);
  });

  it("returns normalised probabilities with explanations", () => {
    const p = predictPhysioState(holdout.samples[0].features);
    const sum = Object.values(p.probabilities).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(p.contributions).toHaveLength(physioModel.features.length);
  });

  it("recognises clear physical exertion relative to a rest baseline", () => {
    const f = featuresFromWindow(
      { hr: 120, spo2: 97, eda: 6, edaSlopePerMin: 1, skinTemp: 32.5, skinTempSlopePerMin: -0.05, motionMean: 1.6, motionSd: 0.3 },
      { hr: 68, spo2: 98, eda: 2, edaSd: 0.5, skinTemp: 33, motion: 1.0, motionSd: 0.05 },
    );
    expect(predictPhysioState(f).top).toBe("PhysicalStress");
  });

  it("rejects malformed input", () => {
    expect(() => predictPhysioState([1, 2])).toThrow();
    expect(() => predictPhysioState(new Array(8).fill(Number.NaN))).toThrow();
  });
});

describe("workload planner", () => {
  const ev = (title: string, startH: number, hours: number, workload: MissionEvent["workload"]): MissionEvent => ({
    id: title,
    missionId: "m",
    type: "workload",
    title,
    start: new Date(Date.UTC(2026, 10, 20, startH)).toISOString(),
    end: new Date(Date.UTC(2026, 10, 20, startH + hours)).toISOString(),
    workload,
    crewUids: ["a"],
    createdBy: "c",
    createdAt: "",
    origin: "user",
  });
  it("detects insufficient rest between high-workload blocks", () => {
    const c = detectConflicts([ev("EVA", 8, 4, "high"), ev("Repair", 14, 3, "high")], ["a"], { minRestHours: 10, sleepWindow: { startHour: 22, endHour: 6 } });
    expect(c.some((x) => x.kind === "insufficient-rest")).toBe(true);
  });
  it("detects sleep-window overlap", () => {
    const c = detectConflicts([ev("Night ops", 23, 3, "moderate")], ["a"], { minRestHours: 10, sleepWindow: { startHour: 22, endHour: 6 } });
    expect(c.some((x) => x.kind === "sleep-window-overlap")).toBe(true);
  });
});

describe("communication-delay delivery states", () => {
  it("never reports received before the delay elapses", () => {
    const t = Date.parse("2026-11-14T12:00:00Z");
    const m = { deliverAt: new Date(t + 20 * 60_000).toISOString(), acknowledgedAt: null };
    expect(deliveryState(m, t + 60_000)).toBe("sent");
    expect(deliveryState(m, t + 21 * 60_000)).toBe("received");
    expect(deliveryState({ ...m, acknowledgedAt: new Date(t).toISOString() }, t)).toBe("acknowledged");
  });
});
