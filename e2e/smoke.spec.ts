import { expect, test } from "@playwright/test";

test("homepage loads with greeting", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#app")).toContainText(
    "Hello, Landscape Designer!",
  );
});
