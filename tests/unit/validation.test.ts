import { describe, expect, it } from "vitest";
import { checkInSchema, profileSchema, registerSchema, sleepSchema, symptomSchema, vitalSchema, settingsSchema } from "@/lib/validation/schemas";
import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS } from "@/lib/config";

describe("validation", () => {
  it("accepts 'prefer not to answer' (null) on check-in scales", () => {
    expect(checkInSchema.safeParse({ overall: 4, fatigue: null, stress: null, pain: 1, wantsFollowUp: false }).success).toBe(true);
  });

  it("rejects out-of-range scale values", () => {
    expect(checkInSchema.safeParse({ overall: 6, fatigue: 1, stress: 1, pain: 1, wantsFollowUp: false }).success).toBe(false);
  });

  it("rejects implausible vital values and future timestamps", () => {
    const now = new Date().toISOString();
    expect(vitalSchema.safeParse({ kind: "heart_rate", value: 400, measuredAt: now, source: "manual" }).success).toBe(false);
    expect(vitalSchema.safeParse({ kind: "spo2", value: 97, measuredAt: new Date(Date.now() + 86_400_000).toISOString(), source: "manual" }).success).toBe(false);
    expect(vitalSchema.safeParse({ kind: "eda", value: 2.4, measuredAt: now, source: "device" }).success).toBe(true);
  });

  it("requires a lower diastolic for blood pressure", () => {
    const now = new Date().toISOString();
    expect(vitalSchema.safeParse({ kind: "blood_pressure", value: 120, value2: 130, measuredAt: now, source: "manual" }).success).toBe(false);
    expect(vitalSchema.safeParse({ kind: "blood_pressure", value: 120, value2: 80, measuredAt: now, source: "manual" }).success).toBe(true);
  });

  it("requires sleep end after start", () => {
    const end = new Date(Date.now() - 3_600_000).toISOString();
    const start = new Date(Date.now() - 2 * 3_600_000).toISOString();
    expect(sleepSchema.safeParse({ start: end, end: start, quality: 3, wakeUps: 0, restfulness: null }).success).toBe(false);
    expect(sleepSchema.safeParse({ start, end, quality: 3, wakeUps: 0, restfulness: null }).success).toBe(true);
  });

  it("validates symptom reports", () => {
    expect(symptomSchema.safeParse({ bodyArea: "", symptomType: "x", description: "abc", severity: "mild", onset: new Date().toISOString(), duration: "1h", associated: [], requestReview: true }).success).toBe(false);
  });

  it("profile schema cannot carry a role (unknown keys are stripped)", () => {
    const r = profileSchema.safeParse({ displayName: "A", preferences: DEFAULT_PREFERENCES, role: "admin", missionId: "x" });
    expect(r.success).toBe(true);
    expect(r.success && "role" in r.data).toBe(false);
    expect(r.success && "missionId" in r.data).toBe(false);
  });

  it("registration enforces a minimum password length and has no role field", () => {
    expect(registerSchema.safeParse({ displayName: "Al", email: "a@b.co", password: "short" }).success).toBe(false);
    const r = registerSchema.safeParse({ displayName: "Al", email: "a@b.co", password: "long-enough-pass", role: "admin" });
    expect(r.success && "role" in r.data).toBe(false);
  });

  it("bounds configurable thresholds", () => {
    const ok = { commDelaySeconds: 600, commWindowEveryHours: 0, privacyMinGroupSize: 3, thresholds: DEFAULT_SETTINGS.thresholds, features: DEFAULT_SETTINGS.features };
    expect(settingsSchema.safeParse(ok).success).toBe(true);
    expect(settingsSchema.safeParse({ ...ok, privacyMinGroupSize: 1 }).success).toBe(false);
  });
});
