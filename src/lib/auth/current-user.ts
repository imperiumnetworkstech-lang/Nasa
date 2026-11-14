import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/data/repo";
import { canAccessSection, type Actor, type Section } from "@/lib/permissions";
import type { UserProfile } from "@/lib/types";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./session";

export interface CurrentUser extends UserProfile {
  sessionMode: SessionPayload["mode"];
}

/** Authoritative session read: verifies the cookie, then loads role/mission from the database. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await getUser(session.uid);
  if (!user || user.status === "suspended") return null;
  return { ...user, sessionMode: session.mode };
});

export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  // Clears any stale cookie first so the proxy does not bounce between /login and /app.
  if (!u) redirect("/api/auth/logout");
  return u;
}

export async function requireSection(section: Section): Promise<CurrentUser> {
  const u = await requireUser();
  if (!canAccessSection(u, section)) redirect(`/app?denied=${section}`);
  return u;
}

export function toActor(u: UserProfile): Actor {
  return { uid: u.uid, role: u.role, missionId: u.missionId, status: u.status };
}

/** For server actions / route handlers: returns null instead of redirecting. */
export async function getActorOrNull(): Promise<CurrentUser | null> {
  return getCurrentUser();
}
