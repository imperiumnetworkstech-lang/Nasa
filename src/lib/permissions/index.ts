import type { MoodLog, PersonalKind, Role } from "@/lib/types";

/**
 * Pure permission helpers. These are the server-side source of truth for authorisation and are
 * mirrored by firestore.rules for defence in depth. Never trust a client-provided role, uid or
 * mission assignment: callers pass the profile loaded from the database.
 */
export interface Actor {
  uid: string;
  role: Role;
  missionId: string | null;
  status: "active" | "suspended" | "pending";
}

export interface Subject {
  uid: string;
  role: Role;
  missionId: string | null;
}

export type Section = "crew" | "medical" | "mission" | "research" | "admin";

export const SECTION_ROLES: Record<Section, Role[]> = {
  crew: ["astronaut"],
  medical: ["medical"],
  mission: ["commander"],
  research: ["researcher", "medical", "commander", "admin"],
  admin: ["admin"],
};

export const HOME_FOR_ROLE: Record<Role, string> = {
  astronaut: "/app/crew/dashboard",
  medical: "/app/medical/dashboard",
  commander: "/app/mission/dashboard",
  researcher: "/app/research",
  admin: "/app/admin/users",
};

export function canAccessSection(actor: Actor, section: Section): boolean {
  return actor.status === "active" && SECTION_ROLES[section].includes(actor.role);
}

/** Medical officer assigned to the same mission as an astronaut subject. */
export function isAssignedMedical(actor: Actor, subject: Subject): boolean {
  return (
    actor.status === "active" &&
    actor.role === "medical" &&
    actor.missionId !== null &&
    actor.missionId === subject.missionId &&
    subject.role === "astronaut"
  );
}

/** Kinds a crew member may create/edit for themselves. */
export const SELF_WRITABLE: PersonalKind[] = [
  "wearableSessions",
  "checkIns",
  "vitals",
  "sleepLogs",
  "hydrationLogs",
  "mealLogs",
  "activityLogs",
  "moodLogs",
  "journal",
  "cognitiveTests",
  "symptomReports",
  "medicationLogs",
  "medications",
];

/** Kinds an assigned medical officer may create for a crew member (append-only). */
export const MEDICAL_WRITABLE: PersonalKind[] = ["medications", "clinicalNotes", "vitals"];

export function canReadPersonal(actor: Actor, subject: Subject, kind: PersonalKind): boolean {
  if (actor.status !== "active") return false;
  if (actor.uid === subject.uid) return kind !== "clinicalNotes" || actor.role === "medical";
  // Private journal is readable ONLY by its author — not medical, not commander, not admin.
  if (kind === "journal") return false;
  return isAssignedMedical(actor, subject);
}

export function canWritePersonal(actor: Actor, subject: Subject, kind: PersonalKind): boolean {
  if (actor.status !== "active") return false;
  if (actor.uid === subject.uid) return actor.role === "astronaut" && SELF_WRITABLE.includes(kind);
  return isAssignedMedical(actor, subject) && MEDICAL_WRITABLE.includes(kind);
}

/** Mood entries are only visible to medical when the author opted to share them. */
export function filterMoodForViewer(actor: Actor, subject: Subject, logs: MoodLog[]): MoodLog[] {
  if (actor.uid === subject.uid) return logs;
  if (!isAssignedMedical(actor, subject)) return [];
  return logs.filter((l) => l.shareWithMedical);
}

export function canManageMissionMedical(actor: Actor, missionId: string): boolean {
  return actor.status === "active" && actor.role === "medical" && actor.missionId === missionId;
}

export function canViewCommanderSummary(actor: Actor, missionId: string): boolean {
  return actor.status === "active" && actor.role === "commander" && actor.missionId === missionId;
}

export function canEditMissionTimeline(actor: Actor, missionId: string): boolean {
  return (
    actor.status === "active" &&
    actor.missionId === missionId &&
    (actor.role === "commander" || actor.role === "medical")
  );
}

export function canAdminister(actor: Actor): boolean {
  return actor.status === "active" && actor.role === "admin";
}

/** Only admins can change roles; nobody (including admins) can change their own role. */
export function canAssignRole(actor: Actor, targetUid: string): boolean {
  return canAdminister(actor) && actor.uid !== targetUid;
}

export function canExportHandover(actor: Actor, subject: Subject): boolean {
  return isAssignedMedical(actor, subject);
}

export function canViewResearchAggregates(actor: Actor): boolean {
  return actor.status === "active" && ["researcher", "medical", "admin"].includes(actor.role);
}

/** Profile fields a user may change on their own record. Role, status, missionId are excluded. */
export const SELF_EDITABLE_PROFILE_FIELDS = [
  "displayName",
  "callSign",
  "dietaryConstraints",
  "allergies",
  "preferences",
] as const;

/**
 * Privacy threshold for aggregates (k-anonymity style): suppress any aggregate computed over
 * fewer than `minGroup` people so an individual's value cannot be inferred.
 */
export function privateAggregate(values: number[], minGroup: number): { value: number | null; n: number; suppressed: boolean } {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < minGroup) return { value: null, n: v.length, suppressed: true };
  return { value: v.reduce((s, x) => s + x, 0) / v.length, n: v.length, suppressed: false };
}

/** Human-readable permission matrix shown on /app/admin/roles. */
export const PERMISSION_MATRIX: { capability: string; roles: Partial<Record<Role, string>> }[] = [
  { capability: "Own health records (enter & view)", roles: { astronaut: "Yes" } },
  { capability: "Private journal", roles: { astronaut: "Author only" } },
  { capability: "Assigned crew health records", roles: { medical: "Assigned mission only" } },
  { capability: "Mood check-ins of others", roles: { medical: "Only entries the crew member shared" } },
  { capability: "Clinical notes (append-only)", roles: { medical: "Assigned mission only" } },
  { capability: "Alerts: acknowledge / assign / resolve", roles: { medical: "Yes, audited" } },
  { capability: "Crew readiness summary", roles: { commander: "Operational, privacy-thresholded", medical: "Yes" } },
  { capability: "Mission timeline & workload planner", roles: { commander: "Edit", medical: "Edit", astronaut: "Own schedule" } },
  { capability: "Public research data (NASA OSDR)", roles: { medical: "Yes", commander: "Yes", researcher: "Yes", admin: "Yes" } },
  { capability: "De-identified aggregate insights", roles: { researcher: "k ≥ privacy threshold", medical: "Yes", admin: "Yes" } },
  { capability: "Medical handover export", roles: { medical: "Assigned mission only, audited" } },
  { capability: "Users, roles, missions, settings", roles: { admin: "Yes, audited (cannot change own role)" } },
  { capability: "Identifiable crew health records", roles: { admin: "No", researcher: "No", commander: "No" } },
];
