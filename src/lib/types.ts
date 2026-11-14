/**
 * Shared domain model for Antariksha.
 * Every record carries `origin` so simulated/demo data is always distinguishable from
 * real user-entered data.
 */

export const ROLES = ["astronaut", "medical", "commander", "researcher", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  astronaut: "Astronaut / Crew Member",
  medical: "Flight Surgeon / Medical Officer",
  commander: "Mission Commander",
  researcher: "Researcher / Data Analyst",
  admin: "Platform Administrator",
};

/** Short, plain role names for admin screens. */
export const ROLE_SHORT: Record<Role, string> = {
  astronaut: "Crew",
  medical: "Doctor",
  commander: "Commander",
  researcher: "Researcher",
  admin: "Admin",
};

export type Origin = "user" | "simulated" | "imported";
export type ISODate = string;

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  timezone: string;
  temperatureUnit: "C" | "F";
  volumeUnit: "ml" | "oz";
  showReadinessSummary: boolean;
  hydrationTargetMl: number | null;
  reminders: {
    checkIn: boolean;
    hydration: boolean;
    medication: boolean;
    mobilityBreaks: boolean;
  };
  notificationChannels: { inApp: true; email: boolean; push: boolean };
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  role: Role;
  status: "active" | "suspended" | "pending";
  missionId: string | null;
  callSign?: string;
  /** Free-text, only ever supplied by the user or an authorised medical officer. */
  dietaryConstraints?: string;
  allergies?: string;
  isDemo: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
  preferences: UserPreferences;
}

export interface Mission {
  id: string;
  name: string;
  missionCode: string;
  description: string;
  startAt: ISODate;
  endAt: ISODate | null;
  status: "planned" | "active" | "completed";
  timezone: string;
  isDemo: boolean;
  createdAt: ISODate;
}

export type Assignment = "crew" | "medical" | "commander" | "researcher";
export interface MissionMember {
  uid: string;
  assignment: Assignment;
  callSign: string;
  displayName: string;
  joinedAt: ISODate;
}

interface BaseRecord {
  id: string;
  uid: string;
  missionId: string | null;
  origin: Origin;
  createdAt: ISODate;
  /** Client-generated id used to make offline sync idempotent. */
  clientId?: string;
  enteredBy: string;
}

/** Scales use null for "Prefer not to answer". */
export type Scale5 = 1 | 2 | 3 | 4 | 5 | null;

export interface CheckIn extends BaseRecord {
  at: ISODate;
  missionDay: number | null;
  overall: Scale5;
  fatigue: Scale5;
  stress: Scale5;
  pain: Scale5;
  note?: string;
  wantsFollowUp: boolean;
}

export const VITAL_KINDS = ["heart_rate", "blood_pressure", "temperature", "spo2", "resp_rate", "eda", "skin_temp", "hrv"] as const;
export type VitalKind = (typeof VITAL_KINDS)[number];
export interface Vital extends BaseRecord {
  kind: VitalKind;
  value: number;
  /** Diastolic for blood pressure. */
  value2?: number;
  unit: string;
  measuredAt: ISODate;
  source: "manual" | "simulated" | "imported" | "device";
  device?: string;
  quality: "valid" | "questionable" | "invalid";
}

export interface SleepLog extends BaseRecord {
  start: ISODate;
  end: ISODate;
  durationMin: number;
  quality: Scale5;
  wakeUps: number;
  restfulness: Scale5;
  shift?: string;
  note?: string;
}

export interface HydrationLog extends BaseRecord {
  at: ISODate;
  amountMl: number;
  note?: string;
}

export interface MealLog extends BaseRecord {
  at: ISODate;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  note?: string;
}

export interface ActivityLog extends BaseRecord {
  at: ISODate;
  category: "resistance" | "aerobic" | "mobility" | "other";
  name: string;
  durationMin: number;
  intensity: "light" | "moderate" | "vigorous";
  soreness: 0 | 1 | 2 | 3 | 4 | null;
  recovery: Scale5;
  note?: string;
}

export interface MoodLog extends BaseRecord {
  at: ISODate;
  mood: Scale5;
  stress: Scale5;
  reflection?: string;
  /** Only when true may an assigned medical officer see this entry. Commanders never can. */
  shareWithMedical: boolean;
}

/** Private journal — readable only by its author. Never shared, never aggregated. */
export interface JournalEntry extends BaseRecord {
  at: ISODate;
  text: string;
}

export interface CognitiveTest extends BaseRecord {
  at: ISODate;
  test: "reaction" | "attention" | "memory" | "self_rating";
  score: number;
  unit: string;
  detail?: string;
  selfFocus: Scale5;
  mentalFatigue: Scale5;
}

