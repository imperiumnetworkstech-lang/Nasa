import "server-only";
import { DEFAULT_PREFERENCES } from "@/lib/config";
import { audit, getInvite, getMission, saveInvite, saveUser, setMember } from "@/lib/data/repo";
import type { MissionMember, Role, UserProfile } from "@/lib/types";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions, signSession, type SessionPayload } from "./session";

/**
 * Creates a profile for a newly registered user. The role ALWAYS defaults to "astronaut" with no
 * mission, unless a valid server-side invite (created by an admin) says otherwise. Clients can
 * never pick their own role.
 */
export async function createProfile(uid: string, email: string, displayName: string, inviteCode?: string): Promise<UserProfile> {
  let role: Role = "astronaut";
  let missionId: string | null = null;
  if (inviteCode) {
    const inv = await getInvite(inviteCode.trim().toUpperCase());
    if (!inv || inv.usesLeft < 1) throw new InviteError("Invitation code is not valid or has been used up.");
    role = inv.role;
    missionId = inv.missionId && (await getMission(inv.missionId)) ? inv.missionId : null;
    await saveInvite({ ...inv, usesLeft: inv.usesLeft - 1 });
  }
  const now = new Date().toISOString();
  const profile: UserProfile = {
    uid,
    email,
    displayName,
    role,
    status: "active",
    missionId,
    callSign: displayName.split(" ")[0],
    isDemo: false,
    createdAt: now,
    updatedAt: now,
    preferences: DEFAULT_PREFERENCES,
  };
  await saveUser(profile);
  if (missionId) {
    const assignment: MissionMember["assignment"] = role === "astronaut" ? "crew" : role === "admin" ? "commander" : role;
    await setMember(missionId, { uid, assignment, callSign: profile.callSign ?? displayName, displayName, joinedAt: now });
  }
  await audit({ missionId, actorUid: uid, actorName: displayName, action: "user.register", target: `users/${uid}`, detail: inviteCode ? `invite ${inviteCode} → ${role}` : "default role astronaut" });
  return profile;
}

export class InviteError extends Error {}

export async function withSession(res: NextResponse, payload: SessionPayload): Promise<NextResponse> {
  res.cookies.set(SESSION_COOKIE, await signSession(payload), sessionCookieOptions);
  return res;
}
