import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:5173",
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    },
  },
  snapshotPathTemplate: "screenshots/baseline/{testFilePath}/{arg}{ext}",
});
