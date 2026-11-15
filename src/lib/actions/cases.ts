"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isDemoEnabled } from "@/lib/config";
import { audit, bumpMissionPulse, getMissionDoc, getUser, listMembers, notify, updateMissionDoc } from "@/lib/data/repo";
import { createCaseFromReadings } from "@/lib/cases";
import { getScenario } from "@/lib/scenarios";
import type { HealthCase } from "@/lib/types";

type R<T = undefined> = { ok: boolean; message: string; data?: T };

/** Crew taps a scenario box on their own dashboard. */
export async function runMyScenario(scenarioId: string): Promise<R<HealthCase>> {
  const u = await getCurrentUser();
  if (!u || u.role !== "astronaut") return { ok: false, message: "Only crew members can run their own suit scenarios." };
  if (!u.missionId) return { ok: false, message: "You need to be on a mission." };
  const s = getScenario(scenarioId);
  if (!s) return { ok: false, message: "Unknown scenario" };
  const c = await createCaseFromReadings(u, s);
  revalidatePath("/app", "layout");
  return { ok: true, message: c.analysis.message, data: c };
}

/**
 * Scenario console (demo only): pick any DEMO astronaut and a scenario.
 * Disabled entirely when demo mode is off, and limited to seeded demo crew.
 */
export async function runConsoleScenario(crewUid: string, scenarioId: string): Promise<R<HealthCase>> {
  if (!isDemoEnabled()) return { ok: false, message: "The scenario console is only available in demo mode." };
  const crew = await getUser(crewUid);
  if (!crew || !crew.isDemo || crew.role !== "astronaut") return { ok: false, message: "Pick a demo astronaut." };
  const s = getScenario(scenarioId);
  if (!s) return { ok: false, message: "Unknown scenario" };
  const c = await createCaseFromReadings(crew, s);
  revalidatePath("/app", "layout");
  return { ok: true, message: c.analysis.message, data: c };
}

const reviewSchema = z.object({
  caseId: z.string().min(1),
  remedy: z.string().max(3000),
  medicines: z.string().max(3000),
  note: z.string().max(1000).optional(),
});

/** Doctor ADDS extra remedy steps / medicines / a note. The model's recommendation stays. */
export async function reviewCase(raw: Record<string, string | string[]>): Promise<R> {
  const u = await getCurrentUser();
  if (!u || u.role !== "medical" || !u.missionId) return { ok: false, message: "Only the mission's doctor can review cases." };
  const p = reviewSchema.safeParse({ caseId: raw.caseId, remedy: raw.remedy ?? "", medicines: raw.medicines ?? "", note: raw.note || undefined });
  if (!p.success) return { ok: false, message: "Please check the form." };
  const c = await getMissionDoc(u.missionId, "cases", p.data.caseId);
  if (!c) return { ok: false, message: "Case not found." };
  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
  const added = lines(p.data.medicines).map((l) => {
    const [name, ...rest] = l.split(/\s[—-]\s/);
    return { name: name.trim(), purpose: rest.join(" — ").trim() || "Added by your doctor", addedBy: u.displayName };
  });
  const extraSteps = lines(p.data.remedy).map((r) => `${r} (added by ${u.displayName})`);
  if (!added.length && !extraSteps.length && !p.data.note) return { ok: false, message: "Add a medicine, a step or a note." };
  const medicines = [...c.medicines, ...added];
  await updateMissionDoc(u.missionId, "cases", c.id, {
    remedy: [...c.remedy, ...extraSteps],
    medicines,
    medicineStatus: medicines.length ? "recommended" : "none",
    doctorNote: p.data.note ?? c.doctorNote ?? null,
    reviewedBy: u.displayName,
    reviewedAt: new Date().toISOString(),
  });
  await bumpMissionPulse(u.missionId);
  await audit({ missionId: u.missionId, actorUid: u.uid, actorName: u.displayName, action: "case.review", target: `cases/${c.id}` });
  await notify({ uid: c.crewUid, kind: "medical_review", title: `🩺 ${u.displayName} added to your care`, body: p.data.note || `${c.analysis.label}: new advice from your doctor.`, href: "/app/crew/dashboard" });
  for (const m of (await listMembers(u.missionId)).filter((x) => x.assignment === "commander")) {
    await notify({ uid: m.uid, kind: "alert", title: `Doctor added to ${c.crewName}'s care`, body: c.analysis.label, href: "/app/mission/dashboard" });
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Added — crew and commander notified" };
}

export async function resolveCase(caseId: string): Promise<R> {
  const u = await getCurrentUser();
  if (!u || u.role !== "medical" || !u.missionId) return { ok: false, message: "Only the doctor can close a case." };
  const c = await getMissionDoc(u.missionId, "cases", caseId);
  if (!c) return { ok: false, message: "Case not found." };
  await updateMissionDoc(u.missionId, "cases", caseId, { status: "resolved", resolvedAt: new Date().toISOString() });
  await bumpMissionPulse(u.missionId);
  await audit({ missionId: u.missionId, actorUid: u.uid, actorName: u.displayName, action: "case.resolve", target: `cases/${caseId}` });
  await notify({ uid: c.crewUid, kind: "medical_review", title: "✅ Case closed by your doctor", body: c.analysis.label, href: "/app/crew/dashboard" });
  for (const m of (await listMembers(u.missionId)).filter((x) => x.assignment === "commander")) {
    await notify({ uid: m.uid, kind: "alert", title: `✅ ${c.crewName} case closed`, body: c.analysis.label, href: "/app/mission/dashboard" });
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Case closed" };
}
