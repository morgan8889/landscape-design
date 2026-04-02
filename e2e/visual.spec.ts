import { expect, test } from "@playwright/test";

test("@visual address search page matches baseline", async ({ page }) => {
  await page.goto("/");
  const hasAddressSearch = await page.locator(".address-search").isVisible();
  test.skip(!hasAddressSearch, "No MAPBOX_TOKEN — address search not rendered");

  await expect(page).toHaveScreenshot("address-search.png");
});

test("@visual address search error state matches baseline", async ({
  page,
}) => {
  await page.goto("/");
  const hasAddressSearch = await page.locator(".address-search").isVisible();
  test.skip(!hasAddressSearch, "No MAPBOX_TOKEN — address search not rendered");

  // Mock Mapbox API to return no results immediately
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
  await expect(page).toHaveScreenshot("address-search-error.png");
});
