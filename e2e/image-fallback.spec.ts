// e2e/image-fallback.spec.ts
import { expect, test } from "@playwright/test";

// Minimal 10x10 white PNG (valid image that loads with naturalWidth/naturalHeight)
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";

function tinyPngBuffer(): Buffer {
  return Buffer.from(TINY_PNG_BASE64, "base64");
}

/** Navigate to the image upload view regardless of whether MAPBOX_TOKEN is set. */
async function goToImageUpload(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto("/");
  // In no-token mode, app loads directly on image-upload view
  const hasAddressSearch = await page
    .locator(".address-search")
    .isVisible()
    .catch(() => false);
  if (hasAddressSearch) {
    await page.click(".fallback-link");
  }
  await expect(page.locator(".image-upload")).toBeVisible();
}

// These two tests are specific to the MAPBOX_TOKEN flow and are skipped when
// no token is configured (the app goes directly to image upload in that case).
test("fallback link shows image upload view", async ({ page }) => {
  await page.goto("/");
  const hasAddressSearch = await page.locator(".address-search").isVisible();
  test.skip(!hasAddressSearch, "No MAPBOX_TOKEN — app starts on image upload");

  await page.click(".fallback-link");
  await expect(page.locator(".image-upload")).toBeVisible();
  await expect(page.locator(".drop-zone")).toBeVisible();
});

test("back button returns to address search", async ({ page }) => {
  await page.goto("/");
  const hasAddressSearch = await page.locator(".address-search").isVisible();
  test.skip(
    !hasAddressSearch,
    "No MAPBOX_TOKEN — no back button in no-token mode",
  );

  await page.click(".fallback-link");
  await expect(page.locator(".image-upload")).toBeVisible();
  await page.click(".image-upload .btn-secondary");
  await expect(page.locator(".address-search")).toBeVisible();
});

test("uploading an image shows the calibration tool", async ({ page }) => {
  await goToImageUpload(page);

  await page.locator(".file-input").setInputFiles({
    name: "yard.png",
    mimeType: "image/png",
    buffer: tinyPngBuffer(),
  });

  await expect(page.locator(".calibration-wrapper")).toBeVisible();
  await expect(page.locator(".calibration-controls")).toBeVisible();
});

test("calibration: clicking two points and setting scale advances to boundary drawer", async ({
  page,
}) => {
  await goToImageUpload(page);

  await page.locator(".file-input").setInputFiles({
    name: "yard.png",
    mimeType: "image/png",
    buffer: tinyPngBuffer(),
  });

  // Wait for the image to load (naturalWidth > 0)
  await page.locator(".calibration-wrapper img").waitFor({ state: "visible" });
  await page
    .locator(".calibration-wrapper img")
    .evaluate((img: HTMLImageElement) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.onload = resolve;
          }),
    );

  // Click two distinct points on the image
  const img = page.locator(".calibration-wrapper img");
  const box = await img.boundingBox();
  if (!box) throw new Error("Image not found");

  await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.2);
  await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.8);

  // Distance input and Set Scale button should now be visible
  await expect(page.locator(".calibration-distance-row")).toBeVisible();
  await page.locator(".calibration-distance-input").fill("20");
  await page.locator(".calibration-set-scale").click();

  // Should advance to the boundary drawer
  await expect(page.locator(".boundary-drawer-wrapper")).toBeVisible();
});

test("full image-mode flow: upload → calibrate → draw → summary", async ({
  page,
}) => {
  await goToImageUpload(page);

  await page.locator(".file-input").setInputFiles({
    name: "yard.png",
    mimeType: "image/png",
    buffer: tinyPngBuffer(),
  });

  await page.locator(".calibration-wrapper img").waitFor({ state: "visible" });
  await page
    .locator(".calibration-wrapper img")
    .evaluate((img: HTMLImageElement) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.onload = resolve;
          }),
    );

  // Calibrate
  const calImg = page.locator(".calibration-wrapper img");
  const calBox = await calImg.boundingBox();
  if (!calBox) throw new Error("Calibration image not found");
  await page.mouse.click(
    calBox.x + calBox.width * 0.1,
    calBox.y + calBox.height * 0.1,
  );
  await page.mouse.click(
    calBox.x + calBox.width * 0.9,
    calBox.y + calBox.height * 0.9,
  );
  await page.locator(".calibration-distance-input").fill("30");
  await page.locator(".calibration-set-scale").click();

  // Draw a triangle boundary (3 vertices + double-click to close)
  await page
    .locator(".boundary-drawer-wrapper img")
    .waitFor({ state: "visible" });
  await page
    .locator(".boundary-drawer-wrapper img")
    .evaluate((img: HTMLImageElement) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.onload = resolve;
          }),
    );

  const svg = page.locator(".boundary-drawer-wrapper svg");
  const svgBox = await svg.boundingBox();
  if (!svgBox) throw new Error("SVG not found");

  await page.mouse.click(
    svgBox.x + svgBox.width * 0.2,
    svgBox.y + svgBox.height * 0.2,
  );
  await page.mouse.click(
    svgBox.x + svgBox.width * 0.8,
    svgBox.y + svgBox.height * 0.2,
  );
  await page.mouse.click(
    svgBox.x + svgBox.width * 0.5,
    svgBox.y + svgBox.height * 0.8,
  );

  // Close the polygon by clicking the first vertex (highlighted green when >= 3 vertices)
  await page.locator(".boundary-vertex-first").click();

  // Should advance to summary
  await expect(page.locator(".yard-summary")).toBeVisible();
  await expect(page.locator(".summary-grid")).toBeVisible();
});
