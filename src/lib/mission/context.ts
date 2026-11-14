import "server-only";
import { requireSection } from "@/lib/auth/current-user";
import { getMission, getSettings, listCrew, listMissionDocs, listPersonal } from "@/lib/data/repo";
import { privateAggregate } from "@/lib/permissions";

export async function commanderContext() {
  const user = await requireSection("mission");
  const mission = user.missionId ? await getMission(user.missionId) : null;
  const crew = user.missionId ? await listCrew(user.missionId) : [];
  return { user, mission, crew, tz: user.preferences.timezone || "UTC" };
}

/**
 * Privacy-preserving readiness data for commanders. Contains ONLY operational fields:
 * check-in completion (yes/no), whether an operational alert is under medical review (no detail),
 * planner conflicts, and aggregates that are suppressed below the privacy group size.
 * Never mood, journals, symptoms, vitals or clinical notes.
 */
export async function commanderSummary(missionId: string, crewUids: string[]) {
  const settings = await getSettings();
  const today = new Date().toISOString().slice(0, 10);
  const alerts = await listMissionDocs(missionId, "alerts");
  const perCrew = await Promise.all(
    crewUids.map(async (uid) => {
      const [ci, sl] = await Promise.all([listPersonal(uid, "checkIns", { limit: 1 }), listPersonal(uid, "sleepLogs", { limit: 3 })]);
      return {
        uid,
        checkedInToday: ci[0]?.at.slice(0, 10) === today,
        operationalReview: alerts.some((a) => a.crewUid === uid && a.operational && a.status !== "resolved"),
        avgSleep3: sl.length ? sl.reduce((s, x) => s + x.durationMin, 0) / sl.length / 60 : null,
        fatigue: ci[0]?.fatigue ?? null,
      };
    }),
  );
  const k = settings.privacyMinGroupSize;
  return {
    perCrew: perCrew.map(({ uid, checkedInToday, operationalReview }) => ({ uid, checkedInToday, operationalReview })),
    completion: perCrew.filter((p) => p.checkedInToday).length,
    operationalOpen: alerts.filter((a) => a.operational && a.status !== "resolved").length,
    aggSleep: privateAggregate(perCrew.map((p) => p.avgSleep3).filter((x): x is number => x !== null), k),
    aggFatigue: privateAggregate(perCrew.map((p) => p.fatigue).filter((x): x is NonNullable<typeof x> => x !== null), k),
    minGroup: k,
    settings,
  };
}
