import { describe, expect, it } from "vitest";
import {
  canAccessSection,
  canAdminister,
  canAssignRole,
  canExportHandover,
  canReadPersonal,
  canViewCommanderSummary,
  canViewResearchAggregates,
  canWritePersonal,
  filterMoodForViewer,
  privateAggregate,
  type Actor,
  type Subject,
} from "@/lib/permissions";
import type { MoodLog } from "@/lib/types";

const astroA: Actor = { uid: "a", role: "astronaut", missionId: "m1", status: "active" };
const astroB: Subject = { uid: "b", role: "astronaut", missionId: "m1" };
const astroASubject: Subject = { uid: "a", role: "astronaut", missionId: "m1" };
const medic: Actor = { uid: "doc", role: "medical", missionId: "m1", status: "active" };
const otherMedic: Actor = { uid: "doc2", role: "medical", missionId: "m2", status: "active" };
const unassignedMedic: Actor = { uid: "doc3", role: "medical", missionId: null, status: "active" };
const commander: Actor = { uid: "cmd", role: "commander", missionId: "m1", status: "active" };
const researcher: Actor = { uid: "res", role: "researcher", missionId: "m1", status: "active" };
const admin: Actor = { uid: "adm", role: "admin", missionId: "m1", status: "active" };

describe("personal record access", () => {
  it("lets a crew member read and write their own records", () => {
    expect(canReadPersonal(astroA, astroASubject, "checkIns")).toBe(true);
    expect(canReadPersonal(astroA, astroASubject, "journal")).toBe(true);
    expect(canWritePersonal(astroA, astroASubject, "vitals")).toBe(true);
  });

  it("Astronaut A cannot read Astronaut B's records", () => {
    for (const k of ["checkIns", "vitals", "journal", "symptomReports", "moodLogs"] as const) {
      expect(canReadPersonal(astroA, astroB, k)).toBe(false);
      expect(canWritePersonal(astroA, astroB, k)).toBe(false);
    }
  });

  it("assigned medical officer can read crew records on their mission", () => {
    expect(canReadPersonal(medic, astroB, "vitals")).toBe(true);
    expect(canReadPersonal(medic, astroB, "symptomReports")).toBe(true);
    expect(canWritePersonal(medic, astroB, "clinicalNotes")).toBe(true);
  });

  it("medical officer cannot silently edit crew-submitted records", () => {
    expect(canWritePersonal(medic, astroB, "checkIns")).toBe(false);
    expect(canWritePersonal(medic, astroB, "symptomReports")).toBe(false);
  });

  it("nobody but the author can read a private journal", () => {
    for (const actor of [medic, commander, researcher, admin]) expect(canReadPersonal(actor, astroB, "journal")).toBe(false);
  });

  it("commander cannot open personal health records or journals", () => {
    for (const k of ["checkIns", "vitals", "moodLogs", "journal", "symptomReports"] as const) expect(canReadPersonal(commander, astroB, k)).toBe(false);
  });

  it("researcher cannot read identifiable crew health records", () => {
    for (const k of ["checkIns", "vitals", "sleepLogs", "symptomReports"] as const) expect(canReadPersonal(researcher, astroB, k)).toBe(false);
  });

  it("unassigned or other-mission medical officer cannot access the crew", () => {
    expect(canReadPersonal(otherMedic, astroB, "vitals")).toBe(false);
    expect(canReadPersonal(unassignedMedic, astroB, "vitals")).toBe(false);
    expect(canExportHandover(otherMedic, astroB)).toBe(false);
  });

  it("suspended users lose all access, even to their own data", () => {
    const suspended: Actor = { ...astroA, status: "suspended" };
    expect(canReadPersonal(suspended, astroASubject, "checkIns")).toBe(false);
    expect(canAccessSection(suspended, "crew")).toBe(false);
  });

  it("medical sees only mood entries the crew member chose to share", () => {
    const logs = [
      { id: "1", shareWithMedical: true },
      { id: "2", shareWithMedical: false },
    ] as MoodLog[];
    expect(filterMoodForViewer(medic, astroB, logs).map((l) => l.id)).toEqual(["1"]);
    expect(filterMoodForViewer(commander, astroB, logs)).toEqual([]);
    expect(filterMoodForViewer(astroA, astroASubject, logs)).toHaveLength(2);
  });
});

describe("roles and sections", () => {
  it("users cannot assign themselves roles; only admins can assign others", () => {
    expect(canAssignRole(astroA, "a")).toBe(false);
    expect(canAssignRole(astroA, "b")).toBe(false);
    expect(canAssignRole(medic, "a")).toBe(false);
    expect(canAssignRole(admin, "adm")).toBe(false);
    expect(canAssignRole(admin, "a")).toBe(true);
  });

  it("section access follows role", () => {
    expect(canAccessSection(astroA, "crew")).toBe(true);
    expect(canAccessSection(astroA, "medical")).toBe(false);
    expect(canAccessSection(commander, "medical")).toBe(false);
    expect(canAccessSection(researcher, "admin")).toBe(false);
    expect(canAdminister(medic)).toBe(false);
  });

  it("commander summary is limited to their own mission", () => {
    expect(canViewCommanderSummary(commander, "m1")).toBe(true);
    expect(canViewCommanderSummary(commander, "m2")).toBe(false);
    expect(canViewCommanderSummary(medic, "m1")).toBe(false);
  });

  it("research aggregates are not available to commanders or crew", () => {
    expect(canViewResearchAggregates(researcher)).toBe(true);
    expect(canViewResearchAggregates(commander)).toBe(false);
    expect(canViewResearchAggregates(astroA)).toBe(false);
  });
});

describe("privacy-preserving aggregates", () => {
  it("suppresses aggregates for groups smaller than the threshold", () => {
    expect(privateAggregate([7, 6], 3)).toEqual({ value: null, n: 2, suppressed: true });
    const r = privateAggregate([6, 7, 8], 3);
    expect(r.suppressed).toBe(false);
    expect(r.value).toBe(7);
  });
});
