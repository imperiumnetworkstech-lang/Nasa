import { NextResponse } from "next/server";
import { DEMO_MISSION_ID, isDemoEnabled } from "@/lib/config";
import { getMissionPulse } from "@/lib/data/repo";

/** Change marker for the demo scenario console (demo mode only). One small read. */
export async function GET() {
  if (!isDemoEnabled()) return NextResponse.json({ v: 0 }, { status: 404 });
  return NextResponse.json({ v: await getMissionPulse(DEMO_MISSION_ID) }, { headers: { "cache-control": "no-store" } });
}
