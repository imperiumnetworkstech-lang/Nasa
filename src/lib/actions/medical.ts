"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, toActor } from "@/lib/auth/current-user";
import { runAlertsForCrew } from "@/lib/alerts/service";
import { addMissionDoc, addPersonal, audit, getMissionDoc, getPersonal, getSettings, getUser, listCrew, notify, updateMissionDoc, updatePersonal, updateLesson, addMissionDoc as addDoc } from "@/lib/data/repo";
import { canEditMissionTimeline, isAssignedMedical } from "@/lib/permissions";
import { toSubject } from "@/lib/permissions/server";
import { alertActionSchema, carePlanSchema, clinicalNoteSchema, medicationSchema, messageSchema, missionEventSchema, symptomUpdateSchema } from "@/lib/validation/schemas";
import { newId } from "@/lib/data/store";
import type { AlertStatus } from "@/lib/types";
import { z } from "zod";

type R = { ok: boolean; message: string };

async function medic() {
  const u = await getCurrentUser();
  if (!u || u.role !== "medical" || u.status !== "active" || !u.missionId) throw new Error("Not authorised");
  return u as typeof u & { missionId: string };
}
async function assigned(crewUid: string) {
  const u = await medic();
  const s = await getUser(crewUid);
  if (!s || !isAssignedMedical(toActor(u), toSubject(s))) throw new Error("Not authorised for this crew member");
  return { u, s };
}

const NEXT_STATUS: Record<string, AlertStatus> = { acknowledge: "acknowledged", assign: "assigned", escalate: "escalated", resolve: "resolved", reopen: "open" };

/** Alert workflow with a full audit trail. */
export async function alertAction(input: unknown): Promise<R> {
  const u = await medic();
  const p = alertActionSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const a = await getMissionDoc(u.missionId, "alerts", p.data.alertId);
  if (!a) return { ok: false, message: "Alert not found." };
  const status = NEXT_STATUS[p.data.action];
  const assignee = p.data.action === "assign" ? p.data.assignee || u.uid : a.assignedTo;
  const history = [...a.history, { at: new Date().toISOString(), by: u.uid, byName: u.displayName, action: status[0].toUpperCase() + status.slice(1), note: p.data.note }];
  await updateMissionDoc(u.missionId, "alerts", a.id, { status, assignedTo: assignee ?? null, history });
  await audit({ missionId: u.missionId, actorUid: u.uid, actorName: u.displayName, action: `alert.${p.data.action}`, target: `alerts/${a.id}` });
  if (p.data.action === "assign" && assignee && assignee !== u.uid) await notify({ uid: assignee, kind: "alert", title: "Alert assigned to you", body: a.title, href: "/app/medical/alerts" });
  revalidatePath("/app/medical", "layout");
  return { ok: true, message: `Alert ${status}.` };
}

export async function rerunAlerts(): Promise<R> {
  const u = await medic();
  let n = 0;
  for (const c of await listCrew(u.missionId)) n += (await runAlertsForCrew(c.uid)).length;
  await audit({ missionId: u.missionId, actorUid: u.uid, actorName: u.displayName, action: "alerts.evaluate", target: `missions/${u.missionId}` });
  revalidatePath("/app/medical", "layout");
  return { ok: true, message: n ? `${n} new alert(s) created.` : "No new alerts — rules re-evaluated." };
}

/** Symptom status changes are APPENDED to history; the crew member's original text is never edited. */
export async function updateSymptom(input: unknown): Promise<R> {
  const p = symptomUpdateSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const { u } = await assigned(p.data.crewUid);
  const r = await getPersonal(p.data.crewUid, "symptomReports", p.data.reportId);
  if (!r) return { ok: false, message: "Report not found." };
  const label = p.data.status.replace(/_/g, " ");
  await updatePersonal(p.data.crewUid, "symptomReports", r.id, {
    status: p.data.status,
    history: [...r.history, { at: new Date().toISOString(), by: u.uid, byName: u.displayName, action: label[0].toUpperCase() + label.slice(1), note: p.data.note }],
  });
  await audit({ missionId: u.missionId, actorUid: u.uid, actorName: u.displayName, action: "symptom.status", target: `users/${p.data.crewUid}/symptomReports/${r.id}`, detail: `${r.status} → ${p.data.status}` });
  await notify({ uid: p.data.crewUid, kind: "medical_review", title: "Symptom report updated", body: `Status: ${label}`, href: "/app/crew/symptoms" });
  revalidatePath(`/app/medical/crew/${p.data.crewUid}`);
  return { ok: true, message: "Status updated." };
}

export async function addClinicalNote(input: unknown): Promise<R> {
  const p = clinicalNoteSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const { u, s } = await assigned(p.data.crewUid);
  await addPersonal(s.uid, "clinicalNotes", {
    uid: s.uid,
    missionId: s.missionId,
    origin: "user",
    createdAt: new Date().toISOString(),
    enteredBy: u.uid,
    authorName: u.displayName,
    text: p.data.text,
    correctsNoteId: p.data.correctsNoteId,
  });
  await audit({ missionId: u.missionId, actorUid: u.uid, actorName: u.displayName, action: "clinicalNote.add", target: `users/${s.uid}/clinicalNotes` });
  revalidatePath(`/app/medical/crew/${s.uid}`);
  return { ok: true, message: "Note added (append-only)." };
}

