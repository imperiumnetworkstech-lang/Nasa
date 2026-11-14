import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { FILTER_FIELDS, searchStudies } from "@/lib/nasa/osdr";

/** Server-side NASA OSDR proxy (JSON) for clients/integrations. Cached and rate-limited. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const rl = rateLimit(clientKey(req, "osdr"), 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const u = new URL(req.url);
  const field = u.searchParams.get("field");
  const result = await searchStudies({
    term: (u.searchParams.get("q") ?? "space").slice(0, 100),
    page: Math.max(1, Math.min(100, Number(u.searchParams.get("page") ?? 1) || 1)),
    size: 10,
    filterField: field && field in FILTER_FIELDS ? (field as keyof typeof FILTER_FIELDS) : undefined,
    filterValue: u.searchParams.get("value")?.slice(0, 80) ?? undefined,
  });
  return NextResponse.json(result);
}
