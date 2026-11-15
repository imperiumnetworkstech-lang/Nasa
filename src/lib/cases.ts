import "server-only";
import { addMissionDoc, addPersonal, bumpMissionPulse, listMembers, listMissionDocs, notify, updateMissionDoc } from "@/lib/data/repo";
import { analyzeVitals } from "@/lib/ml/vitals-model";
import { GUIDE, type Condition } from "@/lib/ml/condition-guide";
import { RANGES } from "@/lib/ml/vitals-reference";
import { SCENARIO_BASE, type Scenario } from "@/lib/scenarios";
import { currentActivity, getPersonalProfile, refreshPersonalProfile } from "@/lib/health/personal-server";
import type { HealthCase, UserProfile, VitalKind } from "@/lib/types";

/**
 * Turns one suit reading into a health case: the model analyses it, the case is stored for the
 * mission, the readings are saved to the astronaut's own record, and the crew member, the
 * base-station doctor(s) and the mission commander are notified.
 */
export async function createCaseFromReadings(crew: UserProfile, scenario: Scenario): Promise<HealthCase> {
  if (!crew.missionId) throw new Error("Crew member is not on a mission");
  const name = crew.callSign ? `${crew.displayName} (${crew.callSign})` : crew.displayName;
  // Personal baseline from the astronaut's own history, and what they're doing right now.
  // Saved baseline (one read); the baseline excludes test readings, so it stays valid between readings.
  const profile = await getPersonalProfile(crew.uid);
  const hasBaseline = Object.keys(profile.baseline).length >= 4;
  // Readings the scenario doesn't change take this astronaut's own usual value; then a little sensor jitter.
  const readings = Object.fromEntries(
    Object.entries(scenario.readings).map(([k, v]) => {
      const key = k as keyof Scenario["readings"];
      const start = hasBaseline && v === SCENARIO_BASE[key] && profile.baseline[key] !== undefined ? profile.baseline[key]! : v;
      return [k, Math.round((start + (Math.random() - 0.5) * (k === "temp" || k === "skinTemp" ? 0.1 : k === "eda" ? 0.4 : 1)) * 10) / 10];
    }),
  ) as Scenario["readings"];
  const activity = scenario.context ?? (await currentActivity(crew.missionId, crew.uid));
  const a = analyzeVitals(readings, name, { baseline: hasBaseline ? profile.baseline : undefined, activity });
  const g = GUIDE[a.condition as Condition];
  const now = new Date().toISOString();
  const isNormal = a.condition === "normal";
  const doc = await addMissionDoc(crew.missionId, "cases", {
    missionId: crew.missionId,
    crewUid: crew.uid,
    crewName: name,
    scenarioId: scenario.id,
    source: "scenario",
    createdAt: now,
    readings,
    analysis: {
      condition: a.condition,
      label: g.label,
      emoji: g.emoji,
      severity: a.severity,
      confidencePct: a.confidencePct,
      message: a.message,
      probabilities: a.probabilities,
      params: a.params,
      modelVersion: a.modelVersion,
      personalBaseline: a.personalBaseline,
      expected: a.expected,
      contextNote: a.contextNote,
      activity: activity ?? null,
    },
    precautions: g.precautions,
    remedy: g.remedy,
    medicines: g.medicines,
    medicineStatus: g.medicines.length ? "recommended" : "none",
    doctorNote: null,
    reviewedBy: null,
    reviewedAt: null,
    status: isNormal ? "normal" : "active",
    resolvedAt: null,
    origin: crew.isDemo ? "simulated" : "user",
  });

  // Save readings to the astronaut's own vitals history (clearly marked as a suit scenario).
  const map: [keyof Scenario["readings"], VitalKind][] = [
    ["hr", "heart_rate"],
    ["spo2", "spo2"],
    ["temp", "temperature"],
    ["skinTemp", "skin_temp"],
    ["rr", "resp_rate"],
    ["eda", "eda"],
  ];
  for (const [k, kind] of map) {
    await addPersonal(crew.uid, "vitals", { uid: crew.uid, missionId: crew.missionId, origin: "simulated", createdAt: now, enteredBy: crew.uid, kind, value: readings[k], unit: RANGES[k].unit, measuredAt: now, source: "simulated", device: "Suit sensor (demo scenario)", quality: "valid" });
  }
  await addPersonal(crew.uid, "vitals", { uid: crew.uid, missionId: crew.missionId, origin: "simulated", createdAt: now, enteredBy: crew.uid, kind: "blood_pressure", value: readings.sbp, value2: readings.dbp, unit: "mmHg", measuredAt: now, source: "simulated", device: "Suit sensor (demo scenario)", quality: "valid" });

  await refreshPersonalProfile(crew.uid); // new reading → new drift score, saved for every board

  // Notify everyone who needs to know.
  const members = await listMembers(crew.missionId);
  const staff = members.filter((m) => m.assignment === "medical" || m.assignment === "commander");
  if (isNormal) {
    // Readings are back to normal: close this astronaut's open cases (the doctor is told and can reopen care).
    const open = (await listMissionDocs(crew.missionId, "cases", { where: [["crewUid", "==", crew.uid]] })).filter((c) => c.status === "active");
    for (const c of open) await updateMissionDoc(crew.missionId, "cases", c.id, { status: "resolved", resolvedAt: now, doctorNote: c.doctorNote ?? "Closed automatically: readings returned to normal." });
    for (const m of staff) await notify({ uid: m.uid, kind: "alert", title: `✅ ${name} is normal`, body: "All suit readings are within range.", href: m.assignment === "medical" ? "/app/medical/dashboard" : "/app/mission/dashboard" });
  } else if (a.expected) {
    // Context-aware: expected during a workout, so no siren — just a heads-up.
    for (const m of staff)
      await notify({ uid: m.uid, kind: "alert", title: `🏃 ${name}: ${g.label.toLowerCase()} during exercise`, body: "Expected during a workout. Re-check after the session.", href: m.assignment === "medical" ? "/app/medical/dashboard" : "/app/mission/dashboard" });
  } else {
    await notify({ uid: crew.uid, kind: "alert", title: `${g.emoji} ${g.label} — do this now`, body: g.precautions[0], href: "/app/crew/dashboard" });
    for (const m of staff) {
      await notify({
        uid: m.uid,
        kind: "alert",
        priority: "emergency",
        title: `🚨 ${name}: ${g.label}`,
        body: a.message,
        href: m.assignment === "medical" ? "/app/medical/dashboard" : "/app/mission/dashboard",
      });
    }
  }
  // One tiny write tells every open doctor/commander/console page that something changed.
  await bumpMissionPulse(crew.missionId);
  return doc;
}

/** Latest case per crew member (for status boards). */
export async function latestCaseByCrew(missionId: string) {
  const cases = await listMissionDocs(missionId, "cases", { orderBy: { field: "createdAt", dir: "desc" } });
  const latest = new Map<string, HealthCase>();
  for (const c of cases) if (!latest.has(c.crewUid)) latest.set(c.crewUid, c);
  return { cases, latest };
}
