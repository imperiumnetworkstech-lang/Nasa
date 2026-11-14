import type { UserProfile } from "@/lib/types";
import { canWritePersonal as _canWrite, type Subject } from "./index";

export { canReadPersonal, isAssignedMedical, filterMoodForViewer } from "./index";

export function toSubject(u: Pick<UserProfile, "uid" | "role" | "missionId">): Subject {
  return { uid: u.uid, role: u.role, missionId: u.missionId };
}

export const canWritePersonal = _canWrite;
