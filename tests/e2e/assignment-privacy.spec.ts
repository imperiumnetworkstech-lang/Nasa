import { expect, test, type Page } from "@playwright/test";

/**
 * Whatever the doctor assigns to one crew member must be visible ONLY to that crew member.
 * Doctor → Orion (demo-crew-2): a care plan, a medicine and a message.
 * Vega (demo-crew-1) must see none of it; Orion must see the plan and the medicine.
 */
async function enterDemo(page: Page, role: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(role, "i") }).click();
  await page.waitForURL(/\/app\//);
}

const stamp = Date.now().toString(36);
const PLAN = `Orion-only plan ${stamp}`;
const TASK = `Orion-only task ${stamp}`;
const MED = `Orion-only medicine ${stamp}`;
const MSG = `Orion-only message ${stamp}`;

test("doctor's assignments are visible only to the assigned crew member", async ({ page }) => {
  test.setTimeout(120_000);

  // 1. Doctor assigns three things to Orion.
  await enterDemo(page, "Base-station doctor");
  await page.goto("/app/medical/crew/demo-crew-2?tab=care");
  await page.getByLabel("Medication").fill(MED);
  await page.getByLabel("Dose (as prescribed)").fill("Demo dose");
  await page.getByLabel("Schedule").fill("Once daily");
  await page.getByRole("button", { name: "Add medication" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Medication added" }).first()).toBeVisible();

  await page.getByLabel("Plan title").fill(PLAN);
  await page.getByLabel("Tasks (one per line)").fill(TASK);
  await page.getByRole("button", { name: "Create care plan" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Care plan created" }).first()).toBeVisible();

  await page.goto("/app/medical/consultations");
  await page.getByLabel("Message to Orion").fill(MSG);
  await page.locator("form").filter({ has: page.getByLabel("Message to Orion") }).getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Sent/ }).first()).toBeVisible();

  // 2. Vega (another crew member) must not see any of it, anywhere.
  await enterDemo(page, "Crew member");
  for (const path of ["/app/crew/dashboard", "/app/crew/my-plan", "/app/crew/medications", "/app/notifications", "/app/crew/history"]) {
    await page.goto(path);
    await expect(page.locator("h1").first(), path).toBeVisible();
    for (const secret of [PLAN, TASK, MED, MSG]) {
      await expect(page.getByText(secret), `${secret} leaked on ${path}`).toHaveCount(0);
    }
  }
  // …and cannot open Orion's record (crew have no access to medical pages).
  await page.goto("/app/medical/crew/demo-crew-2");
  await expect(page.getByText(PLAN)).toHaveCount(0);

  // 3. Orion sees what was assigned to him, on his own screens.
  await page.context().clearCookies();
  const login = await page.request.post("/api/auth/demo", { data: { uid: "demo-crew-2" } });
  expect(login.ok()).toBe(true);
  await page.goto("/app/crew/my-plan");
  await expect(page.getByText(PLAN)).toBeVisible();
  await expect(page.getByText(TASK)).toBeVisible();
  await page.goto("/app/crew/medications");
  await expect(page.getByText(MED)).toBeVisible();
  await page.goto("/app/notifications");
  await expect(page.getByText(PLAN)).toBeVisible(); // "New care plan" notification went to Orion only

  // 4. Orion's private plan cannot be ticked off by Vega even with a crafted server-action call:
  //    covered by the ownership check in toggleCarePlanTask (plan.crewUid !== caller).
});