export async function addMedication(crewUid: string, input: unknown): Promise<R> {
  const p = medicationSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const { u, s } = await assigned(crewUid);
  await addPersonal(s.uid, "medications", { uid: s.uid, missionId: s.missionId, origin: "user", createdAt: new Date().toISOString(), enteredBy: u.uid, ...p.data, active: true });
  await audit({ missionId: u.missionId, actorUid: u.uid, actorName: u.displayName, action: "medication.add", target: `users/${s.uid}/medications` });
  await notify({ uid: s.uid, kind: "medication", title: "Medication plan updated", body: p.data.name, href: "/app/crew/medications" });
  revalidatePath(`/app/medical/crew/${s.uid}`);
  return { ok: true, message: "Medication added to plan." };
}

export async function createCarePlan(input: unknown): Promise<R> {
  const p = carePlanSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const { u, s } = await assigned(p.data.crewUid);
  await addMissionDoc(u.missionId, "carePlans", {
    missionId: u.missionId,
    crewUid: s.uid,
    title: p.data.title,
    tasks: p.data.tasks.map((t) => ({ id: newId("t"), title: t.title, due: t.due, doneAt: null })),
    status: "active",
    createdBy: u.uid,
    createdByName: u.displayName,
    createdAt: new Date().toISOString(),
    origin: "user",
  });
  await notify({ uid: s.uid, kind: "care_plan", title: "New care plan", body: p.data.title, href: "/app/crew/my-plan" });
  await audit({ missionId: u.missionId, actorUid: u.uid, actorName: u.displayName, action: "carePlan.create", target: `users/${s.uid}` });
  revalidatePath("/app/medical/care-plans");
  return { ok: true, message: "Care plan created and crew member notified." };
}

export async function updateConsultation(input: unknown): Promise<R> {
  const u = await medic();
  const p = z.object({ id: z.string(), status: z.enum(["scheduled", "completed", "cancelled"]), scheduledFor: z.string().optional(), note: z.string().max(500).optional() }).safeParse(input);
  if (!p.success) return { ok: false, message: "Invalid request" };
  const c = await getMissionDoc(u.missionId, "consultations", p.data.id);
  if (!c) return { ok: false, message: "Not found" };
  await updateMissionDoc(u.missionId, "consultations", c.id, {
    status: p.data.status,
    scheduledFor: p.data.scheduledFor ? new Date(p.data.scheduledFor).toISOString() : c.scheduledFor,
    history: [...c.history, { at: new Date().toISOString(), by: u.uid, byName: u.displayName, action: p.data.status, note: p.data.note }],
  });
  await notify({ uid: c.crewUid, kind: "medical_review", title: `Consultation ${p.data.status}`, body: c.reason, href: "/app/crew/my-plan" });
  revalidatePath("/app/medical/consultations");
  return { ok: true, message: "Updated." };
}

export async function sendMedicalMessage(crewUid: string, input: unknown): Promise<R> {
  const p = messageSchema.safeParse({ ...(input as object), toUid: crewUid });
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const { u } = await assigned(crewUid);
  const settings = await getSettings();
  const now = Date.now();
  await addDoc(u.missionId, "messages", {
    missionId: u.missionId,
    threadId: crewUid,
    fromUid: u.uid,
    fromName: u.displayName,
    toUid: crewUid,
    body: p.data.body,
    priority: p.data.priority,
    createdAt: new Date(now).toISOString(),
    deliverAt: new Date(now + settings.commDelaySeconds * 1000).toISOString(),
    acknowledgedAt: null,
    origin: "user",
  });
  revalidatePath("/app/medical/consultations");
  return { ok: true, message: settings.commDelaySeconds ? "Sent — will be received after the simulated delay." : "Sent." };
}

export async function addMissionEvent(input: unknown): Promise<R> {
  const u = await getCurrentUser();
  if (!u || !u.missionId || !canEditMissionTimeline(toActor(u), u.missionId)) return { ok: false, message: "Not authorised" };
  const p = missionEventSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  await addMissionDoc(u.missionId, "missionEvents", {
    missionId: u.missionId,
    ...p.data,
    start: new Date(p.data.start).toISOString(),
    end: p.data.end ? new Date(p.data.end).toISOString() : null,
    createdBy: u.uid,
    createdAt: new Date().toISOString(),
    origin: "user",
  });
  await audit({ missionId: u.missionId, actorUid: u.uid, actorName: u.displayName, action: "missionEvent.add", target: p.data.title });
  revalidatePath("/app", "layout");
  return { ok: true, message: "Event added to the timeline." };
}

export async function reviewLesson(id: string, decision: "published" | "rejected"): Promise<R> {
  const u = await medic();
  await updateLesson(id, { status: decision, approvedBy: decision === "published" ? u.displayName : null });
  await audit({ missionId: u.missionId, actorUid: u.uid, actorName: u.displayName, action: `lesson.${decision}`, target: `lessons/${id}` });
  revalidatePath("/app/knowledge");
  return { ok: true, message: decision === "published" ? "Published (de-identified)." : "Rejected." };
}
