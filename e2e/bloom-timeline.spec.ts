import { expect, test } from "@playwright/test";

const FIXTURE_DESIGN_WITH_BLOOMS = {
  id: "test-bloom-design",
  address: "456 Garden Lane",
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
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
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
      plants: [
        { plantId: "lavender", quantity: 5, calculatedQuantity: 5 },
        { plantId: "hydrangea", quantity: 3, calculatedQuantity: 3 },
      ],
    },
  ],
};

const FIXTURE_DESIGN_NO_PLANTS = {
  id: "test-no-plants",
  address: "789 Empty Ave",
  center: { lat: 37.7749, lng: -122.4194 },
  boundary: [
    { lat: 37.7751, lng: -122.4198 },
    { lat: 37.7751, lng: -122.419 },
    { lat: 37.7747, lng: -122.419 },
    { lat: 37.7747, lng: -122.4198 },
  ],
  areaSqFt: 800,
  perimeterFt: 120,
  usdaZone: "9b",
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
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

test("bloom timeline visible when plants with bloom data are assigned", async ({
  page,
}) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN_WITH_BLOOMS);

  await page.goto("/");
  await expect(page.locator(".bloom-timeline")).toBeVisible();
  await expect(page.locator(".bloom-timeline h3")).toHaveText("Bloom Timeline");
});

test("bloom timeline hidden when no plants assigned", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN_NO_PLANTS);

  await page.goto("/");
  await expect(page.locator(".bloom-timeline")).not.toBeVisible();
});

test("gap callout shows months with no coverage", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN_WITH_BLOOMS);

  await page.goto("/");

  const gapCallout = page.locator(".bloom-gap-callout");
  await expect(gapCallout).toBeVisible();
  await expect(gapCallout).toContainText("January");
  await expect(gapCallout).toContainText("February");
  await expect(gapCallout).toContainText("December");
});

test("month cells have correct visual states", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN_WITH_BLOOMS);

  await page.goto("/");

  // Active month cell (June = month 6, both plants bloom)
  const juneCell = page.locator(
    '.bloom-summary-row .bloom-cell[data-month="6"]',
  );
  await expect(juneCell).toHaveClass(/bloom-cell-active/);

  // Gap month cell (January = month 1)
  const janCell = page.locator(
    '.bloom-summary-row .bloom-cell[data-month="1"]',
  );
  await expect(janCell).toHaveClass(/bloom-cell-gap/);
});

test("show/hide toggle reveals plant detail rows", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN_WITH_BLOOMS);

  await page.goto("/");

  const toggle = page.locator(".bloom-toggle");
  await expect(toggle).toContainText("Show");

  await toggle.click();
  await expect(page.locator(".bloom-plant-rows")).toBeVisible();
  await expect(toggle).toContainText("Hide");

  await toggle.click();
  await expect(page.locator(".bloom-plant-rows")).not.toBeVisible();
});
