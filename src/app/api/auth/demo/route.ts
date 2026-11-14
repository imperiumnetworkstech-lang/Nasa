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

const body = z.object({ role: z.enum(ROLES) });

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
  const uid = DEMO_ROLE_UID[parsed.data.role];
  const user = await getUser(uid);
  if (!user || !user.isDemo) {
    return NextResponse.json({ error: "Demo data has not been seeded. Run `npm run seed` or seed from Admin → Settings." }, { status: 409 });
  }
  return withSession(NextResponse.json({ ok: true, redirect: HOME_FOR_ROLE[user.role] }), { uid, mode: "demo" });
}
