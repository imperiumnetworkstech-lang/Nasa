"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { audit, listNotifications, markNotificationsRead, updateUser } from "@/lib/data/repo";
import { profileSchema } from "@/lib/validation/schemas";

type R = { ok: boolean; message: string };

/** Users may only edit whitelisted fields of their own profile — never role, status or mission. */
export async function updateProfile(input: unknown): Promise<R> {
  const u = await getCurrentUser();
  if (!u) return { ok: false, message: "Not signed in" };
  const p = profileSchema.safeParse(input);
  if (!p.success) return { ok: false, message: `${p.error.issues[0].path.join(".")}: ${p.error.issues[0].message}` };
  await updateUser(u.uid, {
    displayName: p.data.displayName,
    callSign: p.data.callSign,
    dietaryConstraints: p.data.dietaryConstraints,
    allergies: p.data.allergies,
    preferences: p.data.preferences,
  });
  await audit({ missionId: u.missionId, actorUid: u.uid, actorName: u.displayName, action: "profile.update", target: `users/${u.uid}` });
  revalidatePath("/app", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function markAllRead(): Promise<R> {
  const u = await getCurrentUser();
  if (!u) return { ok: false, message: "Not signed in" };
  const unread = (await listNotifications(u.uid)).filter((n) => !n.readAt).map((n) => n.id);
  await markNotificationsRead(u.uid, unread);
  revalidatePath("/app", "layout");
  return { ok: true, message: "All caught up." };
}

export async function markRead(id: string): Promise<R> {
  const u = await getCurrentUser();
  if (!u) return { ok: false, message: "Not signed in" };
  await markNotificationsRead(u.uid, [id]);
  revalidatePath("/app", "layout");
  return { ok: true, message: "Marked read." };
}
