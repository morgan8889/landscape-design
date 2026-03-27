import { expect, test } from "@playwright/test";

test("@visual address search page matches baseline", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".address-search")).toBeVisible();
  await expect(page).toHaveScreenshot("address-search.png");
});

test("@visual address search error state matches baseline", async ({
  page,
}) => {
  await page.goto("/");
  await page.fill(".search-input", "zzzznotanaddress");
  await page.click(".search-button");
  await expect(page.locator(".search-error")).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveScreenshot("address-search-error.png");
});
