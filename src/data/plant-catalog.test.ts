import { describe, expect, it } from "vitest";
import {
  PLANT_CATALOG,
  getPlantById,
  getPlantsForZone,
  searchPlants,
} from "./plant-catalog";

describe("PLANT_CATALOG", () => {
  it("contains at least 50 plants", () => {
    expect(PLANT_CATALOG.length).toBeGreaterThanOrEqual(50);
  });

  it("every plant has required fields", () => {
    for (const plant of PLANT_CATALOG) {
      expect(plant.id).toBeTruthy();
      expect(plant.name).toBeTruthy();
      expect(plant.spacingInches).toBeGreaterThan(0);
      expect(plant.zoneCompatibility.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate IDs", () => {
    const ids = PLANT_CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getPlantById", () => {
  it("returns plant for valid ID", () => {
    const plant = getPlantById("lavender");
    expect(plant).toBeDefined();
    expect(plant?.name).toBe("Lavender");
  });

  it("returns undefined for unknown ID", () => {
    expect(getPlantById("nonexistent")).toBeUndefined();
  });
});

describe("getPlantsForZone", () => {
  it("returns only plants compatible with garden-bed", () => {
    const plants = getPlantsForZone("garden-bed");
    expect(plants.length).toBeGreaterThan(0);
    for (const p of plants) {
      expect(p.zoneCompatibility).toContain("garden-bed");
    }
  });

  it("returns only plants compatible with lawn", () => {
    const plants = getPlantsForZone("lawn");
    expect(plants.length).toBeGreaterThan(0);
    for (const p of plants) {
      expect(p.zoneCompatibility).toContain("lawn");
    }
  });
});

describe("searchPlants", () => {
  it("finds plants by name substring", () => {
    const results = searchPlants("lav", "garden-bed");
    expect(results.some((p) => p.id === "lavender")).toBe(true);
  });

  it("is case-insensitive", () => {
    const results = searchPlants("LAV", "garden-bed");
    expect(results.some((p) => p.id === "lavender")).toBe(true);
  });

  it("returns all compatible plants for empty query", () => {
    const all = getPlantsForZone("garden-bed");
    const searched = searchPlants("", "garden-bed");
    expect(searched.length).toBe(all.length);
  });
});
