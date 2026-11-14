import { expect, test, type Page } from "@playwright/test";

async function enterDemo(page: Page, role: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(role, "i") }).click();
  await page.waitForURL(/\/app\//);
}

test("Ask the doctor: crew sends a question and sees its live journey", async ({ page }) => {
  await enterDemo(page, "Crew member");
  await page.goto("/app/crew/ask");
  await page.getByRole("radio", { name: /Sleep/ }).click();
  await page.getByLabel("Your question").fill("I wake up twice a night lately — anything I should try?");
  await page.getByRole("button", { name: /Sleep \(last 3 nights\)/ }).click();
  await page.getByRole("button", { name: "Send to my doctor" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Question sent" }).first()).toBeVisible();
  const card = page.locator("article").filter({ hasText: "I wake up twice a night" });
  await expect(card).toBeVisible();
  await expect(card.getByText(/Travelling to Earth|With your doctor/)).toBeVisible();
  await expect(card.getByText(/Sleep \(last 3 nights\)/)).toBeVisible();
});

test("Ask the doctor: medical officer cannot read a question that is still travelling", async ({ page }) => {
  await enterDemo(page, "Base-station doctor");
  await page.goto("/app/medical/questions");
  // The demo question from Vega was sent 3 minutes ago with an 8-minute delay.
  const vega = page.locator("section").filter({ hasText: "Vega" }).first();
  await expect(vega.getByText(/Still travelling/)).toBeVisible();
  await expect(vega.getByRole("button", { name: "Send answer" })).toHaveCount(0);
});

test("Menu Fatigue Radar: rate a meal in three taps and see the radar", async ({ page }) => {
  await enterDemo(page, "Crew member");
  await page.goto("/app/crew/hydration");
  await expect(page.getByRole("heading", { name: "Taste radar" })).toBeVisible();
  await expect(page.getByText(/Maybe take a break from/)).toBeVisible();
  await page.getByRole("button", { name: /Show all/ }).click();
  await page.getByRole("button", { name: /Lentil dal/ }).first().click();
  await page.getByRole("button", { name: /Loved it/ }).click();
  await page.getByRole("button", { name: "Save rating" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Lentil dal rated" }).first()).toBeVisible();
});

test("Exercise Balance shows targets and catch-up slots", async ({ page }) => {
  await enterDemo(page, "Crew member");
  await page.goto("/app/crew/activity");
  await expect(page.getByText("Exercise balance")).toBeVisible();
  await expect(page.getByText(/Strength/).first()).toBeVisible();
  await expect(page.getByText(/min to go|On track/).first()).toBeVisible();
});

test("Skill Keeper: practise a card and the team grid shows freshness", async ({ page }) => {
  await enterDemo(page, "Crew member");
  await page.goto("/app/crew/skills");
  const show = page.getByRole("button", { name: "Show answer" });
  if (await show.count()) {
    await show.click();
    await page.getByRole("button", { name: "Easy" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Practice saved" }).first()).toBeVisible();
  }
  await page.context().clearCookies();
  await enterDemo(page, "Base-station doctor");
  await page.goto("/app/medical/skills");
  await expect(page.getByText("Team freshness")).toBeVisible();
  await expect(page.getByText(/\d+%/).first()).toBeVisible();
});
