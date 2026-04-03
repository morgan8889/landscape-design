import { describe, expect, it } from "vitest";
import type { PlantInfo } from "../types";
import { filterPlants, resolveCostOverride } from "./plant-browser";

const fullSunLow: PlantInfo = {
  id: "lavender",
  name: "Lavender",
  category: "perennial",
  sunRequirement: "full-sun",
  waterNeed: "low",
  spacingInches: 18,
  matureHeightFt: 2,
  matureWidthFt: 2,
  emoji: "💜",
  tags: ["pollinator", "fragrant"],
  zoneCompatibility: ["garden-bed"],
  costPerUnit: 8.99,
};

const shadeMod: PlantInfo = {
  id: "hosta",
  name: "Hosta",
  category: "perennial",
  sunRequirement: "partial-shade",
  waterNeed: "moderate",
  spacingInches: 24,
  matureHeightFt: 1.5,
  matureWidthFt: 2,
  emoji: "🌿",
  tags: ["shade-tolerant"],
  zoneCompatibility: ["garden-bed"],
  costPerUnit: 12.0,
};

const plants = [fullSunLow, shadeMod];

describe("filterPlants", () => {
  it("returns all plants when filter is empty", () => {
    expect(filterPlants(plants, "")).toEqual(plants);
  });

  it("filters by sunRequirement", () => {
    expect(filterPlants(plants, "full-sun")).toEqual([fullSunLow]);
  });

  it("filters by waterNeed", () => {
    expect(filterPlants(plants, "low")).toEqual([fullSunLow]);
  });

  it("filters by tag", () => {
    expect(filterPlants(plants, "pollinator")).toEqual([fullSunLow]);
  });

  it("returns empty array when no plants match", () => {
    expect(filterPlants(plants, "full-shade")).toEqual([]);
  });

  it("matches partial-shade sunRequirement", () => {
    expect(filterPlants(plants, "partial-shade")).toEqual([shadeMod]);
  });
});

describe("resolveCostOverride", () => {
  it("returns undefined when price was not edited", () => {
    expect(resolveCostOverride(false, 9.99)).toBeUndefined();
  });

  it("returns price when edited with a valid number", () => {
    expect(resolveCostOverride(true, 12.5)).toBe(12.5);
  });

  it("returns undefined when price field was cleared (NaN)", () => {
    expect(resolveCostOverride(true, Number.NaN)).toBeUndefined();
  });

  it("returns 0 when price is explicitly set to zero", () => {
    expect(resolveCostOverride(true, 0)).toBe(0);
  });

  it("returns undefined when price is negative", () => {
    expect(resolveCostOverride(true, -5)).toBeUndefined();
  });

  it("returns undefined when price is Infinity", () => {
    expect(resolveCostOverride(true, Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});
