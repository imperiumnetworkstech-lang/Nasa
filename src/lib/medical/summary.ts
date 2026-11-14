import "server-only";
import { listPersonal } from "@/lib/data/repo";
import type { Alert, MissionMember } from "@/lib/types";

export interface CrewSnapshot {
  member: MissionMember;
  lastCheckIn: string | null;
  checkedInToday: boolean;
  lastHr: number | null;
  lastSleepH: number | null;
  openSymptoms: number;
  openAlerts: Alert[];
}

export async function crewSnapshots(crew: MissionMember[], alerts: Alert[]): Promise<CrewSnapshot[]> {
  const today = new Date().toISOString().slice(0, 10);
  return Promise.all(
    crew.map(async (m) => {
      const [ci, hr, sl, sy] = await Promise.all([
        listPersonal(m.uid, "checkIns", { limit: 1 }),
        listPersonal(m.uid, "vitals", { sinceDays: 3 }),
        listPersonal(m.uid, "sleepLogs", { limit: 1 }),
        listPersonal(m.uid, "symptomReports", { limit: 20 }),
      ]);
      const h = hr.find((v) => v.kind === "heart_rate" && v.quality === "valid");
      return {
        member: m,
        lastCheckIn: ci[0]?.at ?? null,
        checkedInToday: ci[0]?.at.slice(0, 10) === today,
        lastHr: h?.value ?? null,
        lastSleepH: sl[0] ? sl[0].durationMin / 60 : null,
        openSymptoms: sy.filter((s) => s.status !== "resolved").length,
        openAlerts: alerts.filter((a) => a.crewUid === m.uid && a.status !== "resolved"),
      };
    }),
  );
}