export type SymptomStatus = "submitted" | "acknowledged" | "in_review" | "follow_up_requested" | "resolved";
export interface HistoryEntry {
  at: ISODate;
  by: string;
  byName: string;
  action: string;
  note?: string;
}
export interface SymptomReport extends BaseRecord {
  bodyArea: string;
  symptomType: string;
  description: string;
  severity: "mild" | "moderate" | "severe" | "unsure";
  onset: ISODate;
  duration: string;
  associated: string[];
  requestReview: boolean;
  status: SymptomStatus;
  history: HistoryEntry[];
}

export interface Medication extends BaseRecord {
  name: string;
  /** Dose exactly as entered by an authorised clinician/user — never generated. */
  dose: string;
  schedule: string;
  instructions?: string;
  active: boolean;
}

export interface MedicationLog extends BaseRecord {
  medicationId: string;
  medicationName: string;
  at: ISODate;
  status: "taken" | "skipped" | "late";
  note?: string;
}

/** Append-only clinical note. Corrections are new notes referencing the original. */
export interface ClinicalNote extends BaseRecord {
  text: string;
  authorName: string;
  correctsNoteId?: string;
}

/**
 * A short window of wearable telemetry (heart rate, SpO2, electrodermal/sweat activity, skin
 * temperature, motion) summarised into features relative to the person's own relaxed baseline.
 * Fed to the experimental physiological-state model (lib/ml). Never a diagnosis.
 */
export interface WearableSession extends BaseRecord {
  at: ISODate;
  durationS: number;
  source: "simulated" | "device" | "imported";
  device?: string;
  hrMean: number;
  spo2Mean: number;
  edaMean: number;
  skinTempMean: number;
  motionMean: number;
  /** Model input features (see physio-state-model.json → features). */
  features: number[];
  context?: string;
}

/** One rating of one menu item (Menu Fatigue Radar). */
export interface FoodRating extends BaseRecord {
  at: ISODate;
  item: string;
  /** 1 = really didn't enjoy … 5 = loved it */
  rating: 1 | 2 | 3 | 4 | 5;
  ate: "all" | "some" | "none";
}

/** A practice review of one Skill Keeper card. */
export interface SkillReview extends BaseRecord {
  at: ISODate;
  cardId: string;
  result: "forgot" | "hard" | "ok" | "easy";
}

export type PersonalKind =
  | "foodRatings"
  | "skillReviews"
  | "wearableSessions"
  | "checkIns"
  | "vitals"
  | "sleepLogs"
  | "hydrationLogs"
  | "mealLogs"
  | "activityLogs"
  | "moodLogs"
  | "journal"
  | "cognitiveTests"
  | "symptomReports"
  | "medications"
  | "medicationLogs"
  | "clinicalNotes";

export interface PersonalRecordMap {
  foodRatings: FoodRating;
  skillReviews: SkillReview;
  wearableSessions: WearableSession;
  checkIns: CheckIn;
  vitals: Vital;
  sleepLogs: SleepLog;
  hydrationLogs: HydrationLog;
  mealLogs: MealLog;
  activityLogs: ActivityLog;
  moodLogs: MoodLog;
  journal: JournalEntry;
  cognitiveTests: CognitiveTest;
  symptomReports: SymptomReport;
  medications: Medication;
  medicationLogs: MedicationLog;
  clinicalNotes: ClinicalNote;
}

export type AlertSeverity = "info" | "attention" | "urgent";
export type AlertStatus = "open" | "acknowledged" | "assigned" | "escalated" | "resolved";
export interface Alert {
  id: string;
  missionId: string;
  crewUid: string;
  crewLabel: string;
  ruleId: string;
  ruleVersion: string;
  dedupeKey: string;
  severity: AlertSeverity;
  title: string;
  observed: string;
  source: string;
  observedAt: ISODate;
  reason: string;
  dataState: "fresh" | "stale" | "missing" | "sparse";
  recommendedAction: string;
  /** Whether a privacy-preserving version may be shown to the commander. */
  operational: boolean;
  status: AlertStatus;
  assignedTo?: string | null;
  createdAt: ISODate;
  origin: Origin;
  history: HistoryEntry[];
}

export interface CarePlanTask {
  id: string;
  title: string;
  due: ISODate | null;
  doneAt: ISODate | null;
}
export interface CarePlan {
  id: string;
  missionId: string;
  crewUid: string;
  title: string;
  tasks: CarePlanTask[];
  status: "active" | "completed";
  createdBy: string;
  createdByName: string;
  createdAt: ISODate;
  origin: Origin;
}

export type MissionEventType =
  | "eva"
  | "exercise"
  | "sleep_shift"
  | "shift_change"
  | "vehicle"
  | "comm_delay"
  | "workload"
  | "rest"
  | "other";
export interface MissionEvent {
  id: string;
  missionId: string;
  type: MissionEventType;
  title: string;
  start: ISODate;
  end: ISODate | null;
  workload: "low" | "moderate" | "high" | null;
  crewUids: string[];
  notes?: string;
  createdBy: string;
  createdAt: ISODate;
  origin: Origin;
}

