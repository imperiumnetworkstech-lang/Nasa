"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, toActor } from "@/lib/auth/current-user";
import { canAdminister, canAssignRole } from "@/lib/permissions";
import { audit, getMission, getSettings, getUser, listMissions, removeMember, saveInvite, saveMission, saveSettings, setMember, updateUser } from "@/lib/data/repo";
import { getStore } from "@/lib/data";
import { seedDemoData } from "@/lib/data/seed";
import { isDemoEnabled } from "@/lib/config";
import { newId } from "@/lib/data/store";
import { inviteSchema, missionSchema, roleChangeSchema, settingsSchema } from "@/lib/validation/schemas";
import type { MissionMember } from "@/lib/types";

type R = { ok: boolean; message: string };

/** Every admin action is authorised server-side and audited. */
async function admin() {
  const u = await getCurrentUser();
  if (!u || !canAdminister(toActor(u))) throw new Error("Not authorised");
  return u;
}

export async function changeRole(input: unknown): Promise<R> {
  const a = await admin();
  const p = roleChangeSchema.safeParse(input);
  if (!p.success) return { ok: false, message: "Invalid role" };
  if (!canAssignRole(toActor(a), p.data.uid)) return { ok: false, message: "You cannot change your own role." };
  const target = await getUser(p.data.uid);
  if (!target) return { ok: false, message: "User not found" };
  await updateUser(target.uid, { role: p.data.role });
  if (target.missionId) {
    const assignment: MissionMember["assignment"] = p.data.role === "astronaut" ? "crew" : p.data.role === "admin" ? "commander" : p.data.role;
    if (p.data.role === "admin") await removeMember(target.missionId, target.uid);
    else await setMember(target.missionId, { uid: target.uid, assignment, callSign: target.callSign ?? target.displayName, displayName: target.displayName, joinedAt: new Date().toISOString() });
  }
  await audit({ missionId: null, actorUid: a.uid, actorName: a.displayName, action: "user.role", target: `users/${target.uid}`, detail: `${target.role} → ${p.data.role}` });
  revalidatePath("/app/admin/users");
  return { ok: true, message: `Role changed to ${p.data.role}.` };
}

export async function setUserStatus(uid: string, status: "active" | "suspended"): Promise<R> {
  const a = await admin();
  if (uid === a.uid) return { ok: false, message: "You cannot suspend yourself." };
  await updateUser(uid, { status });
  await audit({ missionId: null, actorUid: a.uid, actorName: a.displayName, action: `user.${status}`, target: `users/${uid}` });
  revalidatePath("/app/admin/users");
  return { ok: true, message: `User ${status}.` };
}

export async function assignMission(input: unknown): Promise<R> {
  const a = await admin();
  const p = z.object({ uid: z.string(), missionId: z.string().nullable() }).safeParse(input);
  if (!p.success) return { ok: false, message: "Invalid request" };
  const u = await getUser(p.data.uid);
  if (!u) return { ok: false, message: "User not found" };
  if (p.data.missionId && !(await getMission(p.data.missionId))) return { ok: false, message: "Mission not found" };
  if (u.missionId) await removeMember(u.missionId, u.uid);
  await updateUser(u.uid, { missionId: p.data.missionId });
  if (p.data.missionId && u.role !== "admin") {
    const assignment: MissionMember["assignment"] = u.role === "astronaut" ? "crew" : (u.role as MissionMember["assignment"]);
    await setMember(p.data.missionId, { uid: u.uid, assignment, callSign: u.callSign ?? u.displayName, displayName: u.displayName, joinedAt: new Date().toISOString() });
  }
  await audit({ missionId: p.data.missionId, actorUid: a.uid, actorName: a.displayName, action: "user.assignMission", target: `users/${u.uid}`, detail: `${u.missionId ?? "none"} → ${p.data.missionId ?? "none"}` });
  revalidatePath("/app/admin", "layout");
  return { ok: true, message: "Mission assignment updated." };
}

