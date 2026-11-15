import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMissionPulse, listMissionDocs } from "@/lib/data/repo";

/**
 * Live-sync endpoint for the base-station doctor and commander.
 * Reads ONE small marker document; only when it changed since the client's last version does it
 * also read the open cases.
 */
export async function GET(req: Request) {
  const u = await getCurrentUser();
  if (!u || (u.role !== "medical" && u.role !== "commander") || !u.missionId) return NextResponse.json({ version: "", active: [] }, { status: 401 });
  const version = String(await getMissionPulse(u.missionId));
  const known = new URL(req.url).searchParams.get("v");
  if (known === version) return NextResponse.json({ version, unchanged: true }, { headers: { "cache-control": "no-store" } });
  const cases = await listMissionDocs(u.missionId, "cases", { where: [["status", "==", "active"]] });
  const active = cases
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => ({ id: c.id, crewName: c.crewName, label: c.analysis.label, emoji: c.analysis.emoji, severity: c.analysis.severity, expected: Boolean(c.analysis.expected), message: c.analysis.message, createdAt: c.createdAt }));
  return NextResponse.json({ version, active }, { headers: { "cache-control": "no-store" } });
}
