import { NextResponse } from "next/server";
import { backendName, getStore } from "@/lib/data";
import { getMissionPulse } from "@/lib/data/repo";
import { DEMO_MISSION_ID } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Which data backend this server instance uses (no secrets). */
export async function GET() {
  const env = {
    kvUrl: Boolean(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
    kvToken: Boolean(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN),
  };
  let pulse: number | string = "n/a";
  let error: string | null = null;
  try {
    await getStore();
    pulse = await getMissionPulse(DEMO_MISSION_ID);
  } catch (e) {
    error = e instanceof Error ? e.message.slice(0, 200) : "error";
  }
  return NextResponse.json({ backend: backendName(), env, pulse, error }, { headers: { "cache-control": "no-store" } });
}
