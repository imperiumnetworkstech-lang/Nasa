import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listMissionDocs } from "@/lib/data/repo";

/**
 * Tiny live-sync endpoint for the base-station doctor and commander.
 * Returns a version string that changes whenever any case changes, plus the open cases,
 * so the page only re-renders when something actually happened.
 */
export async function GET() {
  const u = await getCurrentUser();
  if (!u || (u.role !== "medical" && u.role !== "commander") || !u.missionId) return NextResponse.json({ version: "", active: [] }, { status: 401 });
  const cases = await listMissionDocs(u.missionId, "cases", { orderBy: { field: "createdAt", dir: "desc" }, limit: 40 });
  const version = cases.map((c) => `${c.id}:${c.status}:${c.reviewedAt ?? ""}`).join("|");
  const active = cases
    .filter((c) => c.status === "active")
    .map((c) => ({ id: c.id, crewName: c.crewName, label: c.analysis.label, emoji: c.analysis.emoji, severity: c.analysis.severity, expected: Boolean(c.analysis.expected), message: c.analysis.message, createdAt: c.createdAt }));
  return NextResponse.json({ version, active }, { headers: { "cache-control": "no-store" } });
}
