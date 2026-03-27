import { defineConfig } from "vite";

export default defineConfig({
  test: {
    exclude: ["e2e/**", "node_modules/**"],
    setupFiles: ["src/test-setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/test-setup.ts",
        "src/**/*.test.ts",
        "src/components/map-view.ts",
        "src/components/boundary-drawer.ts",
      ],
      thresholds: {
        lines: 35,
        functions: 40,
        branches: 50,
      },
    },
  },
});
