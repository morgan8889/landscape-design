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
