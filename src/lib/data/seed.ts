import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS, DEMO_MISSION_B_ID, DEMO_MISSION_ID } from "@/lib/config";
import { evaluateRules } from "@/lib/alerts/rules";
import { alertIdFor } from "@/lib/alerts/ids";
import type {
  ActivityLog,
  Alert,
  AppNotification,
  AuditLog,
  CarePlan,
  CheckIn,
  ClinicalNote,
  CognitiveTest,
  Consultation,
  EnvironmentReading,
  HydrationLog,
  Invite,
  JournalEntry,
  Lesson,
  MealLog,
  Medication,
  MedicationLog,
  Message,
  Mission,
  MissionEvent,
  MissionMember,
  MoodLog,
  Role,
  Scale5,
  SleepLog,
  SymptomReport,
  UserProfile,
  Vital,
  WearableSession,
} from "@/lib/types";
import type { DocStore } from "./store";

/**
 * Generates SYNTHETIC demo data. All people are fictional, all records are marked
 * origin: "simulated". No real astronaut data is used anywhere.
 */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DemoPerson {
  uid: string;
  displayName: string;
  callSign: string;
  role: Role;
  missionId: string;
  email: string;
}

export const DEMO_PEOPLE: DemoPerson[] = [
  { uid: "demo-crew-1", displayName: "Anaya Rao", callSign: "Vega", role: "astronaut", missionId: DEMO_MISSION_ID, email: "vega@demo.antariksha.test" },
  { uid: "demo-crew-2", displayName: "Mateo Ruiz", callSign: "Orion", role: "astronaut", missionId: DEMO_MISSION_ID, email: "orion@demo.antariksha.test" },
  { uid: "demo-crew-3", displayName: "Kenji Mori", callSign: "Lyra", role: "astronaut", missionId: DEMO_MISSION_ID, email: "lyra@demo.antariksha.test" },
  { uid: "demo-crew-4", displayName: "Amara Okafor", callSign: "Altair", role: "astronaut", missionId: DEMO_MISSION_ID, email: "altair@demo.antariksha.test" },
  { uid: "demo-crew-5", displayName: "Sofia Lindqvist", callSign: "Rigel", role: "astronaut", missionId: DEMO_MISSION_ID, email: "rigel@demo.antariksha.test" },
  { uid: "demo-medical", displayName: "Dr. Priya Natarajan", callSign: "Surgeon", role: "medical", missionId: DEMO_MISSION_ID, email: "surgeon@demo.antariksha.test" },
  { uid: "demo-commander", displayName: "Elena Kovac", callSign: "Polaris", role: "commander", missionId: DEMO_MISSION_ID, email: "polaris@demo.antariksha.test" },
  { uid: "demo-researcher", displayName: "Dr. Samuel Achebe", callSign: "Analyst", role: "researcher", missionId: DEMO_MISSION_ID, email: "analyst@demo.antariksha.test" },
  { uid: "demo-admin", displayName: "Platform Admin", callSign: "Ops", role: "admin", missionId: DEMO_MISSION_ID, email: "admin@demo.antariksha.test" },
  // Second mission: used to demonstrate (and test) that there is no cross-mission access.
  { uid: "demo-crew-b1", displayName: "Noor Haddad", callSign: "Deneb", role: "astronaut", missionId: DEMO_MISSION_B_ID, email: "deneb@demo.antariksha.test" },
  { uid: "demo-medical-b", displayName: "Dr. Tomás Varga", callSign: "Medic-B", role: "medical", missionId: DEMO_MISSION_B_ID, email: "medic-b@demo.antariksha.test" },
];

export const DEMO_ROLE_UID: Record<Role, string> = {
  astronaut: "demo-crew-1",
  medical: "demo-medical",
  commander: "demo-commander",
  researcher: "demo-researcher",
  admin: "demo-admin",
};

const DAYS = 35;

