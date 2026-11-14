import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// Integration tests against the real repository layer using the local file-backed store.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "antariksha-test-"));
process.env.LOCAL_DATA_FILE = path.join(dir, "db.json");
process.env.DEMO_MODE = "false"; // seed explicitly below

let repo: typeof import("@/lib/data/repo");

beforeAll(async () => {
  const { getLocalStore } = await import("@/lib/data/local-store");
  const { seedDemoData } = await import("@/lib/data/seed");
  await seedDemoData(getLocalStore(), new Date());
  repo = await import("@/lib/data/repo");
});

describe("repository (local store)", () => {
  it("seeds clearly-synthetic demo data", async () => {
    const users = await repo.listUsers();
    expect(users.length).toBeGreaterThanOrEqual(9);
    expect(users.every((u) => u.isDemo)).toBe(true);
    const vitals = await repo.listPersonal("demo-crew-1", "vitals", { sinceDays: 30 });
    expect(vitals.length).toBeGreaterThan(100);
    expect(vitals.every((v) => v.origin === "simulated")).toBe(true);
    const env = await repo.listMissionDocs("demo-ant-01", "environmentReadings");
    expect(env.every((e) => e.origin === "simulated")).toBe(true);
  });

  it("seeding produces explainable alerts from the rule engine", async () => {
    const alerts = await repo.listMissionDocs("demo-ant-01", "alerts");
    const rules = new Set(alerts.map((a) => a.ruleId));
    expect(rules.has("sleep-deficit")).toBe(true);
    expect(rules.has("missed-check-in")).toBe(true);
    expect(alerts.every((a) => a.reason && a.source && a.recommendedAction)).toBe(true);
  });

  it("offline replay with the same clientId never creates a duplicate or overwrites", async () => {
    const data = { uid: "demo-crew-1", missionId: "demo-ant-01", origin: "user" as const, createdAt: new Date().toISOString(), enteredBy: "demo-crew-1", at: new Date().toISOString(), amountMl: 250, clientId: "client-abc-12345" };
    const first = await repo.addPersonal("demo-crew-1", "hydrationLogs", data);
    const second = await repo.addPersonal("demo-crew-1", "hydrationLogs", { ...data, amountMl: 999 });
    expect(second.duplicate).toBe(true);
    expect(second.record.id).toBe(first.record.id);
    const stored = await repo.getPersonal("demo-crew-1", "hydrationLogs", first.record.id);
    expect(stored?.amountMl).toBe(250);
  });

  it("missions are isolated: mission B crew are not in mission A", async () => {
    const a = (await repo.listCrew("demo-ant-01")).map((c) => c.uid);
    const b = (await repo.listCrew("demo-ant-02")).map((c) => c.uid);
    expect(a).not.toContain("demo-crew-b1");
    expect(b).toEqual(["demo-crew-b1"]);
    const { isAssignedMedical } = await import("@/lib/permissions");
    const medicB = (await repo.getUser("demo-medical-b"))!;
    const crewA = (await repo.getUser("demo-crew-1"))!;
    expect(isAssignedMedical(medicB, crewA)).toBe(false);
  });

  it("journal entries exist only for their author", async () => {
    const own = await repo.listPersonal("demo-crew-1", "journal");
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((j) => j.uid === "demo-crew-1")).toBe(true);
  });

  it("settings fall back to illustrative defaults", async () => {
    const s = await repo.getSettings();
    expect(s.thresholds.spo2Below).toBe(92);
    expect(s.privacyMinGroupSize).toBe(3);
  });
});
