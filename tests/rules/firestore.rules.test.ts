import fs from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

/**
 * Firestore security-rule tests (cross-user and cross-role access).
 * Requires the Firestore emulator — see README → "Security rule tests".
 */
let env: RulesTestEnvironment;

const user = (uid: string, role: string, missionId: string | null) => ({ uid, role, missionId, status: "active", displayName: uid, email: `${uid}@x.test` });

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "antariksha-rules-test",
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
  });
});
afterAll(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const u of [user("astroA", "astronaut", "m1"), user("astroB", "astronaut", "m1"), user("doc", "medical", "m1"), user("docB", "medical", "m2"), user("cmd", "commander", "m1"), user("res", "researcher", "m1"), user("adm", "admin", "m1")]) {
      await setDoc(doc(db, "users", u.uid), u);
    }
    await setDoc(doc(db, "users/astroB/checkIns/c1"), { uid: "astroB", stress: 2 });
    await setDoc(doc(db, "users/astroB/journal/j1"), { uid: "astroB", text: "private" });
    await setDoc(doc(db, "users/astroB/moodLogs/shared"), { uid: "astroB", shareWithMedical: true });
    await setDoc(doc(db, "users/astroB/moodLogs/private"), { uid: "astroB", shareWithMedical: false });
    await setDoc(doc(db, "missions/m1/alerts/a1"), { crewUid: "astroB" });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();

describe("firestore rules", () => {
  it("Astronaut A cannot read Astronaut B's records", async () => {
    await assertFails(getDoc(doc(as("astroA"), "users/astroB/checkIns/c1")));
    await assertFails(getDoc(doc(as("astroA"), "users/astroB")));
  });

  it("a crew member can read their own records", async () => {
    await assertSucceeds(getDoc(doc(as("astroB"), "users/astroB/checkIns/c1")));
    await assertSucceeds(getDoc(doc(as("astroB"), "users/astroB/journal/j1")));
  });

  it("commander cannot open private journal entries or health records", async () => {
    await assertFails(getDoc(doc(as("cmd"), "users/astroB/journal/j1")));
    await assertFails(getDoc(doc(as("cmd"), "users/astroB/checkIns/c1")));
    await assertFails(getDoc(doc(as("cmd"), "missions/m1/alerts/a1")));
  });

  it("even the assigned medical officer cannot read the journal or unshared mood", async () => {
    await assertFails(getDoc(doc(as("doc"), "users/astroB/journal/j1")));
    await assertFails(getDoc(doc(as("doc"), "users/astroB/moodLogs/private")));
    await assertSucceeds(getDoc(doc(as("doc"), "users/astroB/moodLogs/shared")));
    await assertSucceeds(getDoc(doc(as("doc"), "users/astroB/checkIns/c1")));
  });

  it("researcher cannot read identifiable crew health records", async () => {
    await assertFails(getDoc(doc(as("res"), "users/astroB/checkIns/c1")));
  });

  it("medical officer on another mission cannot access the crew", async () => {
    await assertFails(getDoc(doc(as("docB"), "users/astroB/checkIns/c1")));
    await assertFails(getDoc(doc(as("docB"), "missions/m1/alerts/a1")));
  });

  it("users cannot assign themselves medical/admin roles or change mission", async () => {
    await assertFails(updateDoc(doc(as("astroA"), "users/astroA"), { role: "admin" }));
    await assertFails(updateDoc(doc(as("astroA"), "users/astroA"), { role: "medical" }));
    await assertFails(updateDoc(doc(as("astroA"), "users/astroA"), { missionId: "m2" }));
    await assertSucceeds(updateDoc(doc(as("astroA"), "users/astroA"), { displayName: "Anaya" }));
  });

  it("submitted records cannot be silently edited (append-only)", async () => {
    await assertFails(updateDoc(doc(as("astroB"), "users/astroB/checkIns/c1"), { stress: 5 }));
    await assertFails(updateDoc(doc(as("doc"), "users/astroB/checkIns/c1"), { stress: 5 }));
  });

  it("unauthenticated users are denied everything", async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "users/astroB")));
  });
});