export async function seedDemoData(store: DocStore, now: Date): Promise<void> {
  const r = rng(20261114);
  const n = (mean: number, sd: number) => {
    // Box–Muller
    const u = Math.max(r(), 1e-9);
    const v = r();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const s5 = (v: number): Scale5 => Math.min(5, Math.max(1, Math.round(v))) as Scale5;
  const iso = (d: Date) => d.toISOString();
  const atDay = (dayOffset: number, hour: number, minute = 0) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - dayOffset);
    d.setUTCHours(hour, minute, 0, 0);
    // Records for past/today must never be in the future; planned events use negative offsets.
    if (dayOffset >= 0 && d.getTime() > now.getTime()) return new Date(now.getTime() - (20 + hour) * 60_000);
    return d;
  };
  let idc = 0;
  const id = (p: string) => `${p}-${(++idc).toString(36).padStart(5, "0")}`;
  const entries: { path: string; data: object }[] = [];
  const put = (path: string, data: object) => entries.push({ path, data });

  const missionStart = atDay(38, 6);
  const missions: Mission[] = [
    {
      id: DEMO_MISSION_ID,
      name: "ANT-01 Long-Duration Analog (Demo)",
      missionCode: "ANT-01",
      description: "Synthetic 180-day isolated-habitat analog mission used to demonstrate Antariksha. Not a real mission.",
      startAt: iso(missionStart),
      endAt: iso(new Date(missionStart.getTime() + 180 * 86_400_000)),
      status: "active",
      timezone: "UTC",
      isDemo: true,
      createdAt: iso(missionStart),
    },
    {
      id: DEMO_MISSION_B_ID,
      name: "ANT-02 Short Analog (Demo)",
      missionCode: "ANT-02",
      description: "Second synthetic mission used to demonstrate mission-level data isolation.",
      startAt: iso(atDay(10, 6)),
      endAt: iso(atDay(-20, 6)),
      status: "active",
      timezone: "UTC",
      isDemo: true,
      createdAt: iso(atDay(10, 6)),
    },
  ];
  for (const m of missions) put(`missions/${m.id}`, m);

  for (const p of DEMO_PEOPLE) {
    const u: UserProfile = {
      uid: p.uid,
      displayName: p.displayName,
      email: p.email,
      photoURL: null,
      role: p.role,
      status: "active",
      missionId: p.missionId,
      callSign: p.callSign,
      isDemo: true,
      createdAt: iso(missionStart),
      updatedAt: iso(missionStart),
      preferences: { ...DEFAULT_PREFERENCES, hydrationTargetMl: p.role === "astronaut" ? 2500 : null },
      dietaryConstraints: p.uid === "demo-crew-3" ? "Vegetarian (demo entry)" : undefined,
    };
    put(`users/${p.uid}`, u);
    const member: MissionMember = {
      uid: p.uid,
      assignment: p.role === "astronaut" ? "crew" : p.role === "admin" ? "commander" : (p.role as MissionMember["assignment"]),
      callSign: p.callSign,
      displayName: p.displayName,
      joinedAt: iso(missionStart),
    };
    if (p.role !== "admin") put(`missions/${p.missionId}/crew/${p.uid}`, member);
  }

  // Demo shows communication-delay mode: 8 minutes one-way, continuous link.
  put("config/platform", { ...DEFAULT_SETTINGS, commDelaySeconds: 480, updatedAt: iso(now), updatedBy: "seed" });
  const invites: Invite[] = [
    { code: "DEMO-CREW", role: "astronaut", missionId: DEMO_MISSION_ID, usesLeft: 50, createdBy: "demo-admin", createdAt: iso(now) },
  ];
  for (const inv of invites) put(`invites/${inv.code}`, inv);

  const crew = DEMO_PEOPLE.filter((p) => p.role === "astronaut");
  const base: Record<string, { hr: number; sleep: number; stress: number; eda: number; skin: number }> = {
    "demo-crew-1": { hr: 58, sleep: 7.4, stress: 2, eda: 2.1, skin: 33.2 },
    "demo-crew-2": { hr: 64, sleep: 7.0, stress: 2.4, eda: 3.4, skin: 32.8 },
    "demo-crew-3": { hr: 61, sleep: 7.2, stress: 2.2, eda: 1.6, skin: 33.6 },
    "demo-crew-4": { hr: 67, sleep: 6.9, stress: 2.6, eda: 2.8, skin: 32.5 },
    "demo-crew-5": { hr: 60, sleep: 7.6, stress: 2.1, eda: 2.4, skin: 33.0 },
    "demo-crew-b1": { hr: 62, sleep: 7.1, stress: 2.3, eda: 2.2, skin: 33.1 },
  };
  const common = { origin: "simulated" as const };

  const allRecords: Record<string, { vitals: Vital[]; sleep: SleepLog[]; checkIns: CheckIn[]; symptoms: SymptomReport[] }> = {};

  for (const p of crew) {
    const b = base[p.uid];
    const col = (k: string) => `users/${p.uid}/${k}`;
    const rec = { vitals: [] as Vital[], sleep: [] as SleepLog[], checkIns: [] as CheckIn[], symptoms: [] as SymptomReport[] };
    allRecords[p.uid] = rec;
    const days = p.missionId === DEMO_MISSION_ID ? DAYS : 10;
    for (let d = days - 1; d >= 0; d--) {
      const missionDay = Math.floor((atDay(d, 12).getTime() - Date.parse(missions.find((m) => m.id === p.missionId)!.startAt)) / 86_400_000) + 1;
      const recordBase = { uid: p.uid, missionId: p.missionId, enteredBy: p.uid, ...common };

      // Sleep (night ending this morning)
      let sleepH = n(b.sleep, 0.55);
      if (p.uid === "demo-crew-3" && d < 4) sleepH = n(5.0, 0.3);
      if (d % 9 === 4) sleepH -= 0.8; // occasional shift change
      const end = atDay(d, 6, Math.floor(r() * 40));
      const start = new Date(end.getTime() - sleepH * 3_600_000);
      const sl: SleepLog = {
        ...recordBase,
        id: id("sl"),
        createdAt: iso(end),
        start: iso(start),
        end: iso(end),
        durationMin: Math.round(sleepH * 60),
        quality: s5(n(sleepH > 6.5 ? 3.8 : 2.6, 0.6)),
        wakeUps: Math.max(0, Math.round(n(1.2, 1))),
        restfulness: s5(n(sleepH > 6.5 ? 3.6 : 2.5, 0.7)),
        shift: d % 9 === 4 ? "Shifted schedule (docking prep)" : "Nominal",
      };
      rec.sleep.push(sl);
      put(`${col("sleepLogs")}/${sl.id}`, sl);

      // Vitals (morning, simulated wearable/manual)
      const t = atDay(d, 7, 10 + Math.floor(r() * 20));
      const hrShift = p.uid === "demo-crew-2" && d < 2 ? 15 : 0;
      const mk = (kind: Vital["kind"], value: number, unit: string, extra: Partial<Vital> = {}): Vital => ({
        ...recordBase,
        id: id("vt"),
        createdAt: iso(t),
        kind,
        value: Math.round(value * 10) / 10,
        unit,
        measuredAt: iso(t),
        source: "simulated",
        device: "Simulated wrist wearable (demo)",
        quality: "valid",
        ...extra,
      });
      const vs: Vital[] = [
        mk("heart_rate", Math.round(n(b.hr + hrShift, 2.2)), "bpm"),
        mk("blood_pressure", Math.round(n(116, 5)), "mmHg", { value2: Math.round(n(75, 4)) }),
        mk("temperature", n(36.7, 0.15), "°C"),
        mk("spo2", Math.min(100, Math.round(n(97.6, 0.7))), "%"),
        mk("resp_rate", Math.round(n(14, 1.2)), "breaths/min"),
        mk("eda", Math.max(0.2, n(b.eda + (p.uid === "demo-crew-5" && d < 4 ? 1.6 : 0), 0.35)), "µS"),
        mk("skin_temp", n(b.skin, 0.3), "°C"),
        mk("hrv", Math.max(10, n(62 - (b.hr - 58) - hrShift, 6)), "ms"),
      ];
      if (d === 17) vs[0] = { ...vs[0], value: 142, quality: "questionable", device: "Simulated wrist wearable (demo) — motion artefact suspected" };
      for (const v of vs) put(`${col("vitals")}/${v.id}`, v);
      rec.vitals.push(...vs);

      // Wearable sessions: rest, exercise, work block
      const sessions: { ctx: string; hour: number; f: number[]; hrD: number; motion: number }[] = [
        { ctx: "Morning rest", hour: 7, f: [n(0, 2), n(0, 0.4), n(0, 0.8), n(0, 0.4), n(0, 0.15), n(0, 0.03), n(0, 0.8), n(1, 0.3)], hrD: 0, motion: 1.0 },
        { ctx: "Exercise (resistance/aerobic)", hour: 10, f: [n(28, 6), n(-0.6, 0.5), n(3.5, 1.2), n(1.2, 0.6), n(-0.3, 0.2), n(-0.05, 0.04), n(7, 2), n(5, 1.5)], hrD: 28, motion: 1.3 },
        {
          ctx: "Procedure / high-focus work",
          hour: 15,
          f: [n(6, 3), n(0, 0.4), n(p.uid === "demo-crew-5" && d < 4 ? 4 : 2, 0.9), n(0.9, 0.5), n(0.1, 0.15), n(0.02, 0.03), n(0.5, 0.6), n(1.4, 0.4)],
          hrD: 6,
          motion: 1.05,
        },
      ];
      if (d < 14) {
        for (const s of sessions) {
          const at = atDay(d, s.hour, Math.floor(r() * 50));
          const ws: WearableSession = {
            ...recordBase,
            id: id("ws"),
            createdAt: iso(at),
            at: iso(at),
            durationS: 30,
            source: "simulated",
            device: "Simulated wrist wearable (demo)",
            hrMean: Math.round(b.hr + s.f[0]),
            spo2Mean: Math.round((97.6 + s.f[1]) * 10) / 10,
            edaMean: Math.round(Math.max(0.1, b.eda + s.f[2] * 0.35) * 100) / 100,
            skinTempMean: Math.round((b.skin + s.f[4]) * 10) / 10,
            motionMean: Math.round(s.motion * 100) / 100,
            features: s.f.map((x) => Math.round(x * 1000) / 1000),
            context: s.ctx,
          };
          put(`${col("wearableSessions")}/${ws.id}`, ws);
        }
      }

      // Check-in (crew-4 stopped checking in 3 days ago; occasional gaps)
      const skip = (p.uid === "demo-crew-4" && d < 3) || r() < 0.08;
      if (!skip) {
        const stressHigh = p.uid === "demo-crew-5" && d < 4;
        const c: CheckIn = {
          ...recordBase,
          id: id("ci"),
          at: iso(atDay(d, 8, Math.floor(r() * 50))),
          createdAt: iso(atDay(d, 8)),
          missionDay,
          overall: s5(n(stressHigh ? 2.6 : 3.9, 0.6)),
          fatigue: p.uid === "demo-crew-3" && d < 4 ? s5(n(4.2, 0.4)) : s5(n(2.3, 0.7)),
          stress: stressHigh ? s5(n(4.4, 0.3)) : r() < 0.05 ? null : s5(n(b.stress, 0.7)),
          pain: p.uid === "demo-crew-2" && d < 3 ? 3 : s5(n(1.4, 0.5)),
          note: d === 0 && p.uid === "demo-crew-2" ? "Mild headache since yesterday (demo)." : undefined,
          wantsFollowUp: p.uid === "demo-crew-2" && d === 0,
        };
        rec.checkIns.push(c);
        put(`${col("checkIns")}/${c.id}`, c);
      }

      // Mood
      const moodStress = p.uid === "demo-crew-5" && d < 4 ? s5(n(4.3, 0.4)) : s5(n(b.stress, 0.7));
      const mood: MoodLog = {
        ...recordBase,
        id: id("md"),
        at: iso(atDay(d, 20, Math.floor(r() * 50))),
        createdAt: iso(atDay(d, 20)),
        mood: s5(n(p.uid === "demo-crew-5" && d < 4 ? 2.4 : 3.8, 0.6)),
        stress: moodStress,
        reflection: d === 1 && p.uid === "demo-crew-5" ? "Busy week, missing home a bit. (demo)" : undefined,
        shareWithMedical: p.uid !== "demo-crew-1",
      };
      put(`${col("moodLogs")}/${mood.id}`, mood);

      // Hydration (last 14 days)
      if (d < 14) {
        const count = 5 + Math.floor(r() * 4);
        for (let i = 0; i < count; i++) {
          const h: HydrationLog = {
            ...recordBase,
            id: id("hy"),
            at: iso(atDay(d, 7 + i * 2, Math.floor(r() * 50))),
            createdAt: iso(atDay(d, 7 + i * 2)),
            amountMl: pick([200, 250, 300, 350, 400]),
          };
          put(`${col("hydrationLogs")}/${h.id}`, h);
        }
        for (const mealType of ["breakfast", "lunch", "dinner"] as const) {
          const meal: MealLog = {
            ...recordBase,
            id: id("ml"),
            at: iso(atDay(d, mealType === "breakfast" ? 7 : mealType === "lunch" ? 12 : 18, 30)),
            createdAt: iso(atDay(d, 12)),
            mealType,
            note: pick(["Standard menu", "Rehydratable menu item", "Fresh produce delivery", undefined]),
          };
          put(`${col("mealLogs")}/${meal.id}`, meal);
        }
      }

      // Activity
      const acts: ActivityLog[] = [
        {
          ...recordBase,
          id: id("ac"),
          at: iso(atDay(d, 10)),
          createdAt: iso(atDay(d, 11)),
          category: "resistance",
          name: "Resistance session",
          durationMin: Math.round(n(55, 8)),
          intensity: pick(["moderate", "vigorous"]),
          soreness: Math.min(4, Math.max(0, Math.round(n(1.3, 0.8)))) as ActivityLog["soreness"],
          recovery: s5(n(3.8, 0.6)),
        },
        {
          ...recordBase,
          id: id("ac"),
          at: iso(atDay(d, 16)),
          createdAt: iso(atDay(d, 17)),
          category: d % 2 ? "aerobic" : "mobility",
          name: d % 2 ? "Cycle ergometer" : "Mobility & stretching",
          durationMin: Math.round(n(d % 2 ? 35 : 20, 5)),
          intensity: d % 2 ? "moderate" : "light",
          soreness: null,
          recovery: null,
        },
      ];
      for (const a of acts) put(`${col("activityLogs")}/${a.id}`, a);

      // Cognitive self-tests every 3 days
      if (d % 3 === 0) {
        const fatigueShift = p.uid === "demo-crew-3" && d < 4 ? 45 : 0;
        const ct: CognitiveTest = {
          ...recordBase,
          id: id("cg"),
          at: iso(atDay(d, 9)),
          createdAt: iso(atDay(d, 9)),
          test: "reaction",
          score: Math.round(n(290 + fatigueShift, 18)),
          unit: "ms (median)",
          detail: "5 trials",
          selfFocus: s5(n(3.8, 0.6)),
          mentalFatigue: s5(n(fatigueShift ? 4 : 2.2, 0.6)),
        };
        put(`${col("cognitiveTests")}/${ct.id}`, ct);
      }
    }

    // Journal entries (private) — only crew-1
    if (p.uid === "demo-crew-1") {
      for (const [d, text] of [
        [6, "Saw the sunrise through the cupola simulator window. Felt calm. (demo journal entry)"],
        [2, "Tough day of procedures but good teamwork. (demo journal entry)"],
      ] as const) {
        const j: JournalEntry = { uid: p.uid, missionId: p.missionId, enteredBy: p.uid, ...common, id: id("jn"), at: iso(atDay(d, 21)), createdAt: iso(atDay(d, 21)), text };
        put(`users/${p.uid}/journal/${j.id}`, j);
      }
    }
  }

  // Symptom reports
  const symptoms: SymptomReport[] = [
    {
      id: "sym-orion-headache",
      uid: "demo-crew-2",
      missionId: DEMO_MISSION_ID,
      enteredBy: "demo-crew-2",
      origin: "simulated",
      createdAt: iso(atDay(0, 9)),
      bodyArea: "Head",
      symptomType: "Headache",
      description: "Dull headache, worse in the afternoon. (synthetic demo report)",
      severity: "moderate",
      onset: iso(atDay(1, 15)),
      duration: "About 1 day",
      associated: ["Fatigue"],
      requestReview: true,
      status: "in_review",
      history: [
        { at: iso(atDay(0, 9)), by: "demo-crew-2", byName: "Mateo Ruiz", action: "Submitted" },
        { at: iso(atDay(0, 10)), by: "demo-medical", byName: "Dr. Priya Natarajan", action: "Acknowledged" },
        { at: iso(atDay(0, 10, 5)), by: "demo-medical", byName: "Dr. Priya Natarajan", action: "In review", note: "Will call at next comm window." },
      ],
    },
    {
      id: "sym-vega-back",
      uid: "demo-crew-1",
      missionId: DEMO_MISSION_ID,
      enteredBy: "demo-crew-1",
      origin: "simulated",
      createdAt: iso(atDay(20, 18)),
      bodyArea: "Lower back",
      symptomType: "Muscle soreness",
      description: "Lower back tightness after resistance session. (synthetic demo report)",
      severity: "mild",
      onset: iso(atDay(20, 11)),
      duration: "A few hours",
      associated: [],
      requestReview: false,
      status: "resolved",
      history: [
        { at: iso(atDay(20, 18)), by: "demo-crew-1", byName: "Anaya Rao", action: "Submitted" },
        { at: iso(atDay(18, 9)), by: "demo-medical", byName: "Dr. Priya Natarajan", action: "Resolved", note: "Improved with mobility routine." },
      ],
    },
  ];
  for (const s of symptoms) {
    put(`users/${s.uid}/symptomReports/${s.id}`, s);
    allRecords[s.uid]?.symptoms.push(s);
  }

  // Medications (entered by the medical officer — illustrative placeholders, not real prescriptions)
  const med: Medication = {
    id: "med-orion-1",
    uid: "demo-crew-2",
    missionId: DEMO_MISSION_ID,
    enteredBy: "demo-medical",
    origin: "simulated",
    createdAt: iso(atDay(30, 9)),
    name: "Demo Medication A (placeholder)",
    dose: "As entered by flight surgeon (demo placeholder)",
    schedule: "Once daily, morning",
    instructions: "Fictional regimen for demonstration only.",
    active: true,
  };
  put(`users/demo-crew-2/medications/${med.id}`, med);
  for (let d = 13; d >= 0; d--) {
    const ml: MedicationLog = {
      id: id("mlg"),
      uid: "demo-crew-2",
      missionId: DEMO_MISSION_ID,
      enteredBy: "demo-crew-2",
      origin: "simulated",
      createdAt: iso(atDay(d, 8)),
      at: iso(atDay(d, 8, 5)),
      medicationId: med.id,
      medicationName: med.name,
      status: d === 6 ? "skipped" : d === 3 ? "late" : "taken",
    };
    put(`users/demo-crew-2/medicationLogs/${ml.id}`, ml);
  }
  const note: ClinicalNote = {
    id: "cn-orion-1",
    uid: "demo-crew-2",
    missionId: DEMO_MISSION_ID,
    enteredBy: "demo-medical",
    authorName: "Dr. Priya Natarajan",
    origin: "simulated",
    createdAt: iso(atDay(0, 10, 10)),
    text: "Headache report acknowledged. Plan: review hydration and sleep logs, repeat vitals tomorrow morning. (synthetic note)",
  };
  put(`users/demo-crew-2/clinicalNotes/${note.id}`, note);

  // Alerts from the real rule engine
  const settings = DEFAULT_SETTINGS;
  for (const p of crew) {
    const rec = allRecords[p.uid];
    const candidates = evaluateRules({ crewUid: p.uid, crewLabel: p.callSign, now, thresholds: settings.thresholds, ...rec });
    for (const c of candidates) {
      const alert: Alert = {
        ...c,
        id: alertIdFor(c.dedupeKey),
        missionId: p.missionId,
        crewUid: p.uid,
        crewLabel: p.callSign,
        status: c.ruleId === "symptom-review" ? "acknowledged" : "open",
        assignedTo: null,
        createdAt: iso(now),
        origin: "simulated",
        history: [{ at: iso(now), by: "system", byName: "Rule engine", action: "Created", note: `Rule ${c.ruleId} v${c.ruleVersion}` }],
      };
      put(`missions/${p.missionId}/alerts/${alert.id}`, alert);
    }
  }
  // One historical resolved alert for the audit trail.
  const resolved: Alert = {
    id: "alert-hist-1",
    missionId: DEMO_MISSION_ID,
    crewUid: "demo-crew-1",
    crewLabel: "Vega",
    ruleId: "sleep-deficit",
    ruleVersion: "2026.11-1",
    dedupeKey: "sleep-deficit:demo-crew-1:historical",
    severity: "attention",
    title: "Short sleep over the last 3 nights",
    observed: "5.6 h average",
    source: "Sleep logs",
    observedAt: iso(atDay(15, 6)),
    reason: "3-night average below the configured 6 h (illustrative default).",
    dataState: "fresh",
    recommendedAction: "Review schedule and workload.",
    operational: true,
    status: "resolved",
    assignedTo: "demo-medical",
    createdAt: iso(atDay(15, 7)),
    origin: "simulated",
    history: [
      { at: iso(atDay(15, 7)), by: "system", byName: "Rule engine", action: "Created" },
      { at: iso(atDay(15, 9)), by: "demo-medical", byName: "Dr. Priya Natarajan", action: "Acknowledged" },
      { at: iso(atDay(13, 9)), by: "demo-medical", byName: "Dr. Priya Natarajan", action: "Resolved", note: "Schedule adjusted after docking ops." },
    ],
  };
  put(`missions/${DEMO_MISSION_ID}/alerts/${resolved.id}`, resolved);

  // Care plans
  const plans: CarePlan[] = [
    {
      id: "cp-orion",
      missionId: DEMO_MISSION_ID,
      crewUid: "demo-crew-2",
      title: "Headache follow-up",
      tasks: [
        { id: "t1", title: "Log hydration for 3 days", due: iso(atDay(-2, 20)), doneAt: null },
        { id: "t2", title: "Repeat morning vitals", due: iso(atDay(-1, 8)), doneAt: null },
        { id: "t3", title: "Call with flight surgeon", due: iso(atDay(-1, 14)), doneAt: null },
      ],
      status: "active",
      createdBy: "demo-medical",
      createdByName: "Dr. Priya Natarajan",
      createdAt: iso(atDay(0, 10)),
      origin: "simulated",
    },
    {
      id: "cp-lyra",
      missionId: DEMO_MISSION_ID,
      crewUid: "demo-crew-3",
      title: "Sleep opportunity plan",
      tasks: [
        { id: "t1", title: "Protect 8 h sleep window", due: iso(atDay(-1, 22)), doneAt: null },
        { id: "t2", title: "Review light-cycle settings with commander", due: iso(atDay(-2, 12)), doneAt: iso(atDay(0, 12)) },
      ],
      status: "active",
      createdBy: "demo-medical",
      createdByName: "Dr. Priya Natarajan",
      createdAt: iso(atDay(1, 10)),
      origin: "simulated",
    },
    {
      id: "cp-vega",
      missionId: DEMO_MISSION_ID,
      crewUid: "demo-crew-1",
      title: "Back mobility routine",
      tasks: [{ id: "t1", title: "Daily 10-minute mobility routine", due: iso(atDay(-3, 18)), doneAt: null }],
      status: "active",
      createdBy: "demo-medical",
      createdByName: "Dr. Priya Natarajan",
      createdAt: iso(atDay(19, 10)),
      origin: "simulated",
    },
  ];
  for (const cp of plans) put(`missions/${cp.missionId}/carePlans/${cp.id}`, cp);

  // Mission events (timeline + workload planner)
  const crewIds = crew.filter((c) => c.missionId === DEMO_MISSION_ID).map((c) => c.uid);
  const events: MissionEvent[] = [];
  const ev = (d: number, h: number, hours: number, type: MissionEvent["type"], title: string, workload: MissionEvent["workload"], uids: string[], notes?: string) =>
    events.push({
      id: id("ev"),
      missionId: DEMO_MISSION_ID,
      type,
      title,
      start: iso(atDay(d, h)),
      end: iso(new Date(atDay(d, h).getTime() + hours * 3_600_000)),
      workload,
      crewUids: uids,
      notes,
      createdBy: "demo-commander",
      createdAt: iso(atDay(d + 2, 9)),
      origin: "simulated",
    });
  ev(30, 13, 6, "eva", "Simulated EVA 1", "high", ["demo-crew-1", "demo-crew-2"]);
  ev(22, 13, 7, "eva", "Simulated EVA 2", "high", ["demo-crew-3", "demo-crew-5"]);
  ev(13, 0, 48, "shift_change", "Docking prep — shifted schedule", "moderate", crewIds);
  ev(9, 8, 72, "comm_delay", "Communication-delay drill (20 min one-way)", "moderate", crewIds, "Simulated delay; non-emergency traffic queued.");
  ev(4, 6, 3, "vehicle", "Habitat CO₂ scrubber maintenance", "moderate", ["demo-crew-3"]);
  ev(3, 13, 6, "eva", "Simulated EVA 3", "high", ["demo-crew-3", "demo-crew-4"]);
  ev(-1, 13, 6, "eva", "Planned EVA 4", "high", ["demo-crew-1", "demo-crew-3"]);
  ev(-1, 22, 6, "workload", "Overnight systems check", "high", ["demo-crew-3"], "Conflicts with sleep window — intentionally included to demo the planner.");
  ev(-2, 9, 4, "workload", "Science block: sample processing", "moderate", ["demo-crew-2", "demo-crew-5"]);
  ev(-2, 22, 8, "rest", "Protected rest window", "low", ["demo-crew-3"]);
  ev(-3, 10, 2, "exercise", "Group exercise session", "moderate", crewIds);
  for (const e of events) put(`missions/${DEMO_MISSION_ID}/missionEvents/${e.id}`, e);

  // Environment readings every 6 h — simulated
  for (let d = DAYS - 1; d >= 0; d--) {
    for (const h of [0, 6, 12, 18]) {
      const scrubberIssue = d === 4 || d === 5;
      const env: EnvironmentReading = {
        id: id("env"),
        missionId: DEMO_MISSION_ID,
        at: iso(atDay(d, h)),
        temperatureC: Math.round(n(22.2 + (h === 12 ? 0.8 : 0), 0.4) * 10) / 10,
        humidityPct: Math.round(n(44, 3)),
        co2Ppm: Math.round(n(scrubberIssue ? 3900 : 2600, 220)),
        noiseDb: Math.round(n(h === 0 ? 50 : 58, 2)),
        lightPhase: h === 0 || h === 18 ? "night" : "day",
        radiationUSvPerDay: null,
        source: "Simulated habitat sensors (demo)",
        origin: "simulated",
      };
      put(`missions/${DEMO_MISSION_ID}/environmentReadings/${env.id}`, env);
    }
  }

  // Messages
  const msgs: Message[] = [
    {
      id: "msg-1",
      missionId: DEMO_MISSION_ID,
      threadId: "demo-crew-2",
      fromUid: "demo-medical",
      fromName: "Dr. Priya Natarajan",
      toUid: "demo-crew-2",
      body: "Thanks for the report, Orion. Please log water intake today and repeat vitals tomorrow morning. (demo)",
      priority: "routine",
      createdAt: iso(atDay(0, 10, 12)),
      deliverAt: iso(atDay(0, 10, 12)),
      acknowledgedAt: null,
      origin: "simulated",
    },
    {
      id: "msg-2",
      missionId: DEMO_MISSION_ID,
      threadId: "demo-crew-1",
      fromUid: "demo-medical",
      fromName: "Dr. Priya Natarajan",
      toUid: "demo-crew-1",
      body: "Nice consistency on the mobility routine this week. (demo)",
      priority: "routine",
      createdAt: iso(atDay(1, 15)),
      deliverAt: iso(atDay(1, 15)),
      acknowledgedAt: iso(atDay(1, 16)),
      origin: "simulated",
    },
  ];
  for (const m of msgs) put(`missions/${DEMO_MISSION_ID}/messages/${m.id}`, m);

  const consult: Consultation = {
    id: "con-1",
    missionId: DEMO_MISSION_ID,
    crewUid: "demo-crew-2",
    crewLabel: "Orion",
    reason: "Discuss headache and sleep.",
    preferredWindow: "Next comm pass",
    status: "scheduled",
    scheduledFor: iso(atDay(-1, 14)),
    createdAt: iso(atDay(0, 9, 30)),
    history: [{ at: iso(atDay(0, 9, 30)), by: "demo-crew-2", byName: "Mateo Ruiz", action: "Requested" }],
    origin: "simulated",
  };
  put(`missions/${DEMO_MISSION_ID}/consultations/${consult.id}`, consult);

  const audits: AuditLog[] = [
    { id: id("au"), missionId: DEMO_MISSION_ID, at: iso(atDay(0, 10)), actorUid: "demo-medical", actorName: "Dr. Priya Natarajan", action: "symptom.status", target: "users/demo-crew-2/symptomReports/sym-orion-headache", detail: "acknowledged → in_review" },
    { id: id("au"), missionId: DEMO_MISSION_ID, at: iso(atDay(13, 9)), actorUid: "demo-medical", actorName: "Dr. Priya Natarajan", action: "alert.resolve", target: "alerts/alert-hist-1" },
    { id: id("au"), missionId: DEMO_MISSION_ID, at: iso(atDay(1, 10)), actorUid: "demo-medical", actorName: "Dr. Priya Natarajan", action: "record.view", target: "users/demo-crew-3 (crew detail)" },
  ];
  for (const a of audits) put(`missions/${DEMO_MISSION_ID}/auditLogs/${a.id}`, a);

  const lessons: Lesson[] = [
    {
      id: "lesson-1",
      missionId: DEMO_MISSION_ID,
      title: "Pre-hydrate before long procedure blocks",
      body: "Crew found scheduling a water break 30 minutes before multi-hour procedures reduced afternoon fatigue reports. (synthetic lesson)",
      tags: ["hydration", "workload"],
      phase: "Early mission",
      module: "Hydration",
      status: "published",
      submittedBy: "Vega",
      approvedBy: "Dr. Priya Natarajan",
      createdAt: iso(atDay(12, 10)),
      origin: "simulated",
    },
    {
      id: "lesson-2",
      missionId: DEMO_MISSION_ID,
      title: "Light-cycle reset after schedule shifts",
      body: "Using the habitat's warm-light evening setting for two nights after a shift change helped self-rated sleep quality. (synthetic lesson)",
      tags: ["sleep", "circadian"],
      phase: "Mid mission",
      module: "Sleep",
      status: "published",
      submittedBy: "Lyra",
      approvedBy: "Dr. Priya Natarajan",
      createdAt: iso(atDay(8, 10)),
      origin: "simulated",
    },
    {
      id: "lesson-3",
      missionId: DEMO_MISSION_ID,
      title: "Glove-friendly check-in buttons",
      body: "Larger tap targets made check-ins easier during suit-fit sessions. (synthetic lesson)",
      tags: ["ergonomics"],
      phase: "Mid mission",
      module: "Check-in",
      status: "submitted",
      submittedBy: "Altair",
      approvedBy: null,
      createdAt: iso(atDay(2, 10)),
      origin: "simulated",
    },
  ];
  for (const l of lessons) put(`lessons/${l.id}`, l);

  // Notifications
  const nts: AppNotification[] = [
    { id: id("nt"), uid: "demo-crew-1", kind: "check_in", title: "Daily check-in", body: "Your check-in for today is ready when you are.", href: "/app/crew/check-in", createdAt: iso(atDay(0, 7)), readAt: null },
    { id: id("nt"), uid: "demo-crew-1", kind: "care_plan", title: "Care plan task due", body: "Daily 10-minute mobility routine", href: "/app/crew/my-plan", createdAt: iso(atDay(0, 8)), readAt: null },
    { id: id("nt"), uid: "demo-crew-2", kind: "medical_review", title: "Symptom report in review", body: "Your headache report is being reviewed.", href: "/app/crew/symptoms", createdAt: iso(atDay(0, 10)), readAt: null },
    { id: id("nt"), uid: "demo-crew-2", kind: "medication", title: "Medication reminder", body: "Demo Medication A — morning", href: "/app/crew/medications", createdAt: iso(atDay(0, 7)), readAt: null },
    { id: id("nt"), uid: "demo-medical", kind: "alert", title: "New alerts", body: "The rule engine raised alerts for review.", href: "/app/medical/alerts", createdAt: iso(now), readAt: null },
    { id: id("nt"), uid: "demo-commander", kind: "schedule", title: "Planner conflict", body: "Overnight systems check overlaps a sleep window.", href: "/app/mission/operations", createdAt: iso(now), readAt: null },
  ];
  for (const x of nts) put(`users/${x.uid}/notifications/${x.id}`, x);

  // ---------- Menu Fatigue Radar ----------
  const pantry = ["Beef stew", "Chicken curry", "Vegetable lasagna", "Teriyaki salmon", "Black bean chili", "Lemon pepper tuna", "Lentil dal", "Macaroni and cheese", "Scrambled eggs", "Oatmeal with raisins", "Chocolate pudding"];
  for (const p of crew.filter((c) => c.missionId === DEMO_MISSION_ID)) {
    for (let d = 20; d >= 0; d--) {
      for (const slot of [12, 18]) {
        let item = pantry[Math.floor(r() * pantry.length)];
        // Vega gets Beef stew often and slowly tires of it (menu fatigue demo).
        if (p.uid === "demo-crew-1" && d % 3 === 0 && slot === 18) item = "Beef stew";
        let rating = Math.min(5, Math.max(1, Math.round(n(3.9, 0.7)))) as 1 | 2 | 3 | 4 | 5;
        let ate: "all" | "some" | "none" = r() < 0.85 ? "all" : "some";
        if (item === "Beef stew" && p.uid === "demo-crew-1") {
          rating = (d > 12 ? 5 : d > 6 ? 3 : 2) as 1 | 2 | 3 | 4 | 5;
          ate = d > 6 ? "all" : d > 3 ? "some" : "none";
        }
        // Rigel's appetite drops this week (shows the appetite trend for medical).
        if (p.uid === "demo-crew-5" && d < 6) ate = r() < 0.6 ? "some" : "none";
        const fr = { id: id("fr"), uid: p.uid, missionId: p.missionId, enteredBy: p.uid, origin: "simulated" as const, createdAt: iso(atDay(d, slot)), at: iso(atDay(d, slot, 30)), item, rating, ate };
        put(`users/${p.uid}/foodRatings/${fr.id}`, fr);
      }
    }
  }

  // ---------- Exercise Balance: weekly targets set by the medical officer ----------
  for (const p of crew.filter((c) => c.missionId === DEMO_MISSION_ID)) {
    put(`missions/${DEMO_MISSION_ID}/exercisePlans/${p.uid}`, {
      id: p.uid,
      missionId: DEMO_MISSION_ID,
      crewUid: p.uid,
      resistanceMinPerWeek: 360,
      aerobicMinPerWeek: 210,
      mobilityMinPerWeek: 90,
      setBy: "demo-medical",
      setByName: "Dr. Priya Natarajan",
      updatedAt: iso(atDay(30, 9)),
      origin: "simulated",
    });
  }

  // ---------- Skill Keeper: practice cards (demo placeholders, not real procedures) ----------
  const cards = [
    { title: "Medical kit location", prompt: "Where is the main medical kit stowed?", answer: "Demo: Node 1, rack 2, upper locker (blue label).", category: "kit", halfLifeDays: 21 },
    { title: "Oxygen mask", prompt: "Where are the emergency oxygen masks, and how many are there?", answer: "Demo: next to each sleep station hatch — one per crew member plus two spares.", category: "equipment", halfLifeDays: 14 },
    { title: "Who to alert first", prompt: "In a medical event, who do you alert first?", answer: "Follow the mission emergency procedure: alert the commander and crew medical officer at the same time, then the ground.", category: "communication", halfLifeDays: 30 },
    { title: "Handheld vitals monitor", prompt: "How do you take and save a reading with the handheld vitals monitor?", answer: "Demo placeholder — the mission medical team supplies the approved steps.", category: "procedure", halfLifeDays: 14 },
    { title: "Defibrillator location", prompt: "Where is the defibrillator?", answer: "Demo: galley wall, behind the yellow panel.", category: "equipment", halfLifeDays: 21 },
    { title: "Eye-wash station", prompt: "Where is the eye-wash kit and how long should you rinse?", answer: "Demo placeholder — location and steps come from the approved procedure.", category: "kit", halfLifeDays: 21 },
  ] as const;
  const cardIds: string[] = [];
  for (const c of cards) {
    const cid = id("sk");
    cardIds.push(cid);
    put(`missions/${DEMO_MISSION_ID}/skillCards/${cid}`, { id: cid, missionId: DEMO_MISSION_ID, ...c, authoredBy: "Dr. Priya Natarajan", createdAt: iso(atDay(35, 9)), origin: "simulated" });
  }
  for (const p of crew.filter((c) => c.missionId === DEMO_MISSION_ID)) {
    for (const cid of cardIds) {
      // Lyra has not practised recently (stale skills); others vary.
      const recentGap = p.uid === "demo-crew-3" ? 26 : Math.floor(r() * 20);
      for (const d of [recentGap + 14, recentGap]) {
        if (r() < 0.15) continue;
        const res = (["hard", "ok", "ok", "easy"] as const)[Math.floor(r() * 4)];
        const sr = { id: id("sr"), uid: p.uid, missionId: p.missionId, enteredBy: p.uid, origin: "simulated" as const, createdAt: iso(atDay(d, 19)), at: iso(atDay(d, 19)), cardId: cid, result: res };
        put(`users/${p.uid}/skillReviews/${sr.id}`, sr);
      }
    }
  }

  // ---------- Ask the Doctor: store-and-forward questions ----------
  const delay = 8 * 60_000;
  const q1At = atDay(1, 9);
  put(`missions/${DEMO_MISSION_ID}/questions/q-orion-1`, {
    id: "q-orion-1",
    missionId: DEMO_MISSION_ID,
    crewUid: "demo-crew-2",
    crewLabel: "Orion",
    text: "My headache gets worse in the afternoon. Should I change when I drink water? (demo)",
    topic: "symptom",
    priority: "soon",
    attachments: [{ label: "Water (last 3 days)", summary: "Average 1.6 L/day" }],
    createdAt: iso(q1At),
    sendAt: iso(q1At),
    arriveAt: iso(new Date(q1At.getTime() + delay)),
    answer: {
      text: "Thanks Orion. Try spreading water evenly through the morning and log it — we'll review with your vitals tomorrow. (demo)",
      byUid: "demo-medical",
      byName: "Dr. Priya Natarajan",
      at: iso(atDay(1, 11)),
      arriveAt: iso(new Date(atDay(1, 11).getTime() + delay)),
    },
    readAt: null,
    origin: "simulated",
  });
  const q2At = new Date(now.getTime() - 3 * 60_000);
  put(`missions/${DEMO_MISSION_ID}/questions/q-vega-1`, {
    id: "q-vega-1",
    missionId: DEMO_MISSION_ID,
    crewUid: "demo-crew-1",
    crewLabel: "Vega",
    text: "Is it OK to move my resistance session to the evening this week? (demo)",
    topic: "exercise",
    priority: "routine",
    attachments: [],
    createdAt: iso(q2At),
    sendAt: iso(q2At),
    arriveAt: iso(new Date(q2At.getTime() + delay)),
    answer: null,
    readAt: null,
    origin: "simulated",
  });

  await store.setMany(entries);
}
