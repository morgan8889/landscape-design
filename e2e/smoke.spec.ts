// e2e/smoke.spec.ts
import { expect, test } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  // Without MAPBOX_TOKEN the app shows the image-upload view; with it, address-search
  const hasAddressSearch = await page.locator(".address-search").isVisible();
  if (hasAddressSearch) {
    await expect(page.locator(".search-input")).toBeVisible();
  } else {
    await expect(page.locator(".image-upload")).toBeVisible();
  }
});
