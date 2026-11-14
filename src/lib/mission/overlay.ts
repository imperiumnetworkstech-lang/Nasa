import "server-only";
import { listMissionDocs, listPersonal } from "@/lib/data/repo";
import { dailySeries, meanOf } from "@/lib/health/series";
import { privateAggregate } from "@/lib/permissions";
import type { MissionMember } from "@/lib/types";

/**
 * Builds the environment + crew overlay. Crew values are AGGREGATED per day and suppressed
 * when fewer than `minGroup` people contributed (so no individual can be singled out).
 */
export async function buildOverlay(missionId: string, crew: MissionMember[], tz: string, minGroup: number, days = 30) {
  const [env, events] = await Promise.all([
    listMissionDocs(missionId, "environmentReadings", { orderBy: { field: "at", dir: "desc" }, limit: days * 4 }),
    listMissionDocs(missionId, "missionEvents"),
  ]);
  const perCrew = await Promise.all(crew.map(async (c) => ({ sleep: await listPersonal(c.uid, "sleepLogs", { sinceDays: days }), checkIns: await listPersonal(c.uid, "checkIns", { sinceDays: days }) })));
  const envRows = dailySeries(env, (e) => e.at, days, { co2: meanOf((e) => e.co2Ppm), temp: meanOf((e) => e.temperatureC) }, tz);
  const rows = envRows.map((r) => {
    const day = String(r.day);
    const sleepVals = perCrew.map((p) => p.sleep.find((s) => s.end.slice(0, 10) === day)).filter(Boolean).map((s) => s!.durationMin / 60);
    const fatigueVals = perCrew
      .map((p) => p.checkIns.find((c) => c.at.slice(0, 10) === day)?.fatigue)
      .filter((x): x is NonNullable<typeof x> => typeof x === "number");
    const a = privateAggregate(sleepVals, minGroup);
    const b = privateAggregate(fatigueVals, minGroup);
    return { ...r, a: a.value, b: b.value, aLabel: "Crew avg sleep (h)", bLabel: "Crew avg fatigue (1–5)" };
  });
  return { env, events, rows };
}
