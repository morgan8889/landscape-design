import { expect, test } from "@playwright/test";

const FIXTURE_DESIGN = {
  id: "test-shopping",
  address: "456 Elm Ave",
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
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
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
    {
      id: "zone-2",
      category: "garden-bed",
      vertices: [
        { lat: 45.5152, lng: -122.6785 },
        { lat: 45.5152, lng: -122.6781 },
        { lat: 45.515, lng: -122.6781 },
      ],
      areaSqFt: 150,
      plants: [{ plantId: "lavender", quantity: 5, calculatedQuantity: 5 }],
    },
  ],
};

const FIXTURE_NO_PLANTS = {
  ...FIXTURE_DESIGN,
  id: "test-shopping-empty",
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
      plants: [],
    },
  ],
};

test.describe("Shopping List", () => {
  test("Shopping List button visible when plants are assigned", async ({
    page,
  }) => {
    await page.addInitScript((design) => {
      localStorage.setItem("yard-design", JSON.stringify(design));
    }, FIXTURE_DESIGN);
    await page.goto("/");
    await expect(page.locator(".shopping-list-btn")).toBeVisible();
  });

  test("Shopping List button hidden when no plants", async ({ page }) => {
    await page.addInitScript((design) => {
      localStorage.setItem("yard-design", JSON.stringify(design));
    }, FIXTURE_NO_PLANTS);
    await page.goto("/");
    await expect(page.locator(".shopping-list-btn")).toHaveCount(0);
  });

  test("navigates to shopping list and shows grouped plants", async ({
    page,
  }) => {
    await page.addInitScript((design) => {
      localStorage.setItem("yard-design", JSON.stringify(design));
    }, FIXTURE_DESIGN);
    await page.goto("/");
    await page.locator(".shopping-list-btn").click();

    await expect(page.locator("h2")).toContainText("Shopping List");
    // Category headers (Perennials for lavender, Shrubs for boxwood)
    await expect(page.locator(".shopping-category-title")).toHaveCount(2);
    // Plant names
    await expect(page.locator(".shopping-item-name").first()).toBeVisible();
    await expect(page.locator(".shopping-item")).toHaveCount(2);
  });

  test("shows correct aggregated quantities and costs", async ({ page }) => {
    await page.addInitScript((design) => {
      localStorage.setItem("yard-design", JSON.stringify(design));
    }, FIXTURE_DESIGN);
    await page.goto("/");
    await page.locator(".shopping-list-btn").click();

    // Lavender: 12+5=17 total, at $8.00 = $136.00
    const lavenderItem = page.locator(".shopping-item", {
      has: page.locator(".shopping-item-name", { hasText: "Lavender" }),
    });
    await expect(lavenderItem.locator(".shopping-item-qty")).toContainText(
      "x17",
    );
    await expect(
      lavenderItem.locator(".shopping-item-line-total"),
    ).toContainText("$136.00");

    // Boxwood: 3 total, at $25.00 = $75.00
    const boxwoodItem = page.locator(".shopping-item", {
      has: page.locator(".shopping-item-name", { hasText: "Boxwood" }),
    });
    await expect(boxwoodItem.locator(".shopping-item-qty")).toContainText("x3");
    await expect(
      boxwoodItem.locator(".shopping-item-line-total"),
    ).toContainText("$75.00");

    // Grand total: $211.00
    await expect(page.locator(".shopping-total-amount")).toContainText(
      "$211.00",
    );
  });

  test("back button returns to summary", async ({ page }) => {
    await page.addInitScript((design) => {
      localStorage.setItem("yard-design", JSON.stringify(design));
    }, FIXTURE_DESIGN);
    await page.goto("/");
    await page.locator(".shopping-list-btn").click();
    await expect(page.locator("h2")).toContainText("Shopping List");

    await page.getByText("Back to Summary").click();
    await expect(page.locator(".yard-summary")).toBeVisible();
    await expect(page.locator("h2")).toContainText("456 Elm Ave");
  });

  test("copy button changes text to Copied", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript((design) => {
      localStorage.setItem("yard-design", JSON.stringify(design));
    }, FIXTURE_DESIGN);
    await page.goto("/");
    await page.locator(".shopping-list-btn").click();

    const copyBtn = page.getByText("Copy to Clipboard");
    await copyBtn.click();
    await expect(copyBtn).toContainText("Copied!");
  });
});
