import { expect, test, type Page } from "@playwright/test";

async function enterDemo(page: Page, role: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(role, "i") }).click();
  await page.waitForURL(/\/app\//);
}

test("protected pages redirect unauthenticated users to login", async ({ page }) => {
  await page.goto("/app/crew/dashboard");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("a new user can register, log out and log back in", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Display name").fill("Test Crew");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/app\/crew\/dashboard/);
  await expect(page.getByRole("heading", { name: /Hello, Test!/ })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/login/);
  await page.goto("/app/crew/dashboard");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/app\/crew\/dashboard/);
});

test("roles route to the correct dashboards and are blocked elsewhere", async ({ page }) => {
  await enterDemo(page, "Flight surgeon");
  await expect(page).toHaveURL(/\/app\/medical\/dashboard/);
  await page.goto("/app/crew/dashboard");
  await expect(page.getByText("This area is not available for your role")).toBeVisible();

  await page.context().clearCookies();
  await enterDemo(page, "Mission commander");
  await expect(page).toHaveURL(/\/app\/mission\/dashboard/);
  await page.goto("/app/medical/crew/demo-crew-1");
  await expect(page.getByText("This area is not available for your role")).toBeVisible();
});

test("astronaut submits a daily check-in and sees it", async ({ page }) => {
  await enterDemo(page, "Crew member");
  await page.goto("/app/crew/check-in");
  for (const legend of ["Overall, how do you feel?", "Fatigue", "Stress", "Pain or discomfort"]) {
    await page.getByRole("group", { name: legend }).getByText("2", { exact: true }).click();
  }
  await page.getByRole("button", { name: "Save check-in" }).click();
  await expect(page.getByText("Check-in saved. Thank you!")).toBeVisible();
});

test("astronaut navigation hides research and data tooling", async ({ page }) => {
  await enterDemo(page, "Crew member");
  await expect(page.getByRole("link", { name: /datasets/i })).toHaveCount(0);
  await page.goto("/app/research/datasets");
  await expect(page.getByText("This area is not available for your role")).toBeVisible();
});

test("offline entries are visibly queued, not falsely delivered", async ({ page, context }) => {
  await enterDemo(page, "Crew member");
  await page.goto("/app/crew/hydration");
  await context.setOffline(true);
  await page.getByRole("button", { name: /\+250 ml/ }).click();
  await expect(page.getByText(/Queued — not sent/).first()).toBeVisible();
  await context.setOffline(false);
});

test("medical officer responds to an alert in one tap, with undo and audit trail", async ({ page }) => {
  await enterDemo(page, "Flight surgeon");
  await page.goto("/app/medical/alerts?status=open");
  const first = page.locator("section[id^='al_']").first();
  await expect(first).toBeVisible();
  const id = await first.getAttribute("id");
  await first.getByRole("button", { name: "Note" }).click();
  await first.getByPlaceholder(/Optional note/).fill("Reviewed in e2e");
  await first.getByRole("button", { name: "Acknowledge" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Acknowledged" }).first()).toBeVisible();
  // Undo from the toast puts it back to open.
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Undone" }).first()).toBeVisible();
  await page.goto("/app/medical/alerts?status=open");
  await expect(page.locator(`#${id}`)).toBeVisible();
  await page.goto("/app/medical/audit-log");
  await expect(page.getByText("alert.acknowledge").first()).toBeVisible();
  await expect(page.getByText("alert.reopen").first()).toBeVisible();
});

test("admin creates an invite code in a couple of taps", async ({ page }) => {
  await enterDemo(page, "Administrator");
  await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
  await page.getByRole("button", { name: "Create invite code" }).click();
  await expect(page.getByText(/Share this code: AST-/).first()).toBeVisible();
});

test("researcher can search NASA OSDR (live or labelled fallback)", async ({ page }) => {
  await enterDemo(page, "Researcher");
  await page.goto("/app/research/datasets?q=heart");
  await expect(page.getByText(/studies/).first()).toBeVisible();
  await expect(page.getByText(/Source:/).first()).toBeVisible();
});
