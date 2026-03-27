import { defineConfig } from "vite";

export default defineConfig({
  test: {
    exclude: ["e2e/**", "node_modules/**"],
    setupFiles: ["src/test-setup.ts"],
    environmentMatchGlobs: [
      ["src/storage/**", "happy-dom"],
      ["src/components/**", "happy-dom"],
    ],
  },
});