export interface EnvironmentReading {
  id: string;
  missionId: string;
  at: ISODate;
  temperatureC: number;
  humidityPct: number;
  co2Ppm: number;
  noiseDb: number;
  lightPhase: "day" | "night";
  radiationUSvPerDay: number | null;
  source: string;
  origin: Origin;
}

export interface Message {
  id: string;
  missionId: string;
  threadId: string;
  fromUid: string;
  fromName: string;
  toUid: string | "care-team";
  body: string;
  priority: "routine" | "urgent";
  createdAt: ISODate;
  /** With a configured comm delay, the earliest time the recipient side can see it. */
  deliverAt: ISODate;
  acknowledgedAt: ISODate | null;
  origin: Origin;
}

export interface Consultation {
  id: string;
  missionId: string;
  crewUid: string;
  crewLabel: string;
  reason: string;
  preferredWindow: string;
  status: "requested" | "scheduled" | "completed" | "cancelled";
  scheduledFor: ISODate | null;
  createdAt: ISODate;
  history: HistoryEntry[];
  origin: Origin;
}

export interface AuditLog {
  id: string;
  missionId: string | null;
  at: ISODate;
  actorUid: string;
  actorName: string;
  action: string;
  target: string;
  detail?: string;
}

export interface Lesson {
  id: string;
  missionId: string | null;
  title: string;
  body: string;
  tags: string[];
  phase: string;
  module: string;
  status: "submitted" | "published" | "rejected";
  submittedBy: string;
  approvedBy: string | null;
  createdAt: ISODate;
  origin: Origin;
}

export interface AppNotification {
  id: string;
  uid: string;
  kind: "check_in" | "medication" | "care_plan" | "medical_review" | "alert" | "schedule" | "system";
  title: string;
  body: string;
  href?: string;
  createdAt: ISODate;
  readAt: ISODate | null;
}

export interface Thresholds {
  /** All thresholds are ILLUSTRATIVE demo values; mission medical teams must configure their own. */
  hrDriftZ: number;
  baselineWindowDays: number;
  baselineMinObservations: number;
  minSleepHours: number;
  spo2Below: number;
  temperatureAboveC: number;
  missedCheckInDays: number;
  sustainedStressCount: number;
  minRestHoursBetweenHighWorkload: number;
}

export interface PlatformSettings {
  commDelaySeconds: number;
  /** Hours between communication windows (0 = continuous link). */
  commWindowEveryHours: number;
  thresholds: Thresholds;
  rulesVersion: string;
  privacyMinGroupSize: number;
  features: { readinessSummary: boolean; guideAI: boolean; environmentOverlay: boolean };
  updatedAt: ISODate;
  updatedBy: string;
}

export interface Invite {
  code: string;
  role: Role;
  missionId: string | null;
  usesLeft: number;
  createdBy: string;
  createdAt: ISODate;
}

/** Ask the Doctor: a delay-aware, store-and-forward question from a crew member. */
export interface CrewQuestion {
  id: string;
  missionId: string;
  crewUid: string;
  crewLabel: string;
  text: string;
  topic: "symptom" | "medication" | "sleep" | "exercise" | "food" | "mood" | "other";
  priority: "routine" | "soon";
  /** Snapshot of the crew member's own data they chose to attach (plain text, no raw records). */
  attachments: { label: string; summary: string }[];
  createdAt: ISODate;
  /** When it leaves the habitat (next communication window). */
  sendAt: ISODate;
  /** Earliest moment the ground can read it (sendAt + one-way delay). */
  arriveAt: ISODate;
  answer: { text: string; byUid: string; byName: string; at: ISODate; arriveAt: ISODate } | null;
  readAt: ISODate | null;
  origin: Origin;
}

/** Weekly exercise targets set by the medical team for one crew member (Exercise Balance). */
export interface ExercisePlan {
  id: string; // = crewUid
  missionId: string;
  crewUid: string;
  resistanceMinPerWeek: number;
  aerobicMinPerWeek: number;
  mobilityMinPerWeek: number;
  setBy: string;
  setByName: string;
  updatedAt: ISODate;
  origin: Origin;
}

/** Skill Keeper practice card authored by the medical team. */
export interface SkillCard {
  id: string;
  missionId: string;
  title: string;
  prompt: string;
  answer: string;
  category: "kit" | "procedure" | "equipment" | "communication";
  /** How fast the skill is assumed to fade without practice (configurable). */
  halfLifeDays: number;
  authoredBy: string;
  createdAt: ISODate;
  origin: Origin;
}

export interface MissionRecordMap {
  questions: CrewQuestion;
  exercisePlans: ExercisePlan;
  skillCards: SkillCard;
  alerts: Alert;
  carePlans: CarePlan;
  missionEvents: MissionEvent;
  environmentReadings: EnvironmentReading;
  messages: Message;
  consultations: Consultation;
  auditLogs: AuditLog;
}
export type MissionKind = keyof MissionRecordMap;
