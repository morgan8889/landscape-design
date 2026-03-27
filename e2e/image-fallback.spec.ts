// e2e/image-fallback.spec.ts
import { expect, test } from "@playwright/test";

test("fallback link shows image upload view", async ({ page }) => {
  await page.goto("/");
  await page.click(".fallback-link");
  await expect(page.locator(".image-upload")).toBeVisible();
  await expect(page.locator(".drop-zone")).toBeVisible();
});

test("back button returns to address search", async ({ page }) => {
  await page.goto("/");
  await page.click(".fallback-link");
  await expect(page.locator(".image-upload")).toBeVisible();
  await page.click(".image-upload .btn-secondary");
  await expect(page.locator(".address-search")).toBeVisible();
});
