import "server-only";
import { z } from "zod";
import { addPersonal, getMission, listPersonal } from "@/lib/data/repo";
import { runAlertsForCrew } from "@/lib/alerts/service";
import { canWritePersonal, toSubject } from "@/lib/permissions/server";
import { VITAL_META } from "@/lib/health/vitals";
import { featuresFromWindow, predictPhysioState } from "@/lib/ml/physio-state";
import { missionDay } from "@/lib/utils";
import type { PersonalKind, UserProfile } from "@/lib/types";
import {
  activitySchema,
  checkInSchema,
  cognitiveSchema,
  hydrationSchema,
  journalSchema,
  mealSchema,
  medicationLogSchema,
  moodSchema,
  sleepSchema,
  symptomSchema,
  vitalSchema,
  wearableWindowSchema,
} from "@/lib/validation/schemas";

/** Kinds that may be queued offline. Symptom reports are deliberately excluded. */
export const OFFLINE_ALLOWED: PersonalKind[] = ["checkIns", "hydrationLogs", "sleepLogs", "moodLogs", "activityLogs", "mealLogs"];

export const SELF_RECORD_SCHEMAS = {
  checkIns: checkInSchema,
  vitals: vitalSchema,
  sleepLogs: sleepSchema,
  hydrationLogs: hydrationSchema,
  mealLogs: mealSchema,
  activityLogs: activitySchema,
  moodLogs: moodSchema,
  journal: journalSchema,
  cognitiveTests: cognitiveSchema,
  symptomReports: symptomSchema,
  medicationLogs: medicationLogSchema,
  wearableSessions: wearableWindowSchema,
} as const;
export type SelfKind = keyof typeof SELF_RECORD_SCHEMAS;
export const SELF_KINDS = Object.keys(SELF_RECORD_SCHEMAS) as SelfKind[];

export type CreateResult =
  | { ok: true; id: string; duplicate: boolean; newAlerts: number; extra?: Record<string, unknown> }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Single code path for a crew member creating their OWN record (used by the live form endpoint
 * and the offline sync endpoint). Validates with Zod on the server and stamps uid/mission/time
 * from the authenticated profile — never from the client.
 */
export async function createOwnRecord(user: UserProfile, kind: SelfKind, raw: unknown, clientId?: string): Promise<CreateResult> {
  if (!canWritePersonal(user, toSubject(user), kind)) return { ok: false, error: "You can only add records to your own crew profile." };
  const parsed = (SELF_RECORD_SCHEMAS[kind] as z.ZodType).safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".") || "_"] ??= i.message;
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data as Record<string, unknown>;
  const now = new Date().toISOString();
  const base = {
    uid: user.uid,
    missionId: user.missionId,
    origin: "user" as const,
    createdAt: now,
    enteredBy: user.uid,
    ...(clientId ? { clientId } : {}),
  };
  let record: Record<string, unknown>;
  let extra: Record<string, unknown> | undefined;
  switch (kind) {
    case "checkIns": {
      const mission = user.missionId ? await getMission(user.missionId) : null;
      const at = (data.at as string | undefined) ?? now;
      record = { ...base, ...data, at, missionDay: mission ? missionDay(mission.startAt, new Date(at)) : null };
      break;
    }
    case "vitals":
      record = { ...base, ...data, unit: VITAL_META[data.kind as keyof typeof VITAL_META].unit, quality: "valid" };
      break;
    case "sleepLogs":
      record = { ...base, ...data, durationMin: Math.round((Date.parse(data.end as string) - Date.parse(data.start as string)) / 60000) };
      break;
    case "symptomReports":
      record = { ...base, ...data, status: "submitted", history: [{ at: now, by: user.uid, byName: user.displayName, action: "Submitted" }] };
      break;
    case "medicationLogs": {
      const meds = await listPersonal(user.uid, "medications");
      const med = meds.find((m) => m.id === data.medicationId);
      if (!med) return { ok: false, error: "Medication not found in your plan." };
      record = { ...base, ...data, at: now, medicationName: med.name };
      break;
    }
    case "wearableSessions": {
      // Personal relaxed baseline = mean of this person's previous "rest" sessions (or none yet).
      const prior = (await listPersonal(user.uid, "wearableSessions", { limit: 60 })).filter((s) => /rest/i.test(s.context ?? ""));
      if (prior.length < 3) {
        return { ok: false, error: "At least 3 'rest' windows are needed to build your personal baseline before the model can run. Record a window with context 'Morning rest' first." , fieldErrors: {} };
      }
      const avg = (f: (s: (typeof prior)[number]) => number) => prior.reduce((s, x) => s + f(x), 0) / prior.length;
      const sd = (f: (s: (typeof prior)[number]) => number) => {
        const m = avg(f);
        return Math.sqrt(prior.reduce((s, x) => s + (f(x) - m) ** 2, 0) / Math.max(1, prior.length - 1));
      };
      const w = data as z.infer<typeof wearableWindowSchema>;
      const features = featuresFromWindow(w, {
        hr: avg((s) => s.hrMean),
        spo2: avg((s) => s.spo2Mean),
        eda: avg((s) => s.edaMean),
        edaSd: sd((s) => s.edaMean),
        skinTemp: avg((s) => s.skinTempMean),
        motion: avg((s) => s.motionMean),
        motionSd: Math.max(sd((s) => s.motionMean), 0.05),
      });
      record = {
        ...base,
        at: now,
        durationS: 30,
        source: "device",
        device: "Manual window entry",
        hrMean: w.hr,
        spo2Mean: w.spo2,
        edaMean: w.eda,
        skinTempMean: w.skinTemp,
        motionMean: w.motionMean,
        features,
        context: w.context,
      };
      extra = { prediction: predictPhysioState(features) };
      break;
    }
    default:
      record = { ...base, ...data, at: (data.at as string | undefined) ?? now };
  }
  const { record: saved, duplicate } = await addPersonal(user.uid, kind, record as never);
  let newAlerts = 0;
  if (!duplicate && ["checkIns", "vitals", "sleepLogs", "symptomReports"].includes(kind)) {
    newAlerts = (await runAlertsForCrew(user.uid)).length;
  }
  return { ok: true, id: (saved as { id: string }).id, duplicate, newAlerts, extra };
}
