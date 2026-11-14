"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, toActor } from "@/lib/auth/current-user";
import { addMissionDoc, audit, getMissionDoc, getSettings, getUser, listMembers, notify, setMissionDoc, updateMissionDoc } from "@/lib/data/repo";
import { isAssignedMedical } from "@/lib/permissions";
import { toSubject } from "@/lib/permissions/server";
import { answerSchema, exercisePlanSchema, questionSchema, skillCardSchema } from "@/lib/validation/schemas";
import { questionTiming } from "@/lib/questions/eta";
import { ATTACH_LABELS, buildAttachmentPreviews } from "@/lib/questions/attachments";

type R = { ok: boolean; message: string };

// ---------------- Ask the Doctor ----------------

/** Crew sends a store-and-forward question. Never queued offline: it is either stored or clearly not sent. */
export async function askDoctor(input: unknown): Promise<R> {
  const u = await getCurrentUser();
  if (!u || u.role !== "astronaut" || u.status !== "active") return { ok: false, message: "Only crew members can ask the doctor here." };
  if (!u.missionId) return { ok: false, message: "You need to be on a mission to reach a flight surgeon." };
  const p = questionSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const settings = await getSettings();
  const previews = await buildAttachmentPreviews(u.uid);
  const t = questionTiming(new Date(), { delaySeconds: settings.commDelaySeconds, windowEveryHours: settings.commWindowEveryHours });
  await addMissionDoc(u.missionId, "questions", {
    missionId: u.missionId,
    crewUid: u.uid,
    crewLabel: u.callSign ?? u.displayName,
    text: p.data.text,
    topic: p.data.topic,
    priority: p.data.priority,
    attachments: p.data.attach.map((k) => ({ label: ATTACH_LABELS[k], summary: previews[k] })),
    createdAt: new Date().toISOString(),
    sendAt: t.sendAt,
    arriveAt: t.arriveAt,
    answer: null,
    readAt: null,
    origin: "user",
  });
  for (const m of (await listMembers(u.missionId)).filter((x) => x.assignment === "medical")) {
    await notify({ uid: m.uid, kind: "medical_review", title: `New question from ${u.callSign ?? u.displayName}`, body: p.data.priority === "soon" ? "Marked: soon" : "Routine", href: "/app/medical/questions" });
  }
  revalidatePath("/app/crew/ask");
  return { ok: true, message: "Question sent" };
}

export async function markAnswerRead(questionId: string): Promise<R> {
  const u = await getCurrentUser();
  if (!u?.missionId) return { ok: false, message: "Not signed in" };
  const q = await getMissionDoc(u.missionId, "questions", questionId);
  if (!q || q.crewUid !== u.uid || !q.answer) return { ok: false, message: "Not found" };
  if (Date.parse(q.answer.arriveAt) > Date.now()) return { ok: false, message: "The answer hasn't arrived yet." };
  await updateMissionDoc(u.missionId, "questions", q.id, { readAt: new Date().toISOString() });
  revalidatePath("/app/crew/ask");
  return { ok: true, message: "Marked as read" };
}

/** Flight surgeon answers. The reply takes the same delayed path back to the habitat. */
export async function answerQuestion(input: unknown): Promise<R> {
  const u = await getCurrentUser();
  if (!u || u.role !== "medical" || !u.missionId) return { ok: false, message: "Not authorised" };
  const p = answerSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const q = await getMissionDoc(u.missionId, "questions", p.data.questionId);
  if (!q) return { ok: false, message: "Question not found" };
  if (Date.parse(q.arriveAt) > Date.now()) return { ok: false, message: "This question is still travelling — it hasn't reached Earth yet." };
  const settings = await getSettings();
  const t = questionTiming(new Date(), { delaySeconds: settings.commDelaySeconds, windowEveryHours: settings.commWindowEveryHours });
  await updateMissionDoc(u.missionId, "questions", q.id, { answer: { text: p.data.text, byUid: u.uid, byName: u.displayName, at: new Date().toISOString(), arriveAt: t.arriveAt } });
  await audit({ missionId: u.missionId, actorUid: u.uid, actorName: u.displayName, action: "question.answer", target: `questions/${q.id}` });
  await notify({ uid: q.crewUid, kind: "medical_review", title: "Your doctor replied", body: "Open Ask the doctor to read it once it arrives.", href: "/app/crew/ask" });
  revalidatePath("/app/medical/questions");
  return { ok: true, message: "Answer sent" };
}

// ---------------- Exercise Balance ----------------

export async function setExercisePlan(input: unknown): Promise<R> {
  const u = await getCurrentUser();
  const p = exercisePlanSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const s = await getUser(p.data.crewUid);
  if (!u || !s || !isAssignedMedical(toActor(u), toSubject(s)) || !u.missionId) return { ok: false, message: "Not authorised for this crew member" };
  await setMissionDoc(u.missionId, "exercisePlans", {
    id: s.uid,
    missionId: u.missionId,
    crewUid: s.uid,
    resistanceMinPerWeek: p.data.resistanceMinPerWeek,
    aerobicMinPerWeek: p.data.aerobicMinPerWeek,
    mobilityMinPerWeek: p.data.mobilityMinPerWeek,
    setBy: u.uid,
    setByName: u.displayName,
    updatedAt: new Date().toISOString(),
    origin: "user",
  });
  await audit({ missionId: u.missionId, actorUid: u.uid, actorName: u.displayName, action: "exercisePlan.set", target: `users/${s.uid}` });
  await notify({ uid: s.uid, kind: "care_plan", title: "Exercise targets updated", body: "Your weekly exercise balance has new targets.", href: "/app/crew/activity" });
  revalidatePath(`/app/medical/crew/${s.uid}`);
  return { ok: true, message: "Weekly targets saved" };
}

// ---------------- Skill Keeper ----------------

export async function addSkillCard(input: unknown): Promise<R> {
  const u = await getCurrentUser();
  if (!u || u.role !== "medical" || !u.missionId) return { ok: false, message: "Not authorised" };
  const p = skillCardSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  await addMissionDoc(u.missionId, "skillCards", { missionId: u.missionId, ...p.data, authoredBy: u.displayName, createdAt: new Date().toISOString(), origin: "user" });
  await audit({ missionId: u.missionId, actorUid: u.uid, actorName: u.displayName, action: "skillCard.add", target: p.data.title });
  revalidatePath("/app/medical/skills");
  return { ok: true, message: "Practice card added for the crew" };
}
