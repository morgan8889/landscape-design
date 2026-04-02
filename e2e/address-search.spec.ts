// e2e/address-search.spec.ts
import { expect, test } from "@playwright/test";

test("shows error when address is not found", async ({ page }) => {
  await page.goto("/");
  const hasAddressSearch = await page.locator(".address-search").isVisible();
  test.skip(!hasAddressSearch, "No MAPBOX_TOKEN — address search not rendered");

  // Intercept the Mapbox geocoding request and return empty features
  await page.route("**/api.mapbox.com/geocoding/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ features: [] }),
    });
  });

  await page.fill(".search-input", "zzzznotanaddress");
  await page.click(".search-button");
  await expect(page.locator(".search-error")).toBeVisible({ timeout: 5000 });
});

test("address input is required", async ({ page }) => {
  await page.goto("/");
  const hasAddressSearch = await page.locator(".address-search").isVisible();
  test.skip(!hasAddressSearch, "No MAPBOX_TOKEN — address search not rendered");

  await page.click(".search-button");
  // Form validation prevents submission — search-error should not appear
  await expect(page.locator(".search-error")).toBeHidden();
});
