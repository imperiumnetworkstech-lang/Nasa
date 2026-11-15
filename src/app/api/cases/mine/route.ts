import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listMissionDocs } from "@/lib/data/repo";

/** The signed-in crew member's newest open case (for the pop-up alert). Only their own. */
export async function GET() {
  const u = await getCurrentUser();
  if (!u || u.role !== "astronaut" || !u.missionId) return NextResponse.json({ case: null });
  const cases = await listMissionDocs(u.missionId, "cases", { where: [["crewUid", "==", u.uid]], orderBy: { field: "createdAt", dir: "desc" }, limit: 1 });
  const c = cases[0];
  return NextResponse.json(
    {
      case: c && c.status === "active" && !c.analysis.expected
        ? { id: c.id, emoji: c.analysis.emoji, label: c.analysis.label, severity: c.analysis.severity, message: c.analysis.message, precautions: c.precautions, medicines: c.medicines, medicineStatus: c.medicineStatus, reviewedBy: c.reviewedBy }
        : null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
