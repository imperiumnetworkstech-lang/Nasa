"use server";

/**
 * Server-side adapters from raw HTML form fields to typed action inputs.
 * Every underlying action re-validates with Zod and re-checks permissions.
 * `__tz` is the browser's getTimezoneOffset() so datetime-local values are interpreted in the
 * user's local time rather than the server's.
 */
import { requestConsultation, sendCrewMessage, submitLesson } from "./crew";
import { addClinicalNote, addMedication, addMissionEvent, alertAction, createCarePlan, sendMedicalMessage, updateConsultation, updateSymptom } from "./medical";
import { createInvite, updateSettings, upsertMission } from "./admin";

export type Raw = Record<string, string | string[]>;

const s = (r: Raw, k: string) => {
  const v = r[k];
  return (Array.isArray(v) ? v[0] : v)?.toString().trim() ?? "";
};
const opt = (r: Raw, k: string) => s(r, k) || undefined;
const arr = (r: Raw, k: string) => {
  const v = r[k];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
};
/** datetime-local / date string in the user's timezone → ISO UTC. */
function localToIso(r: Raw, k: string): string | undefined {
  const v = s(r, k);
  if (!v) return undefined;
  const tz = Number(s(r, "__tz")) || 0;
  const [d, t = "00:00"] = v.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  if (![y, mo, da, h, mi].every(Number.isFinite)) return undefined;
  return new Date(Date.UTC(y, mo - 1, da, h, mi) + tz * 60_000).toISOString();
}
const lines = (r: Raw, k: string) =>
  s(r, k)
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

// ---- crew ----
export async function consultationForm(r: Raw) {
  return requestConsultation({ reason: s(r, "reason"), preferredWindow: s(r, "window") });
}
export async function crewMessageForm(r: Raw) {
  return sendCrewMessage({ body: s(r, "body"), priority: s(r, "priority") || "routine" });
}
export async function lessonForm(r: Raw) {
  return submitLesson({
    title: s(r, "title"),
    body: s(r, "body"),
    tags: s(r, "tags")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    phase: s(r, "phase") || "Unspecified",
    module: s(r, "module") || "General",
  });
}

// ---- medical ----
export async function alertForm(alertId: string, r: Raw) {
  return alertAction({ alertId, action: s(r, "action"), note: opt(r, "note"), assignee: opt(r, "assignee") });
}
export async function symptomStatusForm(crewUid: string, reportId: string, r: Raw) {
  return updateSymptom({ crewUid, reportId, status: s(r, "status"), note: opt(r, "note") });
}
export async function medicationForm(crewUid: string, r: Raw) {
  return addMedication(crewUid, { name: s(r, "name"), dose: s(r, "dose"), schedule: s(r, "schedule"), instructions: opt(r, "instructions") });
}
export async function carePlanForm(crewUidBound: string | null, r: Raw) {
  const due = localToIso(r, "due") ?? null;
  return createCarePlan({ crewUid: crewUidBound ?? s(r, "crew"), title: s(r, "title"), tasks: lines(r, "tasks").map((title) => ({ title, due })) });
}
export async function clinicalNoteForm(crewUid: string, r: Raw) {
  return addClinicalNote({ crewUid, text: s(r, "text"), correctsNoteId: opt(r, "corrects") });
}
export async function consultationUpdateForm(id: string, r: Raw) {
  return updateConsultation({ id, status: s(r, "status"), scheduledFor: localToIso(r, "when"), note: opt(r, "note") });
}
export async function medicalMessageForm(crewUid: string, r: Raw) {
  return sendMedicalMessage(crewUid, { body: s(r, "body"), priority: "routine" });
}
export async function missionEventForm(r: Raw) {
  return addMissionEvent({
    type: s(r, "type"),
    title: s(r, "title"),
    start: localToIso(r, "start") ?? "",
    end: localToIso(r, "end"),
    workload: s(r, "workload") || null,
    crewUids: arr(r, "crew"),
    notes: opt(r, "notes"),
  });
}

// ---- admin ----
export async function inviteForm(r: Raw) {
  return createInvite({ role: s(r, "role"), missionId: s(r, "mission") || null, usesLeft: Number(s(r, "uses")) });
}
export async function missionForm(id: string | null, r: Raw) {
  return upsertMission({
    id: id ?? undefined,
    name: s(r, "name"),
    missionCode: s(r, "code"),
    description: s(r, "desc"),
    startAt: localToIso(r, "start") ?? "",
    endAt: localToIso(r, "end") ?? null,
    status: s(r, "status"),
    timezone: s(r, "tz") || "UTC",
  });
}
const THRESHOLD_KEYS = ["hrDriftZ", "baselineWindowDays", "baselineMinObservations", "minSleepHours", "spo2Below", "temperatureAboveC", "missedCheckInDays", "sustainedStressCount", "minRestHoursBetweenHighWorkload"];
export async function settingsForm(r: Raw) {
  return updateSettings({
    commDelaySeconds: Math.round(Number(s(r, "commDelayMin")) * 60),
    commWindowEveryHours: Number(s(r, "commWindowEveryHours")) || 0,
    privacyMinGroupSize: Number(s(r, "privacyMinGroupSize")),
    thresholds: Object.fromEntries(THRESHOLD_KEYS.map((k) => [k, Number(s(r, k))])),
    features: { readinessSummary: s(r, "readinessSummary") === "on", guideAI: s(r, "guideAI") === "on", environmentOverlay: s(r, "environmentOverlay") === "on" },
  });
}

// ---- new features ----
import { addSkillCard, answerQuestion, askDoctor, setExercisePlan } from "./features";

export async function askDoctorForm(r: Raw) {
  return askDoctor({ text: s(r, "text"), topic: s(r, "topic") || "other", priority: s(r, "priority") || "routine", attach: arr(r, "attach") });
}
export async function answerForm(questionId: string, r: Raw) {
  return answerQuestion({ questionId, text: s(r, "text") });
}
export async function exercisePlanForm(crewUid: string, r: Raw) {
  return setExercisePlan({
    crewUid,
    resistanceMinPerWeek: Number(s(r, "resistance")),
    aerobicMinPerWeek: Number(s(r, "aerobic")),
    mobilityMinPerWeek: Number(s(r, "mobility")),
  });
}
export async function skillCardForm(r: Raw) {
  return addSkillCard({ title: s(r, "title"), prompt: s(r, "prompt"), answer: s(r, "answer"), category: s(r, "category"), halfLifeDays: Number(s(r, "halfLife")) });
}
