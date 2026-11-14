import "server-only";
import { DEFAULT_SETTINGS } from "@/lib/config";
import type {
  AppNotification,
  AuditLog,
  Invite,
  Lesson,
  Mission,
  MissionKind,
  MissionMember,
  MissionRecordMap,
  PersonalKind,
  PersonalRecordMap,
  PlatformSettings,
  UserProfile,
} from "@/lib/types";
import { getStore } from "./index";
import { newId, type QueryOptions } from "./store";

/** Typed repositories over the document store. Callers MUST check permissions first. */

// ---------- users ----------
export async function getUser(uid: string) {
  return (await getStore()).get<UserProfile>(`users/${uid}`);
}
export async function listUsers() {
  return (await getStore()).list<UserProfile>("users", { orderBy: { field: "displayName", dir: "asc" } });
}
export async function saveUser(user: UserProfile) {
  await (await getStore()).set(`users/${user.uid}`, user);
}
export async function updateUser(uid: string, patch: Partial<UserProfile>) {
  await (await getStore()).update(`users/${uid}`, { ...patch, updatedAt: new Date().toISOString() });
}

// ---------- missions ----------
export async function getMission(id: string) {
  return (await getStore()).get<Mission>(`missions/${id}`);
}
export async function listMissions() {
  return (await getStore()).list<Mission>("missions", { orderBy: { field: "startAt", dir: "desc" } });
}
export async function saveMission(m: Mission) {
  await (await getStore()).set(`missions/${m.id}`, m);
}
export async function listMembers(missionId: string) {
  return (await getStore()).list<MissionMember>(`missions/${missionId}/crew`, { orderBy: { field: "callSign", dir: "asc" } });
}
export async function setMember(missionId: string, member: MissionMember) {
  await (await getStore()).set(`missions/${missionId}/crew/${member.uid}`, member);
}
export async function removeMember(missionId: string, uid: string) {
  await (await getStore()).delete(`missions/${missionId}/crew/${uid}`);
}
export async function listCrew(missionId: string) {
  return (await listMembers(missionId)).filter((m) => m.assignment === "crew");
}

// ---------- personal records ----------
export async function listPersonal<K extends PersonalKind>(uid: string, kind: K, opts?: { sinceDays?: number; limit?: number; field?: string }) {
  const field = opts?.field ?? timeField(kind);
  const q: QueryOptions = { orderBy: { field, dir: "desc" }, limit: opts?.limit };
  if (opts?.sinceDays) q.where = [[field, ">=", new Date(Date.now() - opts.sinceDays * 86_400_000).toISOString()]];
  return (await getStore()).list<PersonalRecordMap[K]>(`users/${uid}/${kind}`, q);
}
export async function getPersonal<K extends PersonalKind>(uid: string, kind: K, id: string) {
  return (await getStore()).get<PersonalRecordMap[K]>(`users/${uid}/${kind}/${id}`);
}
/**
 * Adds a personal record. If `clientId` matches an existing record (offline replay), the
 * existing record is returned and nothing is overwritten.
 */
export async function addPersonal<K extends PersonalKind>(
  uid: string,
  kind: K,
  data: Omit<PersonalRecordMap[K], "id">,
): Promise<{ record: PersonalRecordMap[K]; duplicate: boolean }> {
  const store = await getStore();
  if (data.clientId) {
    const existing = await store.list<PersonalRecordMap[K]>(`users/${uid}/${kind}`, { where: [["clientId", "==", data.clientId]], limit: 1 });
    if (existing[0]) return { record: existing[0], duplicate: true };
  }
  const record = { ...data, id: newId() } as PersonalRecordMap[K];
  await store.set(`users/${uid}/${kind}/${record.id}`, record);
  return { record, duplicate: false };
}
export async function updatePersonal(uid: string, kind: PersonalKind, id: string, patch: Record<string, unknown>) {
  await (await getStore()).update(`users/${uid}/${kind}/${id}`, patch);
}

export function timeField(kind: PersonalKind): string {
  switch (kind) {
    case "vitals":
      return "measuredAt";
    case "sleepLogs":
      return "end";
    case "symptomReports":
    case "medications":
    case "clinicalNotes":
      return "createdAt";
    default:
      return "at";
  }
}

