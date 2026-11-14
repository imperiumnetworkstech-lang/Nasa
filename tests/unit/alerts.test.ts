import { describe, expect, it } from "vitest";
import { evaluateRules } from "@/lib/alerts/rules";
import { alertIdFor } from "@/lib/alerts/ids";
import { DEFAULT_SETTINGS } from "@/lib/config";
import type { CheckIn, SleepLog, SymptomReport, Vital } from "@/lib/types";

const now = new Date("2026-11-14T12:00:00Z");
const daysAgo = (d: number, h = 7) => new Date(now.getTime() - d * 86_400_000 + (h - 12) * 3_600_000).toISOString();
const base = { uid: "u", missionId: "m", origin: "user" as const, createdAt: now.toISOString(), enteredBy: "u" };

const hr = (d: number, value: number, quality: Vital["quality"] = "valid"): Vital => ({ ...base, id: `hr${d}`, kind: "heart_rate", value, unit: "bpm", measuredAt: daysAgo(d), source: "manual", quality });
const ci = (d: number, stress: CheckIn["stress"] = 2, wantsFollowUp = false): CheckIn => ({ ...base, id: `ci${d}`, at: daysAgo(d, 8), missionDay: 1, overall: 4, fatigue: 2, stress, pain: 1, wantsFollowUp });
const sl = (d: number, hours: number): SleepLog => ({ ...base, id: `sl${d}`, start: daysAgo(d, 0), end: daysAgo(d, 6), durationMin: hours * 60, quality: 3, wakeUps: 1, restfulness: 3 });

function run(input: Partial<Parameters<typeof evaluateRules>[0]>) {
  return evaluateRules({ crewUid: "u", crewLabel: "U", now, thresholds: DEFAULT_SETTINGS.thresholds, vitals: [], sleep: [], checkIns: [ci(0)], symptoms: [], ...input });
}

describe("alert rule engine", () => {
  it("flags heart-rate drift from personal baseline with an explanation", () => {
    const vitals = [...Array.from({ length: 14 }, (_, i) => hr(i + 1, 60 + (i % 3))), hr(0, 80)];
    const out = run({ vitals });
    const a = out.find((x) => x.ruleId === "hr-baseline-drift");
    expect(a).toBeDefined();
    expect(a!.reason).toMatch(/baseline/);
    expect(a!.observed).toBe("80 bpm");
    expect(a!.recommendedAction).not.toMatch(/diagnos/i);
  });

  it("does not flag drift when data is sparse", () => {
    const out = run({ vitals: [hr(2, 60), hr(1, 61), hr(0, 95)] });
    expect(out.find((x) => x.ruleId === "hr-baseline-drift")).toBeUndefined();
  });

  it("ignores readings marked invalid/questionable", () => {
    const vitals = [...Array.from({ length: 14 }, (_, i) => hr(i + 1, 60)), hr(0, 140, "questionable")];
    expect(run({ vitals }).find((x) => x.ruleId === "hr-baseline-drift")).toBeUndefined();
  });

  it("flags low SpO2 against the configured threshold as urgent", () => {
    const v: Vital = { ...base, id: "s", kind: "spo2", value: 89, unit: "%", measuredAt: daysAgo(0), source: "device", quality: "valid" };
    const a = run({ vitals: [v] }).find((x) => x.ruleId === "spo2-low");
    expect(a?.severity).toBe("urgent");
    expect(a?.reason).toMatch(/illustrative/);
  });

  it("flags short sleep over 3 nights", () => {
    expect(run({ sleep: [sl(0, 5), sl(1, 5), sl(2, 5.5)] }).some((x) => x.ruleId === "sleep-deficit")).toBe(true);
    expect(run({ sleep: [sl(0, 7), sl(1, 7), sl(2, 7)] }).some((x) => x.ruleId === "sleep-deficit")).toBe(false);
  });

  it("treats missed check-ins as missing data, not a health finding", () => {
    const a = run({ checkIns: [ci(4)] }).find((x) => x.ruleId === "missed-check-in");
    expect(a?.dataState).toBe("missing");
    expect(a?.severity).toBe("info");
  });

  it("keeps sustained-stress alerts medical-only (not operational)", () => {
    const a = run({ checkIns: [ci(0, 5), ci(1, 4), ci(2, 4)] }).find((x) => x.ruleId === "sustained-stress");
    expect(a?.operational).toBe(false);
  });

  it("raises symptom-review alerts with severity mapping", () => {
    const s: SymptomReport = { ...base, id: "sy", bodyArea: "Head", symptomType: "Headache", description: "x", severity: "severe", onset: daysAgo(0), duration: "1h", associated: [], requestReview: true, status: "submitted", history: [] };
    expect(run({ symptoms: [s] }).find((x) => x.ruleId === "symptom-review")?.severity).toBe("urgent");
    expect(run({ symptoms: [{ ...s, status: "resolved" }] }).find((x) => x.ruleId === "symptom-review")).toBeUndefined();
  });

  it("produces stable, deduplicating alert ids", () => {
    expect(alertIdFor("a:b:c")).toBe(alertIdFor("a:b:c"));
    expect(alertIdFor("a:b:c")).not.toBe(alertIdFor("a:b:d"));
  });
});
