// src/components/zone-manager.test.ts
import { describe, expect, it } from "vitest";
import {
  ZONE_CATEGORIES,
  getCategoryColor,
  getCategoryFillOpacity,
  getCategoryLabel,
} from "./zone-manager";

describe("ZONE_CATEGORIES", () => {
  it("has 6 categories", () => {
    expect(ZONE_CATEGORIES).toHaveLength(6);
  });
});

describe("getCategoryLabel", () => {
  it("returns human-readable label", () => {
    expect(getCategoryLabel("garden-bed")).toBe("Garden Bed");
    expect(getCategoryLabel("lawn")).toBe("Lawn");
    expect(getCategoryLabel("patio")).toBe("Patio");
    expect(getCategoryLabel("path")).toBe("Path");
    expect(getCategoryLabel("deck")).toBe("Deck");
    expect(getCategoryLabel("pool")).toBe("Pool");
  });
});

describe("getCategoryColor", () => {
  it("returns hex color for each category", () => {
    expect(getCategoryColor("garden-bed")).toBe("#22c55e");
    expect(getCategoryColor("lawn")).toBe("#86efac");
    expect(getCategoryColor("patio")).toBe("#a78bfa");
    expect(getCategoryColor("path")).toBe("#fbbf24");
    expect(getCategoryColor("deck")).toBe("#f97316");
    expect(getCategoryColor("pool")).toBe("#38bdf8");
  });
});

describe("getCategoryFillOpacity", () => {
  it("returns correct opacity for each category", () => {
    expect(getCategoryFillOpacity("garden-bed")).toBe(0.3);
    expect(getCategoryFillOpacity("lawn")).toBe(0.2);
    expect(getCategoryFillOpacity("patio")).toBe(0.3);
    expect(getCategoryFillOpacity("path")).toBe(0.3);
    expect(getCategoryFillOpacity("deck")).toBe(0.3);
    expect(getCategoryFillOpacity("pool")).toBe(0.4);
  });
});
