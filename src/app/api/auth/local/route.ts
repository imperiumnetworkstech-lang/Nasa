import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { getCredential, getUser, saveCredential } from "@/lib/data/repo";
import { newId } from "@/lib/data/store";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createProfile, InviteError, withSession } from "@/lib/auth/onboarding";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { loginSchema, registerSchema } from "@/lib/validation/schemas";
import { HOME_FOR_ROLE } from "@/lib/permissions";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("login") }).extend(loginSchema.shape),
  z.object({ action: z.literal("register") }).extend(registerSchema.shape),
]);

/**
 * Local email/password auth — ONLY available when Firebase is not configured (local development
 * and self-contained demos). With Firebase configured, Firebase Authentication is used instead.
 */
export async function POST(req: Request) {
  if (isAdminConfigured()) return NextResponse.json({ error: "Use Firebase sign-in on this deployment." }, { status: 400 });
  const rl = rateLimit(clientKey(req, "local-auth"), 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfterS}s.` }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const data = parsed.data;

  if (data.action === "login") {
    const cred = await getCredential(data.email);
    // Same message for unknown email and wrong password to avoid account enumeration.
    if (!cred || !(await verifyPassword(data.password, cred.salt, cred.hash))) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    const user = await getUser(cred.uid);
    if (!user || user.status === "suspended") return NextResponse.json({ error: "This account is not active." }, { status: 403 });
    return withSession(NextResponse.json({ ok: true, redirect: HOME_FOR_ROLE[user.role] }), { uid: user.uid, mode: "local" });
  }

  if (await getCredential(data.email)) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  try {
    const uid = newId("u");
    const user = await createProfile(uid, data.email.toLowerCase(), data.displayName, data.inviteCode);
    const { salt, hash } = await hashPassword(data.password);
    await saveCredential({ email: data.email, uid, salt, hash });
    return withSession(NextResponse.json({ ok: true, redirect: HOME_FOR_ROLE[user.role] }), { uid, mode: "local" });
  } catch (e) {
    if (e instanceof InviteError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
