import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, isAdminConfigured } from "@/lib/firebase/admin";
import { getUser } from "@/lib/data/repo";
import { createProfile, InviteError, withSession } from "@/lib/auth/onboarding";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { HOME_FOR_ROLE } from "@/lib/permissions";

const body = z.object({ idToken: z.string().min(20), displayName: z.string().trim().max(80).optional(), inviteCode: z.string().trim().max(40).optional() });

/** Exchanges a verified Firebase ID token for an Antariksha session cookie. */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "session"), 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  if (!isAdminConfigured()) return NextResponse.json({ error: "Firebase is not configured on the server." }, { status: 503 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const decoded = await (await adminAuth()).verifyIdToken(parsed.data.idToken, true);
    let user = await getUser(decoded.uid);
    if (!user) {
      user = await createProfile(
        decoded.uid,
        decoded.email ?? "",
        parsed.data.displayName || decoded.name || decoded.email?.split("@")[0] || "Crew member",
        parsed.data.inviteCode || undefined,
      );
    }
    if (user.status === "suspended") return NextResponse.json({ error: "This account is suspended." }, { status: 403 });
    return withSession(NextResponse.json({ ok: true, redirect: HOME_FOR_ROLE[user.role] }), { uid: user.uid, mode: "firebase" });
  } catch (e) {
    if (e instanceof InviteError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Could not verify sign-in." }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
