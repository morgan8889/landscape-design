import { expect, test } from "@playwright/test";

const FIXTURE_DESIGN = {
  id: "test-plant-palette",
  address: "456 Garden Ave, Portland, OR",
  center: { lat: 45.5152, lng: -122.6784 },
  boundary: [
    { lat: 45.5154, lng: -122.6788 },
    { lat: 45.5154, lng: -122.678 },
    { lat: 45.515, lng: -122.678 },
    { lat: 45.515, lng: -122.6788 },
  ],
  areaSqFt: 800,
  perimeterFt: 120,
  usdaZone: "8b",
  createdAt: "2026-03-31T00:00:00Z",
  updatedAt: "2026-03-31T00:00:00Z",
  zones: [
    {
      id: "zone-1",
      category: "garden-bed",
      vertices: [
        { lat: 45.5153, lng: -122.6786 },
        { lat: 45.5153, lng: -122.6782 },
        { lat: 45.5151, lng: -122.6782 },
      ],
      areaSqFt: 320,
    },
  ],
};

test("zone card shows Add Plants button", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await expect(page.locator(".yard-summary")).toBeVisible();
  await expect(page.getByRole("button", { name: /Add Plants/i })).toBeVisible();
});

test("plant browser opens and shows compatible plants", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await page.getByRole("button", { name: /Add Plants/i }).click();

  await expect(page.locator(".plant-browser")).toBeVisible();
  await expect(page.locator(".plant-browser-header h3")).toContainText(
    "Garden Bed",
  );
  await expect(page.locator(".plant-row").first()).toBeVisible();
});

test("can search for a plant", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await page.getByRole("button", { name: /Add Plants/i }).click();
  await page.locator(".plant-search-input").fill("lavender");

  const rows = page.locator(".plant-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.first().locator(".plant-name")).toContainText("Lavender");
});

test("full flow: add a plant and see coverage", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await page.getByRole("button", { name: /Add Plants/i }).click();
  await page.locator(".plant-search-input").fill("lavender");

  await page.locator(".plant-add-btn").click();

  await expect(page.locator(".plant-confirm")).toBeVisible();
  await page.locator(".plant-confirm-btn").click();

  await expect(page.locator(".zone-plant-row")).toBeVisible();
  await expect(page.locator(".zone-plant-qty")).toContainText("×");
  await expect(page.locator(".zone-coverage-percent")).toBeVisible();
});

test("plant assignments persist across reload", async ({ page }) => {
  const designWithPlant = {
    ...FIXTURE_DESIGN,
    zones: [
      {
        ...FIXTURE_DESIGN.zones[0],
        plants: [
          { plantId: "lavender", quantity: 121, calculatedQuantity: 121 },
        ],
      },
    ],
  };

  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, designWithPlant);

  await page.goto("/");
  await expect(page.locator(".zone-plant-row")).toBeVisible();
  await expect(page.locator(".zone-plant-qty")).toContainText("×121");
});
