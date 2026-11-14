import "server-only";
import { evaluateRules } from "./rules";
import { alertIdFor } from "./ids";
import { getMissionDoc, getSettings, getUser, listMembers, listPersonal, notify, setMissionDoc } from "@/lib/data/repo";
import type { Alert } from "@/lib/types";

/**
 * Re-evaluates rules for one crew member and creates any new alerts (idempotent by dedupe key).
 * Existing alerts are never overwritten, preserving their review history.
 */
export async function runAlertsForCrew(uid: string): Promise<Alert[]> {
  const user = await getUser(uid);
  if (!user?.missionId || user.role !== "astronaut") return [];
  const settings = await getSettings();
  const [vitals, sleep, checkIns, symptoms] = await Promise.all([
    listPersonal(uid, "vitals", { sinceDays: settings.thresholds.baselineWindowDays + 2 }),
    listPersonal(uid, "sleepLogs", { limit: 10 }),
    listPersonal(uid, "checkIns", { limit: 20 }),
    listPersonal(uid, "symptomReports", { limit: 20 }),
  ]);
  const candidates = evaluateRules({
    crewUid: uid,
    crewLabel: user.callSign ?? user.displayName,
    now: new Date(),
    thresholds: settings.thresholds,
    vitals,
    sleep,
    checkIns,
    symptoms,
  });
  const created: Alert[] = [];
  for (const c of candidates) {
    const id = alertIdFor(c.dedupeKey);
    if (await getMissionDoc(user.missionId, "alerts", id)) continue;
    const alert: Alert = {
      ...c,
      id,
      missionId: user.missionId,
      crewUid: uid,
      crewLabel: user.callSign ?? user.displayName,
      status: "open",
      assignedTo: null,
      createdAt: new Date().toISOString(),
      origin: user.isDemo ? "simulated" : "user",
      history: [{ at: new Date().toISOString(), by: "system", byName: "Rule engine", action: "Created", note: `Rule ${c.ruleId} v${c.ruleVersion}` }],
    };
    await setMissionDoc(user.missionId, "alerts", alert);
    created.push(alert);
  }
  if (created.length) {
    const medics = (await listMembers(user.missionId)).filter((m) => m.assignment === "medical");
    await Promise.all(
      medics.map((m) =>
        notify({ uid: m.uid, kind: "alert", title: `${created.length} new alert(s) for ${alert0Label(created)}`, body: created.map((a) => a.title).join("; "), href: "/app/medical/alerts" }),
      ),
    );
  }
  return created;
}

function alert0Label(a: Alert[]) {
  return a[0].crewLabel;
}
