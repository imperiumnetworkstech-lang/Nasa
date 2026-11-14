import "server-only";
import { requireSection } from "@/lib/auth/current-user";
import { getMission } from "@/lib/data/repo";

/** Every crew page re-checks access (layouts alone are not a security boundary). */
export async function crewContext() {
  const user = await requireSection("crew");
  const mission = user.missionId ? await getMission(user.missionId) : null;
  return { user, mission, tz: user.preferences.timezone || "UTC" };
}
