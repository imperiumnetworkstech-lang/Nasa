import type { PlatformSettings, UserPreferences } from "./types";

/**
 * Demo mode lets reviewers enter as a seeded role without a password.
 * It is ON by default only in development. In production it must be explicitly enabled with
 * DEMO_MODE=true, and should never be enabled on a deployment that holds real health data.
 */
export function isDemoEnabled(): boolean {
  if (process.env.DEMO_MODE === "false") return false;
  if (process.env.DEMO_MODE === "true") return true;
  return process.env.NODE_ENV !== "production";
}

export const DEMO_MISSION_ID = "demo-ant-01";
export const DEMO_MISSION_B_ID = "demo-ant-02";

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "light",
  timezone: "UTC",
  temperatureUnit: "C",
  volumeUnit: "ml",
  showReadinessSummary: true,
  hydrationTargetMl: null,
  reminders: { checkIn: true, hydration: false, medication: true, mobilityBreaks: false },
  notificationChannels: { inApp: true, email: false, push: false },
};

/** ILLUSTRATIVE thresholds for demonstration only — not clinical or mission standards. */
export const DEFAULT_SETTINGS: PlatformSettings = {
  commDelaySeconds: 0,
  commWindowEveryHours: 0,
  thresholds: {
    hrDriftZ: 2.5,
    baselineWindowDays: 21,
    baselineMinObservations: 7,
    minSleepHours: 6,
    spo2Below: 92,
    temperatureAboveC: 37.8,
    missedCheckInDays: 2,
    sustainedStressCount: 3,
    minRestHoursBetweenHighWorkload: 10,
  },
  rulesVersion: "2026.11-1",
  privacyMinGroupSize: 3,
  features: { readinessSummary: true, guideAI: false, environmentOverlay: true },
  updatedAt: new Date(0).toISOString(),
  updatedBy: "system",
};
