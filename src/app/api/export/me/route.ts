import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { audit, listPersonal } from "@/lib/data/repo";
import type { PersonalKind } from "@/lib/types";

const KINDS: PersonalKind[] = ["checkIns", "vitals", "sleepLogs", "hydrationLogs", "mealLogs", "activityLogs", "moodLogs", "journal", "cognitiveTests", "symptomReports", "medications", "medicationLogs", "wearableSessions"];

/** Lets a user download all of THEIR OWN records (data portability). Audited. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const data: Record<string, unknown> = {};
  for (const k of KINDS) data[k] = await listPersonal(user.uid, k);
  await audit({ missionId: user.missionId, actorUid: user.uid, actorName: user.displayName, action: "export.self", target: `users/${user.uid}` });
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), profile: { uid: user.uid, displayName: user.displayName, email: user.email }, records: data }, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="antariksha-my-data.json"`, "cache-control": "no-store" },
  });
}
