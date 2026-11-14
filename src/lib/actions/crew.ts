"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { addMissionDoc, getMissionDoc, getSettings, listMembers, notify, updateMissionDoc, addLesson } from "@/lib/data/repo";
import { consultationSchema, lessonSchema, messageSchema } from "@/lib/validation/schemas";

export type ActionResult = { ok: boolean; message: string };

/** Crew server actions. Each re-authenticates and re-authorises — never trusts client input. */
async function crewUser() {
  const u = await getCurrentUser();
  if (!u || u.role !== "astronaut" || u.status !== "active") throw new Error("Not authorised");
  return u;
}

export async function toggleCarePlanTask(planId: string, taskId: string): Promise<ActionResult> {
  const u = await crewUser();
  if (!u.missionId) return { ok: false, message: "No mission assigned." };
  const plan = await getMissionDoc(u.missionId, "carePlans", planId);
  if (!plan || plan.crewUid !== u.uid) return { ok: false, message: "Care plan not found." };
  const tasks = plan.tasks.map((t) => (t.id === taskId ? { ...t, doneAt: t.doneAt ? null : new Date().toISOString() } : t));
  await updateMissionDoc(u.missionId, "carePlans", planId, { tasks, status: tasks.every((t) => t.doneAt) ? "completed" : "active" });
  revalidatePath("/app/crew/my-plan");
  return { ok: true, message: "Updated." };
}

export async function requestConsultation(input: unknown): Promise<ActionResult> {
  const u = await crewUser();
  const p = consultationSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  if (!u.missionId) return { ok: false, message: "You need a mission assignment before requesting a consultation." };
  const now = new Date().toISOString();
  await addMissionDoc(u.missionId, "consultations", {
    missionId: u.missionId,
    crewUid: u.uid,
    crewLabel: u.callSign ?? u.displayName,
    reason: p.data.reason,
    preferredWindow: p.data.preferredWindow,
    status: "requested",
    scheduledFor: null,
    createdAt: now,
    history: [{ at: now, by: u.uid, byName: u.displayName, action: "Requested" }],
    origin: "user",
  });
  for (const m of (await listMembers(u.missionId)).filter((m) => m.assignment === "medical")) {
    await notify({ uid: m.uid, kind: "medical_review", title: "Consultation requested", body: `${u.callSign ?? u.displayName} requested a consultation.`, href: "/app/medical/consultations" });
  }
  revalidatePath("/app/crew/my-plan");
  return { ok: true, message: "Request sent to your care team." };
}

/**
 * Messages honour the simulated communication delay: deliverAt = now + delay. The UI derives
 * sent → received → acknowledged states from these timestamps and never claims early delivery.
 */
export async function sendCrewMessage(input: unknown): Promise<ActionResult> {
  const u = await crewUser();
  const p = messageSchema.safeParse({ ...(input as object), toUid: "care-team" });
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  if (!u.missionId) return { ok: false, message: "No mission assigned." };
  const settings = await getSettings();
  const now = Date.now();
  await addMissionDoc(u.missionId, "messages", {
    missionId: u.missionId,
    threadId: u.uid,
    fromUid: u.uid,
    fromName: u.displayName,
    toUid: "care-team",
    body: p.data.body,
    priority: p.data.priority,
    createdAt: new Date(now).toISOString(),
    deliverAt: new Date(now + settings.commDelaySeconds * 1000).toISOString(),
    acknowledgedAt: null,
    origin: "user",
  });
  revalidatePath("/app/crew/my-plan");
  return { ok: true, message: settings.commDelaySeconds ? `Sent. With the current ${Math.round(settings.commDelaySeconds / 60)}-min delay it cannot be received before then.` : "Sent." };
}

export async function acknowledgeMessage(messageId: string): Promise<ActionResult> {
  const u = await crewUser();
  if (!u.missionId) return { ok: false, message: "No mission." };
  const m = await getMissionDoc(u.missionId, "messages", messageId);
  if (!m || m.toUid !== u.uid) return { ok: false, message: "Message not found." };
  if (Date.parse(m.deliverAt) > Date.now()) return { ok: false, message: "This message has not been received yet." };
  await updateMissionDoc(u.missionId, "messages", messageId, { acknowledgedAt: new Date().toISOString() });
  revalidatePath("/app/crew/my-plan");
  return { ok: true, message: "Acknowledged." };
}

/** Crew Knowledge Capture: anyone on a mission may submit a NON-sensitive operational lesson. */
export async function submitLesson(input: unknown): Promise<ActionResult> {
  const u = await getCurrentUser();
  if (!u || u.status !== "active") return { ok: false, message: "Not signed in." };
  const p = lessonSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  await addLesson({
    ...p.data,
    missionId: u.missionId,
    status: "submitted",
    submittedBy: u.callSign ?? u.displayName,
    approvedBy: null,
    createdAt: new Date().toISOString(),
    origin: "user",
  });
  revalidatePath("/app/knowledge");
  return { ok: true, message: "Thanks! A medical officer will review it before it's published." };
}
