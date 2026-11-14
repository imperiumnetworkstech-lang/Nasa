import { z } from "zod";
import { ROLES, VITAL_KINDS } from "@/lib/types";
import { VITAL_META } from "@/lib/health/vitals";

/** Zod schemas shared by client forms and (authoritatively) server actions/route handlers. */

export const scale5 = z.number().int().min(1).max(5).nullable(); // null = "Prefer not to answer"
const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Enter a valid date/time");
const notFuture = (s: string) => Date.parse(s) <= Date.now() + 5 * 60_000;
const shortText = (max: number) => z.string().trim().max(max);
const optText = (max: number) => shortText(max).optional().transform((v) => (v ? v : undefined));
const clientId = z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/).optional();

export const checkInSchema = z.object({
  at: isoDate.refine(notFuture, "Time cannot be in the future").optional(),
  overall: scale5,
  fatigue: scale5,
  stress: scale5,
  pain: scale5,
  note: optText(1000),
  wantsFollowUp: z.boolean(),
  clientId,
});
export type CheckInInput = z.infer<typeof checkInSchema>;

export const vitalSchema = z
  .object({
    kind: z.enum(VITAL_KINDS),
    value: z.number().finite(),
    value2: z.number().finite().optional(),
    measuredAt: isoDate.refine(notFuture, "Time cannot be in the future"),
    source: z.enum(["manual", "device", "imported"]),
    device: optText(120),
    clientId,
  })
  .superRefine((v, ctx) => {
    const [lo, hi] = VITAL_META[v.kind].plausible;
    if (v.value < lo || v.value > hi) {
      ctx.addIssue({ code: "custom", path: ["value"], message: `Outside plausible range ${lo}–${hi} ${VITAL_META[v.kind].unit} — please check the entry` });
    }
    if (v.kind === "blood_pressure") {
      if (v.value2 === undefined) ctx.addIssue({ code: "custom", path: ["value2"], message: "Diastolic value is required" });
      else if (v.value2 >= v.value) ctx.addIssue({ code: "custom", path: ["value2"], message: "Diastolic should be lower than systolic" });
    }
  });
export type VitalInput = z.infer<typeof vitalSchema>;

export const sleepSchema = z
  .object({
    start: isoDate,
    end: isoDate.refine(notFuture, "End cannot be in the future"),
    quality: scale5,
    wakeUps: z.number().int().min(0).max(30),
    restfulness: scale5,
    shift: optText(80),
    note: optText(500),
    clientId,
  })
  .refine((s) => Date.parse(s.end) > Date.parse(s.start), { path: ["end"], message: "End must be after start" })
  .refine((s) => Date.parse(s.end) - Date.parse(s.start) <= 20 * 3_600_000, { path: ["end"], message: "Sleep period longer than 20 h — please check" });

export const hydrationSchema = z.object({
  amountMl: z.number().int().min(10, "At least 10 ml").max(2000, "Max 2000 ml per entry"),
  at: isoDate.refine(notFuture).optional(),
  note: optText(200),
  clientId,
});

export const mealSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  at: isoDate.refine(notFuture).optional(),
  note: optText(300),
});

export const activitySchema = z.object({
  category: z.enum(["resistance", "aerobic", "mobility", "other"]),
  name: shortText(80).min(1, "Name the activity"),
  durationMin: z.number().int().min(1).max(600),
  intensity: z.enum(["light", "moderate", "vigorous"]),
  soreness: z.number().int().min(0).max(4).nullable(),
  recovery: scale5,
  at: isoDate.refine(notFuture).optional(),
  note: optText(500),
  clientId,
});

export const moodSchema = z.object({
  mood: scale5,
  stress: scale5,
  reflection: optText(1000),
  shareWithMedical: z.boolean(),
  clientId,
});

export const journalSchema = z.object({ text: shortText(4000).min(1, "Write something first") });

export const cognitiveSchema = z.object({
  test: z.enum(["reaction", "attention", "memory", "self_rating"]),
  score: z.number().finite().min(0).max(100000),
  unit: shortText(40),
  detail: optText(200),
  selfFocus: scale5,
  mentalFatigue: scale5,
});

export const symptomSchema = z.object({
  bodyArea: shortText(60).min(1, "Choose a body area"),
  symptomType: shortText(80).min(1, "Describe the type of symptom"),
  description: shortText(2000).min(3, "Add a short description"),
  severity: z.enum(["mild", "moderate", "severe", "unsure"]),
  onset: isoDate.refine(notFuture, "Onset cannot be in the future"),
  duration: shortText(80).min(1, "How long has it lasted?"),
  associated: z.array(shortText(60)).max(12),
  requestReview: z.boolean(),
});

export const medicationSchema = z.object({
  name: shortText(120).min(1),
  dose: shortText(200).min(1, "Enter the dose exactly as prescribed"),
  schedule: shortText(200).min(1),
  instructions: optText(500),
});

export const medicationLogSchema = z.object({
  medicationId: z.string().min(1),
  status: z.enum(["taken", "skipped", "late"]),
  note: optText(300),
});