// ---------- mission collections ----------
export async function listMissionDocs<K extends MissionKind>(missionId: string, kind: K, q?: QueryOptions) {
  return (await getStore()).list<MissionRecordMap[K]>(`missions/${missionId}/${kind}`, q);
}
export async function getMissionDoc<K extends MissionKind>(missionId: string, kind: K, id: string) {
  return (await getStore()).get<MissionRecordMap[K]>(`missions/${missionId}/${kind}/${id}`);
}
export async function addMissionDoc<K extends MissionKind>(missionId: string, kind: K, data: Omit<MissionRecordMap[K], "id">) {
  const doc = { ...data, id: newId() } as MissionRecordMap[K];
  await (await getStore()).set(`missions/${missionId}/${kind}/${doc.id}`, doc);
  return doc;
}
export async function setMissionDoc<K extends MissionKind>(missionId: string, kind: K, doc: MissionRecordMap[K]) {
  await (await getStore()).set(`missions/${missionId}/${kind}/${doc.id}`, doc);
}
export async function updateMissionDoc(missionId: string, kind: MissionKind, id: string, patch: Record<string, unknown>) {
  await (await getStore()).update(`missions/${missionId}/${kind}/${id}`, patch);
}

// ---------- audit ----------
/** Audit entries never include health content — only who did what to which record. */
export async function audit(entry: Omit<AuditLog, "id" | "at">) {
  const log: AuditLog = { ...entry, id: newId(), at: new Date().toISOString() };
  const store = await getStore();
  await store.set(entry.missionId ? `missions/${entry.missionId}/auditLogs/${log.id}` : `platformAudit/${log.id}`, log);
}
export async function listPlatformAudit() {
  return (await getStore()).list<AuditLog>("platformAudit", { orderBy: { field: "at", dir: "desc" }, limit: 200 });
}

// ---------- notifications ----------
export async function listNotifications(uid: string) {
  return (await getStore()).list<AppNotification>(`users/${uid}/notifications`, { orderBy: { field: "createdAt", dir: "desc" }, limit: 100 });
}
export async function notify(n: Omit<AppNotification, "id" | "createdAt" | "readAt">) {
  const doc: AppNotification = { ...n, id: newId(), createdAt: new Date().toISOString(), readAt: null };
  await (await getStore()).set(`users/${n.uid}/notifications/${doc.id}`, doc);
}
export async function markNotificationsRead(uid: string, ids: string[]) {
  const store = await getStore();
  const now = new Date().toISOString();
  await Promise.all(ids.map((id) => store.update(`users/${uid}/notifications/${id}`, { readAt: now })));
}

// ---------- settings / invites / lessons ----------
export async function getSettings(): Promise<PlatformSettings> {
  const s = await (await getStore()).get<PlatformSettings>("config/platform");
  return s ? { ...DEFAULT_SETTINGS, ...s, thresholds: { ...DEFAULT_SETTINGS.thresholds, ...s.thresholds }, features: { ...DEFAULT_SETTINGS.features, ...s.features } } : DEFAULT_SETTINGS;
}
export async function saveSettings(s: PlatformSettings) {
  await (await getStore()).set("config/platform", s);
}
export async function getInvite(code: string) {
  return (await getStore()).get<Invite>(`invites/${code}`);
}
export async function listInvites() {
  return (await getStore()).list<Invite>("invites", { orderBy: { field: "createdAt", dir: "desc" } });
}
export async function saveInvite(inv: Invite) {
  await (await getStore()).set(`invites/${inv.code}`, inv);
}
export async function listLessons() {
  return (await getStore()).list<Lesson>("lessons", { orderBy: { field: "createdAt", dir: "desc" } });
}
export async function addLesson(l: Omit<Lesson, "id">) {
  const doc = { ...l, id: newId() } as Lesson;
  await (await getStore()).set(`lessons/${doc.id}`, doc);
  return doc;
}
export async function updateLesson(id: string, patch: Partial<Lesson>) {
  await (await getStore()).update(`lessons/${id}`, patch);
}

// ---------- local auth credentials (only used without Firebase Auth) ----------
export interface LocalCredential {
  email: string;
  uid: string;
  salt: string;
  hash: string;
}
const credKey = (email: string) => Buffer.from(email.trim().toLowerCase()).toString("base64url");
export async function getCredential(email: string) {
  return (await getStore()).get<LocalCredential>(`authCredentials/${credKey(email)}`);
}
export async function saveCredential(c: LocalCredential) {
  await (await getStore()).set(`authCredentials/${credKey(c.email)}`, c);
}
