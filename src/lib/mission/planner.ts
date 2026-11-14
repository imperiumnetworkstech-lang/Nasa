import type { MissionEvent, SleepLog } from "@/lib/types";

/**
 * Crew Workload & Recovery Planner rules (configurable). A PLANNING AID ONLY — it flags schedule
 * conflicts; it never makes fitness-for-duty decisions.
 */
export interface Conflict {
  crewUid: string;
  kind: "insufficient-rest" | "sleep-window-overlap";
  message: string;
  events: string[];
  at: string;
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

export function detectConflicts(events: MissionEvent[], crewUids: string[], opts: { minRestHours: number; sleepWindow: { startHour: number; endHour: number } }): Conflict[] {
  const out: Conflict[] = [];
  for (const uid of crewUids) {
    const mine = events
      .filter((e) => e.crewUids.length === 0 || e.crewUids.includes(uid))
      .filter((e) => e.end)
      .sort((a, b) => a.start.localeCompare(b.start));
    const high = mine.filter((e) => e.workload === "high");
    for (let i = 1; i < high.length; i++) {
      const gapH = (Date.parse(high[i].start) - Date.parse(high[i - 1].end!)) / 3_600_000;
      if (gapH >= 0 && gapH < opts.minRestHours) {
        out.push({
          crewUid: uid,
          kind: "insufficient-rest",
          message: `Only ${gapH.toFixed(1)} h between high-workload blocks (rule: ≥ ${opts.minRestHours} h).`,
          events: [high[i - 1].title, high[i].title],
          at: high[i].start,
        });
      }
    }
    for (const e of mine.filter((x) => x.type !== "rest" && x.workload && x.workload !== "low")) {
      const s = Date.parse(e.start);
      const en = Date.parse(e.end!);
      // check each night touched by the event
      for (let d = new Date(s - 86_400_000); d.getTime() < en + 86_400_000; d = new Date(d.getTime() + 86_400_000)) {
        const ws = new Date(d);
        ws.setUTCHours(opts.sleepWindow.startHour, 0, 0, 0);
        const we = new Date(ws.getTime() + ((opts.sleepWindow.endHour + 24 - opts.sleepWindow.startHour) % 24) * 3_600_000);
        if (overlaps(s, en, ws.getTime(), we.getTime())) {
          out.push({ crewUid: uid, kind: "sleep-window-overlap", message: `“${e.title}” overlaps the planned sleep window (${opts.sleepWindow.startHour}:00–${opts.sleepWindow.endHour}:00 UTC).`, events: [e.title], at: e.start });
          break;
        }
      }
    }
  }
  return out;
}

/** Hours of logged sleep in the 24 h before an event — shown as context, not a decision. */
export function sleepBefore(sleep: SleepLog[], at: string): number | null {
  const t = Date.parse(at);
  const prior = sleep.filter((s) => Date.parse(s.end) <= t && Date.parse(s.end) > t - 24 * 3_600_000);
  return prior.length ? prior.reduce((s, x) => s + x.durationMin, 0) / 60 : null;
}
