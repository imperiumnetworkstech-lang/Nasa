import { expect, test } from "@playwright/test";

/**
 * The judge demo: scenario console → model → crew pop-up, doctor case (editable), commander board.
 * Then the "All normal" scenario shows the astronaut as normal everywhere.
 */
test("scenario flows to crew, doctor and commander, then back to normal", async ({ browser }) => {
  test.setTimeout(120_000);
  // Three separate sign-ins, like three browser windows.
  const crewCtx = await browser.newContext();
  const docCtx = await browser.newContext();
  const cmdCtx = await browser.newContext();
  const consoleCtx = await browser.newContext();
  const sign = async (ctx: typeof crewCtx, role: string) => {
    const p = await ctx.newPage();
    await p.goto("/login");
    await p.getByRole("button", { name: new RegExp(role, "i") }).click();
    await p.waitForURL(/\/app\//);
    return p;
  };
  const crew = await sign(crewCtx, "Crew member"); // Vega
  const doc = await sign(docCtx, "Base-station doctor");
  const cmd = await sign(cmdCtx, "Mission commander");

  // 1. Console: Vega + "Low heart rate".
  const con = await consoleCtx.newPage();
  await con.goto("/console");
  await con.getByRole("radio", { name: /Anaya Rao/ }).click();
  await con.getByRole("button", { name: /Low heart rate/ }).click();
  const dialog = con.getByRole("dialog", { name: "Scenario result" });
  await expect(dialog.getByRole("heading", { name: "Low heart rate" })).toBeVisible();
  await expect(dialog.getByText(/% below/).first()).toBeVisible();
  await expect(dialog.getByText("What the model thinks")).toBeVisible();

  // 2. Crew gets a pop-up with precautions.
  await expect(crew.getByRole("alertdialog")).toBeVisible({ timeout: 15_000 });
  await expect(crew.getByRole("alertdialog").getByText("Do this now")).toBeVisible();
  await crew.getByRole("button", { name: "I understand" }).click();

  // 3. Doctor portal raises the emergency pop-up on its own (live sync), then sees the case.
  const docAlert = doc.getByRole("alertdialog");
  await expect(docAlert).toBeVisible({ timeout: 15_000 });
  await expect(docAlert.getByText(/Anaya Rao/).first()).toBeVisible();
  await docAlert.getByRole("button", { name: /Acknowledge/ }).click();
  const card = doc.locator("article").filter({ hasText: "Anaya Rao" }).filter({ hasText: "Low heart rate" }).first();
  await expect(card).toBeVisible();
  await expect(card.getByText(/Atropine sulfate injection/)).toBeVisible();
  await expect(card.getByText(/Recommended by the health model/)).toBeVisible();
  await card.getByText("+ Add medicine or advice").click();
  await card.getByLabel(/Extra medicine/).fill("Electrolyte drink — 1 pouch now");
  await card.getByRole("button", { name: "Add & send to crew" }).click();
  await expect(doc.getByRole("status").filter({ hasText: "crew and commander notified" }).first()).toBeVisible();

  // 4. Commander portal also raised the emergency pop-up; it sees the case and the doctor's addition.
  const cmdAlert = cmd.getByRole("alertdialog");
  await expect(cmdAlert).toBeVisible({ timeout: 15_000 });
  await cmdAlert.getByRole("button", { name: /Acknowledge/ }).click();
  await cmd.reload();
  const cmdCard = cmd.locator("article").filter({ hasText: "Anaya Rao" }).first();
  await expect(cmdCard.getByText("Low heart rate", { exact: true }).first()).toBeVisible();
  await expect(cmdCard.getByText("Electrolyte drink")).toBeVisible();
  await expect(cmdCard.getByText(/Added by Dr\. Priya Natarajan/)).toBeVisible();

  // 5. All normal → commander shows Vega as normal and the case is closed.
  await con.getByRole("button", { name: "Close" }).click();
  await con.getByRole("button", { name: /All normal/ }).click();
  await expect(con.getByRole("dialog").getByText(/is normal/)).toBeVisible();
  await cmd.reload();
  await expect(cmd.locator("article").filter({ hasText: "Anaya Rao" })).toHaveCount(0);
  await expect(cmd.getByText("Normal").first()).toBeVisible();

  for (const c of [crewCtx, docCtx, cmdCtx, consoleCtx]) await c.close();
});

test("crew can run a suit scenario from their own dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Crew member/i }).click();
  await page.waitForURL(/\/app\/crew/);
  // Dismiss any pop-up left from an earlier test.
  const pop = page.getByRole("button", { name: "I understand" });
  if (await pop.isVisible().catch(() => false)) await pop.click();
  await expect(page.getByRole("heading", { name: "Suit check" })).toBeVisible();
  await page.getByRole("button", { name: /Sweat level issue/ }).click();
  const d = page.getByRole("dialog", { name: "Scenario result" });
  await expect(d.getByRole("heading", { name: /Heavy sweating/ })).toBeVisible();
  await expect(d.getByText(/Oral Rehydration Salts \(WHO-ORS sachet\)/)).toBeVisible();
  await expect(d.getByText(/Recommended by the health model/)).toBeVisible();
});