export async function createInvite(input: unknown): Promise<R> {
  const a = await admin();
  const p = inviteSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const code = `${p.data.role.slice(0, 3).toUpperCase()}-${newId().slice(0, 6).toUpperCase()}`;
  await saveInvite({ code, ...p.data, createdBy: a.uid, createdAt: new Date().toISOString() });
  await audit({ missionId: p.data.missionId, actorUid: a.uid, actorName: a.displayName, action: "invite.create", target: `invites/${code}`, detail: p.data.role });
  revalidatePath("/app/admin/users");
  return { ok: true, message: `Done! Share this code: ${code}` };
}

export async function upsertMission(input: unknown): Promise<R> {
  const a = await admin();
  const p = missionSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const existing = p.data.id ? await getMission(p.data.id) : null;
  const id = existing?.id ?? newId("m");
  await saveMission({
    id,
    name: p.data.name,
    missionCode: p.data.missionCode,
    description: p.data.description,
    startAt: new Date(p.data.startAt).toISOString(),
    endAt: p.data.endAt ? new Date(p.data.endAt).toISOString() : null,
    status: p.data.status,
    timezone: p.data.timezone,
    isDemo: existing?.isDemo ?? false,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });
  await audit({ missionId: id, actorUid: a.uid, actorName: a.displayName, action: existing ? "mission.update" : "mission.create", target: `missions/${id}` });
  revalidatePath("/app/admin/missions");
  return { ok: true, message: existing ? "Mission updated." : "Mission created." };
}

export async function updateSettings(input: unknown): Promise<R> {
  const a = await admin();
  const p = settingsSchema.safeParse(input);
  if (!p.success) return { ok: false, message: `${p.error.issues[0].path.join(".")}: ${p.error.issues[0].message}` };
  const current = await getSettings();
  await saveSettings({ ...current, ...p.data, updatedAt: new Date().toISOString(), updatedBy: a.displayName });
  await audit({ missionId: null, actorUid: a.uid, actorName: a.displayName, action: "settings.update", target: "config/platform" });
  revalidatePath("/app", "layout");
  return { ok: true, message: "Settings saved." };
}

/** Admin-only demo seeding (works for Firestore and the local store). Adds clearly synthetic data. */
export async function seedDemo(): Promise<R> {
  const a = await admin();
  if (!isDemoEnabled()) return { ok: false, message: "Demo mode is disabled on this deployment." };
  const missions = await listMissions();
  if (missions.some((m) => m.isDemo)) return { ok: false, message: "Demo data already exists." };
  await seedDemoData(await getStore(), new Date());
  await audit({ missionId: null, actorUid: a.uid, actorName: a.displayName, action: "demo.seed", target: "all" });
  revalidatePath("/app", "layout");
  return { ok: true, message: "Demo data seeded." };
}

/** Regenerates synthetic demo data so dates are current. Only deletes records marked as demo. */
export async function refreshDemo(): Promise<R> {
  const a = await admin();
  if (!isDemoEnabled()) return { ok: false, message: "Demo mode is disabled on this deployment." };
  const store = await getStore();
  const { DEMO_PEOPLE } = await import("@/lib/data/seed");
  for (const p of DEMO_PEOPLE) {
    for (const col of await store.listCollectionIds(`users/${p.uid}`)) await store.deleteCollection(`users/${p.uid}/${col}`);
  }
  for (const m of (await listMissions()).filter((m) => m.isDemo)) {
    for (const col of await store.listCollectionIds(`missions/${m.id}`)) await store.deleteCollection(`missions/${m.id}/${col}`);
  }
  await seedDemoData(store, new Date());
  await audit({ missionId: null, actorUid: a.uid, actorName: a.displayName, action: "demo.refresh", target: "demo records" });
  revalidatePath("/app", "layout");
  return { ok: true, message: "Demo data regenerated with current dates." };
}
