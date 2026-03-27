// e2e/address-search.spec.ts
import { expect, test } from "@playwright/test";

test("shows error when address is not found", async ({ page }) => {
  await page.goto("/");
  await page.fill(".search-input", "zzzznotanaddress");
  await page.click(".search-button");
  await expect(page.locator(".search-error")).toBeVisible({ timeout: 10000 });
});

test("address input is required", async ({ page }) => {
  await page.goto("/");
  await page.click(".search-button");
  // Form validation prevents submission — search-error should not appear
  await expect(page.locator(".search-error")).toBeHidden();
});
