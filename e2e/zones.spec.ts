// e2e/zones.spec.ts
import { expect, test } from "@playwright/test";

const FIXTURE_DESIGN = {
  id: "test-zones-design",
  address: "123 Test Street, San Francisco, CA",
  center: { lat: 37.7749, lng: -122.4194 },
  boundary: [
    { lat: 37.7751, lng: -122.4198 },
    { lat: 37.7751, lng: -122.419 },
    { lat: 37.7747, lng: -122.419 },
    { lat: 37.7747, lng: -122.4198 },
  ],
  areaSqFt: 1200,
  perimeterFt: 140,
  usdaZone: "9b",
  createdAt: "2026-03-27T00:00:00Z",
  updatedAt: "2026-03-27T00:00:00Z",
};

test("summary shows Add Zones button after boundary", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");

  await expect(page.locator(".yard-summary")).toBeVisible();
  await expect(page.getByRole("button", { name: /Add Zones/i })).toBeVisible();
});

test("summary shows Edit Zones button when zones already exist", async ({
  page,
}) => {
  const designWithZone = {
    ...FIXTURE_DESIGN,
    zones: [
      {
        id: "zone-1",
        category: "garden-bed",
        vertices: [
          { lat: 37.775, lng: -122.4196 },
          { lat: 37.775, lng: -122.4193 },
          { lat: 37.7748, lng: -122.4193 },
        ],
        areaSqFt: 200,
      },
    ],
  };

  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, designWithZone);

  await page.goto("/");

  await expect(page.locator(".yard-summary")).toBeVisible();
  await expect(page.getByRole("button", { name: /Edit Zones/i })).toBeVisible();
  await expect(page.locator(".zone-item")).toBeVisible();
});

const DESIGN_WITH_ZONE = {
  id: "test-zones-confirm",
  address: "321 Zone St, Denver, CO",
  center: { lat: 39.7392, lng: -104.9903 },
  boundary: [
    { lat: 39.7394, lng: -104.9907 },
    { lat: 39.7394, lng: -104.9899 },
    { lat: 39.739, lng: -104.9899 },
    { lat: 39.739, lng: -104.9907 },
  ],
  areaSqFt: 1100,
  perimeterFt: 130,
  usdaZone: "5b",
  createdAt: "2026-04-03T00:00:00Z",
  updatedAt: "2026-04-03T00:00:00Z",
  zones: [
    {
      id: "zone-confirm-1",
      category: "garden-bed",
      vertices: [
        { lat: 39.7393, lng: -104.9905 },
        { lat: 39.7393, lng: -104.9901 },
        { lat: 39.7391, lng: -104.9901 },
      ],
      areaSqFt: 200,
    },
  ],
};

test("zone delete button opens confirm dialog", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, DESIGN_WITH_ZONE);

  await page.goto("/");
  await expect(page.locator(".zone-item")).toBeVisible();
  await page.locator(".zone-delete").click();
  await expect(page.locator(".confirm-dialog-overlay")).toBeVisible();
  await expect(page.locator(".confirm-dialog-title")).toContainText(
    "Delete zone?",
  );
});

test("cancel on zone delete dialog preserves zone", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, DESIGN_WITH_ZONE);

  await page.goto("/");
  await page.locator(".zone-delete").click();
  await page.getByRole("button", { name: /Cancel/i }).click();
  await expect(page.locator(".confirm-dialog-overlay")).not.toBeVisible();
  await expect(page.locator(".zone-item")).toBeVisible();
});

test("confirm on zone delete dialog removes the zone", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, DESIGN_WITH_ZONE);

  await page.goto("/");
  await page.locator(".zone-delete").click();
  await page.getByRole("button", { name: /^Delete$/i }).click();
  await expect(page.locator(".confirm-dialog-overlay")).not.toBeVisible();
  await expect(page.locator(".zone-item")).not.toBeVisible();
});
