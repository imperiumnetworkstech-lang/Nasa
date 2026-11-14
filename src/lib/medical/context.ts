import "server-only";
import { notFound } from "next/navigation";
import { requireSection, toActor } from "@/lib/auth/current-user";
import { audit, getMission, getUser, listCrew } from "@/lib/data/repo";
import { isAssignedMedical } from "@/lib/permissions";
import { toSubject } from "@/lib/permissions/server";

/** Medical pages: the officer only ever sees crew of the mission they are assigned to. */
export async function medicalContext() {
  const user = await requireSection("medical");
  const mission = user.missionId ? await getMission(user.missionId) : null;
  const crew = user.missionId ? await listCrew(user.missionId) : [];
  return { user, mission, crew, tz: user.preferences.timezone || "UTC" };
}

/** Loads a crew member only if this officer is assigned to them; otherwise 404 (no existence leak). Audited. */
export async function assignedCrewMember(crewId: string, opts: { auditAction?: string } = {}) {
  const ctx = await medicalContext();
  const subject = await getUser(crewId);
  if (!subject || !isAssignedMedical(toActor(ctx.user), toSubject(subject))) notFound();
  if (opts.auditAction) {
    await audit({ missionId: ctx.user.missionId, actorUid: ctx.user.uid, actorName: ctx.user.displayName, action: opts.auditAction, target: `users/${crewId}` });
  }
  return { ...ctx, subject };
}
