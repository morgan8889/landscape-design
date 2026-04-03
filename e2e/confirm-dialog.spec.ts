// e2e/confirm-dialog.spec.ts
import { expect, test } from "@playwright/test";

const FIXTURE_DESIGN = {
  id: "test-confirm-dialog",
  address: "789 New Design Blvd, Austin, TX",
  center: { lat: 30.2672, lng: -97.7431 },
  boundary: [
    { lat: 30.2674, lng: -97.7435 },
    { lat: 30.2674, lng: -97.7427 },
    { lat: 30.267, lng: -97.7427 },
    { lat: 30.267, lng: -97.7435 },
  ],
  areaSqFt: 1500,
  perimeterFt: 160,
  usdaZone: "8b",
  createdAt: "2026-04-03T00:00:00Z",
  updatedAt: "2026-04-03T00:00:00Z",
};

test("New Design button is visible in summary view", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await expect(page.locator(".yard-summary")).toBeVisible();
  await expect(page.getByRole("button", { name: /New Design/i })).toBeVisible();
});

test("New Design button opens confirm dialog", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await page.getByRole("button", { name: /New Design/i }).click();
  await expect(page.locator(".confirm-dialog-overlay")).toBeVisible();
  await expect(page.locator(".confirm-dialog-title")).toContainText(
    "Start a new design?",
  );
});

test("Cancel closes dialog and preserves design", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await page.getByRole("button", { name: /New Design/i }).click();
  await page.getByRole("button", { name: /Cancel/i }).click();

  await expect(page.locator(".confirm-dialog-overlay")).not.toBeVisible();
  await expect(page.locator(".yard-summary")).toBeVisible();

  const stored = await page.evaluate(() => localStorage.getItem("yard-design"));
  expect(stored).not.toBeNull();
});

test("Start Over clears design and shows address search", async ({ page }) => {
  // Use evaluate (not addInitScript) so localStorage is NOT re-populated on reload
  await page.goto("/");
  await page.evaluate((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);
  await page.reload();

  await page.getByRole("button", { name: /New Design/i }).click();
  await Promise.all([
    page.waitForNavigation(),
    page.getByRole("button", { name: /^Start Over$/i }).click(),
  ]);

  await expect(page.locator(".yard-summary")).not.toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem("yard-design"));
  expect(stored).toBeNull();
});
