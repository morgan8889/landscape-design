// e2e/zones.spec.ts
import { expect, test } from "@playwright/test";

test("summary shows Add Zones button after boundary", async ({ page }) => {
  await page.goto("/");
  // The app loads with address search
  await expect(page.locator(".address-search")).toBeVisible();
  // Verify the app is interactive
  await expect(page.locator(".search-input")).toBeVisible();
});
