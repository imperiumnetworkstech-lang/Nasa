import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { createOwnRecord, OFFLINE_ALLOWED, type SelfKind } from "@/lib/records/create";

const body = z.object({
  items: z
    .array(z.object({ clientId: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/), kind: z.string(), data: z.unknown(), queuedAt: z.string() }))
    .max(100),
});

/**
 * Offline-queue synchronisation. Idempotent per clientId: replaying an item that already exists
 * returns "duplicate" and never overwrites a newer record. Only non-emergency kinds are accepted.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const rl = rateLimit(clientKey(req, `sync:${user.uid}`), 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many sync attempts" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid sync payload" }, { status: 400 });
  const results = [];
  for (const item of parsed.data.items) {
    if (!OFFLINE_ALLOWED.includes(item.kind as SelfKind)) {
      results.push({ clientId: item.clientId, status: "rejected", error: "This type of entry cannot be sent from the offline queue." });
      continue;
    }
    const r = await createOwnRecord(user, item.kind as SelfKind, item.data, item.clientId);
    results.push(r.ok ? { clientId: item.clientId, status: r.duplicate ? "duplicate" : "synced" } : { clientId: item.clientId, status: "rejected", error: r.error });
  }
  return NextResponse.json({ results, syncedAt: new Date().toISOString() });
}
