import "server-only";
import { listPersonal } from "@/lib/data/repo";
import { average } from "@/lib/health/baseline";
import { scaleLabel } from "@/lib/utils";
import type { ATTACHABLE } from "@/lib/validation/schemas";

export type AttachKey = (typeof ATTACHABLE)[number];

export const ATTACH_LABELS: Record<AttachKey, string> = {
  water: "Water (last 3 days)",
  sleep: "Sleep (last 3 nights)",
  heart: "Resting heart rate",
  checkin: "Latest check-in",
  exercise: "Exercise (last 7 days)",
  food: "Meals finished (last 7 days)",
};

/**
 * Builds short, plain-text summaries of the crew member's OWN recent data for a question.
 * Only the items they tick are attached — small enough for a low-bandwidth link.
 */
export async function buildAttachmentPreviews(uid: string): Promise<Record<AttachKey, string>> {
  const [hyd, sleep, vit, ci, acts, food] = await Promise.all([
    listPersonal(uid, "hydrationLogs", { sinceDays: 3 }),
    listPersonal(uid, "sleepLogs", { limit: 3 }),
    listPersonal(uid, "vitals", { sinceDays: 7 }),
    listPersonal(uid, "checkIns", { limit: 1 }),
    listPersonal(uid, "activityLogs", { sinceDays: 7 }),
    listPersonal(uid, "foodRatings", { sinceDays: 7 }),
  ]);
  const hr = vit.filter((v) => v.kind === "heart_rate" && v.quality === "valid");
  const sleepAvg = average(sleep.map((s) => s.durationMin / 60));
  const hrAvg = average(hr.map((v) => v.value));
  return {
    water: hyd.length ? `Average ${(hyd.reduce((s, h) => s + h.amountMl, 0) / 3 / 1000).toFixed(1)} L/day` : "Nothing logged",
    sleep: sleepAvg !== null ? `Average ${sleepAvg.toFixed(1)} h over ${sleep.length} nights` : "Nothing logged",
    heart: hrAvg !== null ? `${hrAvg.toFixed(0)} bpm average this week (latest ${hr[0].value})` : "No readings",
    checkin: ci[0] ? `Feeling ${scaleLabel("overall", ci[0].overall).toLowerCase()}, fatigue ${scaleLabel("fatigue", ci[0].fatigue).toLowerCase()}, stress ${scaleLabel("stress", ci[0].stress).toLowerCase()}` : "No check-in yet",
    exercise: acts.length ? `${acts.reduce((s, a) => s + a.durationMin, 0)} min over ${acts.length} sessions` : "Nothing logged",
    food: food.length ? `${Math.round((food.filter((f) => f.ate === "all").length / food.length) * 100)}% of ${food.length} meals finished` : "No meals rated",
  };
}
