import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { createOwnRecord, SELF_KINDS } from "@/lib/records/create";

const body = z.object({
  kind: z.enum(SELF_KINDS as [string, ...string[]]),
  data: z.unknown(),
  clientId: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/).optional(),
});

/** Create a record on the signed-in crew member's own profile. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  const rl = rateLimit(clientKey(req, `records:${user.uid}`), 120, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  const res = await createOwnRecord(user, parsed.data.kind as never, parsed.data.data, parsed.data.clientId);
  return NextResponse.json(res, { status: res.ok ? 200 : 422 });
}
