import { expect, test } from "@playwright/test";

/** Every route renders for its role without hitting the error boundary. */
const ROUTES: Record<string, string[]> = {
  "Crew member": [
    "/app/crew/dashboard",
    "/app/crew/check-in",
    "/app/crew/health",
    "/app/crew/health?show=sweat",
    "/app/crew/sleep",
    "/app/crew/hydration",
    "/app/crew/activity",
    "/app/crew/mood",
    "/app/crew/cognitive-readiness",
    "/app/crew/symptoms",
    "/app/crew/medications",
    "/app/crew/my-plan",
    "/app/crew/ask",
    "/app/crew/skills",
    "/app/crew/history",
    "/app/library",
    "/app/notifications",
    "/app/profile",
    "/app/help",
  ],
  "Flight surgeon": [
    "/app/medical/dashboard",
    "/app/medical/crew",
    "/app/medical/crew/demo-crew-2",
    "/app/medical/crew/demo-crew-2?tab=symptoms",
    "/app/medical/crew/demo-crew-2?tab=care",
    "/app/medical/crew/demo-crew-2?tab=notes",
    "/app/medical/crew/demo-crew-2/handover",
    "/app/medical/alerts",
    "/app/medical/care-plans",
    "/app/medical/consultations",
    "/app/medical/mission-timeline",
    "/app/medical/audit-log",
    "/app/medical/questions",
    "/app/medical/skills",
    "/app/knowledge",
    "/app/research",
    "/app/research/insights",
    "/app/research/methodology",
  ],
  "Mission commander": ["/app/mission/dashboard", "/app/mission/crew-readiness", "/app/mission/timeline", "/app/mission/operations"],
  Researcher: ["/app/research", "/app/research/datasets", "/app/research/datasets/OSD-87", "/app/research/insights", "/app/research/methodology"],
  Administrator: ["/app/admin/users", "/app/admin/missions", "/app/admin/roles", "/app/admin/settings"],
};

for (const [role, routes] of Object.entries(ROUTES)) {
  test(`all pages render for ${role}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/login");
    await page.getByRole("button", { name: new RegExp(role, "i") }).click();
    await page.waitForURL(/\/app\//);
    for (const r of routes) {
      const res = await page.goto(r);
      expect(res?.status(), r).toBeLessThan(400);
      await expect(page.getByText("Something went wrong loading this page"), r).toHaveCount(0);
      await expect(page.getByText("This area is not available for your role"), r).toHaveCount(0);
      await expect(page.locator("h1").first(), r).toBeVisible();
    }
  });
}

test("medical officer cannot open crew from another mission (not found, no data)", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Flight surgeon/i }).click();
  await page.waitForURL(/\/app\//);
  await page.goto("/app/medical/crew/demo-crew-b1");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByText("Noor Haddad")).toHaveCount(0);
});

/** Phone-width check: no page may scroll sideways. */
for (const [role, routes] of Object.entries(ROUTES)) {
  test(`no sideways scrolling on phones for ${role}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");
    await page.getByRole("button", { name: new RegExp(role, "i") }).click();
    await page.waitForURL(/\/app\//);
    for (const r of routes) {
      await page.goto(r);
      await expect(page.locator("h1").first(), r).toBeVisible();
      const overflow = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const wide = [...document.querySelectorAll("main *")]
          .filter((el) => {
            const b = el.getBoundingClientRect();
            if (b.right <= vw + 1) return false;
            // Content inside a deliberately scrollable container (e.g. wide tables) is fine.
            for (let p = el.parentElement; p; p = p.parentElement) {
              const ox = getComputedStyle(p).overflowX;
              if (ox === "auto" || ox === "scroll" || ox === "hidden") return false;
            }
            return true;
          })
          .slice(0, 3)
          .map((el) => `${el.tagName}.${String((el as HTMLElement).className).slice(0, 50)}`);
        return { scroll: document.documentElement.scrollWidth - vw, wide };
      });
      expect(overflow, r).toEqual({ scroll: 0, wide: [] });
    }
  });
}