export const wearableWindowSchema = z.object({
  hr: z.number().min(25).max(230),
  spo2: z.number().min(50).max(100),
  eda: z.number().min(0).max(100),
  edaSlopePerMin: z.number().min(-50).max(50),
  skinTemp: z.number().min(20).max(42),
  skinTempSlopePerMin: z.number().min(-5).max(5),
  motionMean: z.number().min(0).max(20),
  motionSd: z.number().min(0).max(20),
  context: optText(120),
});

export const profileSchema = z.object({
  displayName: shortText(80).min(1, "Display name is required"),
  callSign: optText(40),
  dietaryConstraints: optText(300),
  allergies: optText(300),
  preferences: z.object({
    theme: z.enum(["light", "dark", "system"]),
    timezone: shortText(64).min(1),
    temperatureUnit: z.enum(["C", "F"]),
    volumeUnit: z.enum(["ml", "oz"]),
    showReadinessSummary: z.boolean(),
    hydrationTargetMl: z.number().int().min(250).max(6000).nullable(),
    reminders: z.object({ checkIn: z.boolean(), hydration: z.boolean(), medication: z.boolean(), mobilityBreaks: z.boolean() }),
    notificationChannels: z.object({ inApp: z.literal(true), email: z.boolean(), push: z.boolean() }),
  }),
});

export const loginSchema = z.object({ email: z.email("Enter a valid email"), password: z.string().min(1, "Enter your password") });
export const registerSchema = z.object({
  displayName: shortText(80).min(2, "At least 2 characters"),
  email: z.email("Enter a valid email"),
  password: z.string().min(10, "Use at least 10 characters").max(128),
  inviteCode: optText(40),
});

export const missionEventSchema = z
  .object({
    type: z.enum(["eva", "exercise", "sleep_shift", "shift_change", "vehicle", "comm_delay", "workload", "rest", "other"]),
    title: shortText(120).min(1),
    start: isoDate,
    end: isoDate.optional(),
    workload: z.enum(["low", "moderate", "high"]).nullable(),
    crewUids: z.array(z.string()).max(20),
    notes: optText(500),
  })
  .refine((e) => !e.end || Date.parse(e.end) > Date.parse(e.start), { path: ["end"], message: "End must be after start" });

export const alertActionSchema = z.object({
  alertId: z.string().min(1),
  action: z.enum(["acknowledge", "assign", "escalate", "resolve", "reopen"]),
  note: optText(500),
  assignee: z.string().optional(),
});

export const carePlanSchema = z.object({
  crewUid: z.string().min(1),
  title: shortText(120).min(1),
  tasks: z.array(z.object({ title: shortText(160).min(1), due: isoDate.nullable() })).min(1).max(20),
});

export const clinicalNoteSchema = z.object({ crewUid: z.string().min(1), text: shortText(4000).min(1), correctsNoteId: z.string().optional() });

export const symptomUpdateSchema = z.object({
  crewUid: z.string().min(1),
  reportId: z.string().min(1),
  status: z.enum(["acknowledged", "in_review", "follow_up_requested", "resolved"]),
  note: optText(500),
});

export const messageSchema = z.object({ toUid: z.string().min(1), body: shortText(2000).min(1), priority: z.enum(["routine", "urgent"]) });
export const consultationSchema = z.object({ reason: shortText(500).min(3), preferredWindow: shortText(120).min(1) });
export const lessonSchema = z.object({
  title: shortText(120).min(3),
  body: shortText(3000).min(10),
  tags: z.array(shortText(30)).max(8),
  phase: shortText(40),
  module: shortText(40),
});

export const roleChangeSchema = z.object({ uid: z.string().min(1), role: z.enum(ROLES) });
export const missionSchema = z.object({
  id: z.string().optional(),
  name: shortText(120).min(3),
  missionCode: shortText(20).min(2),
  description: shortText(1000),
  startAt: isoDate,
  endAt: isoDate.nullable(),
  status: z.enum(["planned", "active", "completed"]),
  timezone: shortText(64),
});
export const settingsSchema = z.object({
  commDelaySeconds: z.number().int().min(0).max(2700),
  privacyMinGroupSize: z.number().int().min(2).max(20),
  thresholds: z.object({
    hrDriftZ: z.number().min(1).max(6),
    baselineWindowDays: z.number().int().min(7).max(90),
    baselineMinObservations: z.number().int().min(3).max(60),
    minSleepHours: z.number().min(3).max(10),
    spo2Below: z.number().min(70).max(99),
    temperatureAboveC: z.number().min(36).max(41),
    missedCheckInDays: z.number().int().min(1).max(14),
    sustainedStressCount: z.number().int().min(2).max(14),
    minRestHoursBetweenHighWorkload: z.number().min(4).max(24),
  }),
  features: z.object({ readinessSummary: z.boolean(), guideAI: z.boolean(), environmentOverlay: z.boolean() }),
});
export const inviteSchema = z.object({ role: z.enum(ROLES), missionId: z.string().nullable(), usesLeft: z.number().int().min(1).max(500) });
