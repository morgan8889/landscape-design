// e2e/smoke.spec.ts
import { expect, test } from "@playwright/test";

test("homepage loads with address search", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".address-search")).toBeVisible();
  await expect(page.locator(".search-input")).toBeVisible();
});
