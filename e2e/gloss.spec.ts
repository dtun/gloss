import { expect, test } from "@playwright/test";

test("paste text, generate a gloss, and open the print sheet", async ({ page, context }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Gloss" })).toBeVisible();

  await page
    .getByLabel("Tweet or thread text")
    .fill(
      "Big rewrites almost always fail. Prefer small reversible steps. Keep shipping value the whole time.",
    );

  await page.getByRole("button", { name: "Gloss it" }).click();

  // Preview is summary-first: a TL;DR and key points.
  const preview = page.getByRole("region", { name: "Gloss preview" });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Summary" })).toBeVisible();
  await expect(preview.locator(".tldr")).toContainText("Big rewrites almost always fail.");
  await expect(preview.locator(".point")).not.toHaveCount(0);

  // The print button opens a new tab containing the standalone print sheet.
  const popupPromise = context.waitForEvent("page");
  await preview.getByRole("button", { name: "Print this page" }).click();
  const popup = await popupPromise;
  await expect(popup.locator(".wordmark")).toHaveText("Gloss");
  await expect(popup.locator(".tldr")).not.toHaveCount(0);
  await expect(popup.locator(".points li")).not.toHaveCount(0);
});

test("the URL-only path produces a gloss", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("x.com URL").fill("https://x.com/patio11/status/1");
  await page.getByRole("button", { name: "Gloss it" }).click();

  const preview = page.getByRole("region", { name: "Gloss preview" });
  await expect(preview).toBeVisible();
  // The handle is recovered from the URL and shown as attribution.
  await expect(preview.getByText("@patio11")).toBeVisible();
});

test("submitting nothing is not possible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Gloss it" })).toBeDisabled();
});
