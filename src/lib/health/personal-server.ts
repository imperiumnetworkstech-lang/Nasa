import "server-only";
import { getSavedProfile, listMissionDocs, listPersonal, saveProfile } from "@/lib/data/repo";
import { personalProfile, type PersonalProfile } from "./personal";

/**
 * Personal profile (baseline + drift score) with two cheap layers in front of the expensive
 * calculation (which reads ~4 weeks of vitals):
 *  1. a short in-memory cache per server instance;
 *  2. a saved copy in the database (ONE read), refreshed when the astronaut gets a new suit
 *     reading (`fresh`) or when it's older than 6 hours.
 */
const memory = new Map<string, { at: number; p: PersonalProfile }>();
const MEMORY_TTL = 60_000;
const SAVED_TTL = 6 * 3_600_000;

async function compute(uid: string): Promise<PersonalProfile> {
  const vitals = await listPersonal(uid, "vitals", { sinceDays: 28 });
  const p = personalProfile(vitals);
  await saveProfile(uid, p);
  return p;
}

export async function getPersonalProfile(uid: string, opts: { fresh?: boolean } = {}): Promise<PersonalProfile> {
  if (!opts.fresh) {
    const hit = memory.get(uid);
    if (hit && Date.now() - hit.at < MEMORY_TTL) return hit.p;
    const saved = await getSavedProfile<PersonalProfile>(uid);
    if (saved && Date.now() - Date.parse(saved.computedAt) < SAVED_TTL) {
      const p: PersonalProfile = { baseline: saved.baseline, spread: saved.spread, readings: saved.readings, drift: saved.drift, trend: saved.trend };
      memory.set(uid, { at: Date.now(), p });
      return p;
    }
  }
  const p = await compute(uid);
  memory.set(uid, { at: Date.now(), p });
  return p;
}

/** Recalculate and save after a new reading, so every board shows the new drift score. */
export async function refreshPersonalProfile(uid: string) {
  memory.delete(uid);
  const p = await compute(uid);
  memory.set(uid, { at: Date.now(), p });
  return p;
}

export async function profilesFor(uids: string[]) {
  return new Map(await Promise.all(uids.map(async (u) => [u, await getPersonalProfile(u)] as const)));
}

/** Is the astronaut in a scheduled exercise session right now (mission timeline)? */
export async function currentActivity(missionId: string, crewUid: string, now = Date.now()): Promise<"exercise" | null> {
  const events = await listMissionDocs(missionId, "missionEvents");
  const busy = events.find(
    (e) => e.type === "exercise" && (e.crewUids.length === 0 || e.crewUids.includes(crewUid)) && Date.parse(e.start) <= now && Date.parse(e.end ?? e.start) >= now,
  );
  return busy ? "exercise" : null;
}
