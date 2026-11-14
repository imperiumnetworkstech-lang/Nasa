import { NextResponse } from "next/server";
import { z } from "zod";
import { isDemoEnabled } from "@/lib/config";
import { getStore } from "@/lib/data";
import { getUser } from "@/lib/data/repo";
import { DEMO_ROLE_UID } from "@/lib/data/seed";
import { withSession } from "@/lib/auth/onboarding";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { HOME_FOR_ROLE } from "@/lib/permissions";
import { ROLES } from "@/lib/types";

// Either a role (maps to that role's default demo person) or a specific seeded demo account.
const body = z.union([z.object({ role: z.enum(ROLES) }), z.object({ uid: z.string().regex(/^demo-[a-z0-9-]{1,30}$/) })]);

/**
 * Demo entry: signs in as a seeded, clearly-labelled synthetic account.
 * Disabled unless demo mode is enabled (dev by default; DEMO_MODE=true in production).
 */
export async function POST(req: Request) {
  if (!isDemoEnabled()) return NextResponse.json({ error: "Demo mode is disabled on this deployment." }, { status: 403 });
  const rl = rateLimit(clientKey(req, "demo"), 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a role" }, { status: 400 });
  await getStore(); // ensures the local store is seeded
  const uid = "role" in parsed.data ? DEMO_ROLE_UID[parsed.data.role] : parsed.data.uid;
  if (!uid) return NextResponse.json({ error: "This role isn't part of the demo." }, { status: 400 });
  const user = await getUser(uid);
  // Only seeded, clearly-marked demo accounts can be entered this way — never real users.
  if (!user || !user.isDemo) {
    return NextResponse.json({ error: "Demo data has not been seeded. Run `npm run seed` or seed from Admin → Settings." }, { status: 409 });
  }
  return withSession(NextResponse.json({ ok: true, redirect: HOME_FOR_ROLE[user.role] }), { uid, mode: "demo" });
}
