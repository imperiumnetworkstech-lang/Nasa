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

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL(/\/login/);
  await page.goto("/app/crew/dashboard");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/app\/crew\/dashboard/);
});

test("roles route to the correct dashboards and are blocked elsewhere", async ({ page }) => {
  await enterDemo(page, "Base-station doctor");
  await expect(page).toHaveURL(/\/app\/medical\/dashboard/);
  await page.goto("/app/crew/dashboard");
  await expect(page.getByText("This area is not available for your role")).toBeVisible();

  await page.context().clearCookies();
  await enterDemo(page, "Mission commander");
  await expect(page).toHaveURL(/\/app\/mission\/dashboard/);
  await page.goto("/app/medical/crew/demo-crew-1");
  await expect(page.getByText("This area is not available for your role")).toBeVisible();
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
  await enterDemo(page, "Base-station doctor");
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



test("notification bell shows a red count and clears once opened", async ({ page }) => {
  await enterDemo(page, "Crew member");
  const bell = page.getByRole("button", { name: /Notifications, \d+ new/ });
  await expect(bell).toBeVisible();
  await bell.click();
  await page.waitForURL(/\/app\/notifications/);
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
});

test("every role has a short main menu", async ({ page }) => {
  for (const role of ["Crew member", "Base-station doctor", "Mission commander"]) {
    await page.context().clearCookies();
    await enterDemo(page, role);
    await page.setViewportSize({ width: 1280, height: 800 });
    const visible = page.locator("aside nav[aria-label='Main'] > ul a");
    expect(await visible.count(), role).toBeLessThanOrEqual(5);
  }
});
