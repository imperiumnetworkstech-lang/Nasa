import "server-only";
import { listMissionDocs, listPersonal } from "@/lib/data/repo";
import { personalProfile, type PersonalProfile } from "./personal";

/** Short cache so dashboards that refresh every few seconds don't re-read 28 days of vitals each time. */
const cache = new Map<string, { at: number; p: PersonalProfile }>();
const TTL = 30_000;

export async function getPersonalProfile(uid: string, opts: { fresh?: boolean } = {}): Promise<PersonalProfile> {
  const hit = cache.get(uid);
  if (!opts.fresh && hit && Date.now() - hit.at < TTL) return hit.p;
  const vitals = await listPersonal(uid, "vitals", { sinceDays: 28 });
  const p = personalProfile(vitals);
  cache.set(uid, { at: Date.now(), p });
  return p;
}

export function forgetPersonalProfile(uid: string) {
  cache.delete(uid);
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
