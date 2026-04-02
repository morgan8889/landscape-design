import { expect, test } from "@playwright/test";

const FIXTURE_DESIGN = {
  id: "test-cost",
  address: "123 Test St",
  center: { lat: 45.5152, lng: -122.6784 },
  boundary: [
    { lat: 45.5154, lng: -122.6788 },
    { lat: 45.5154, lng: -122.678 },
    { lat: 45.515, lng: -122.678 },
    { lat: 45.515, lng: -122.6788 },
  ],
  areaSqFt: 1000,
  perimeterFt: 130,
  usdaZone: "7a",
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
      areaSqFt: 200,
      plants: [
        { plantId: "lavender", quantity: 12, calculatedQuantity: 12 },
        { plantId: "boxwood", quantity: 3, calculatedQuantity: 3 },
      ],
    },
  ],
};

test.describe("Cost Estimation", () => {
  test("shows plant costs in zone detail", async ({ page }) => {
    await page.addInitScript((design) => {
      localStorage.setItem("yard-design", JSON.stringify(design));
    }, FIXTURE_DESIGN);
    await page.goto("/");
    // Lavender: 12 x $8.00 = $96.00
    await expect(page.locator(".zone-plant-cost").first()).toContainText(
      "$96.00",
    );
    // Boxwood: 3 x $25.00 = $75.00
    await expect(page.locator(".zone-plant-cost").nth(1)).toContainText(
      "$75.00",
    );
  });

  test("shows zone cost subtotal", async ({ page }) => {
    await page.addInitScript((design) => {
      localStorage.setItem("yard-design", JSON.stringify(design));
    }, FIXTURE_DESIGN);
    await page.goto("/");
    // $96 + $75 = $171.00
    await expect(page.locator(".zone-cost-subtotal")).toContainText("$171.00");
  });

  test("shows project cost in summary", async ({ page }) => {
    await page.addInitScript((design) => {
      localStorage.setItem("yard-design", JSON.stringify(design));
    }, FIXTURE_DESIGN);
    await page.goto("/");
    await expect(page.locator(".summary-card").last()).toContainText("$171.00");
  });

  test("persists cost override after reload", async ({ page }) => {
    const designWithOverride = {
      ...FIXTURE_DESIGN,
      zones: [
        {
          ...FIXTURE_DESIGN.zones[0],
          plants: [
            {
              plantId: "lavender",
              quantity: 12,
              calculatedQuantity: 12,
              costPerUnit: 10.0,
            },
            { plantId: "boxwood", quantity: 3, calculatedQuantity: 3 },
          ],
        },
      ],
    };

    await page.addInitScript((design) => {
      localStorage.setItem("yard-design", JSON.stringify(design));
    }, designWithOverride);
    await page.goto("/");
    // Lavender: 12 x $10.00 = $120.00 (override)
    await expect(page.locator(".zone-plant-cost").first()).toContainText(
      "$120.00",
    );
    // Total: $120 + $75 = $195.00
    await expect(page.locator(".zone-cost-subtotal")).toContainText("$195.00");
  });
});
