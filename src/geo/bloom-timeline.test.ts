import { describe, expect, it } from "vitest";
import type { PlantInfo, Zone } from "../types";
import { buildBloomTimeline } from "./bloom-timeline";

const basePlant = (
  id: string,
  overrides: Partial<PlantInfo> = {},
): PlantInfo => ({
  id,
  name: id,
  category: "perennial",
  sunRequirement: "full-sun",
  waterNeed: "low",
  spacingInches: 12,
  matureHeightFt: 1,
  matureWidthFt: 1,
  emoji: "🌸",
  tags: [],
  zoneCompatibility: ["garden-bed"],
  ...overrides,
});

const zone = (id: string, plantIds: string[]): Zone => ({
  id,
  category: "garden-bed",
  vertices: [],
  areaSqFt: 100,
  plants: plantIds.map((plantId) => ({
    plantId,
    quantity: 3,
    calculatedQuantity: 3,
  })),
});

const getPlant = (plants: PlantInfo[]) => (id: string) =>
  plants.find((p) => p.id === id) ?? null;

describe("buildBloomTimeline", () => {
  it("returns all-zero months and no gaps when zones are empty", () => {
    const result = buildBloomTimeline([], getPlant([]));
    expect(result.months).toHaveLength(12);
    expect(result.months.every((m) => m.totalInterest === 0)).toBe(true);
    expect(result.gapMonths).toEqual([]);
    expect(result.plantCount).toBe(0);
  });

  it("returns plantCount 0 when plants have no bloom or foliage data", () => {
    const plants = [basePlant("p1")];
    const result = buildBloomTimeline([zone("z1", ["p1"])], getPlant(plants));
    expect(result.plantCount).toBe(0);
    expect(result.months.every((m) => m.totalInterest === 0)).toBe(true);
  });

  it("populates bloom months for a single plant", () => {
    const plants = [basePlant("p1", { bloomMonths: [4, 5, 6] })];
    const result = buildBloomTimeline([zone("z1", ["p1"])], getPlant(plants));
    expect(result.plantCount).toBe(1);
    expect(result.months[3].bloomingPlants).toContain("p1"); // April = index 3
    expect(result.months[3].totalInterest).toBe(1);
    expect(result.months[0].totalInterest).toBe(0); // January
  });

  it("populates foliage months separately from bloom months", () => {
    const plants = [basePlant("p1", { foliageMonths: [9, 10, 11] })];
    const result = buildBloomTimeline([zone("z1", ["p1"])], getPlant(plants));
    expect(result.months[8].foliagePlants).toContain("p1"); // September = index 8
    expect(result.months[8].bloomingPlants).toHaveLength(0);
    expect(result.months[8].totalInterest).toBe(1);
  });

  it("counts plant once per month when it has both bloom and foliage that month", () => {
    const plants = [basePlant("p1", { bloomMonths: [5], foliageMonths: [5] })];
    const result = buildBloomTimeline([zone("z1", ["p1"])], getPlant(plants));
    expect(result.months[4].totalInterest).toBe(1); // deduplicated
    expect(result.months[4].bloomingPlants).toContain("p1");
    expect(result.months[4].foliagePlants).toContain("p1");
  });

  it("deduplicates same plant assigned in two zones", () => {
    const plants = [basePlant("p1", { bloomMonths: [6] })];
    const result = buildBloomTimeline(
      [zone("z1", ["p1"]), zone("z2", ["p1"])],
      getPlant(plants),
    );
    expect(result.plantCount).toBe(1);
    expect(result.months[5].totalInterest).toBe(1);
    expect(result.months[5].bloomingPlants).toEqual(["p1"]);
  });

  it("detects gap months where totalInterest is zero", () => {
    const plants = [basePlant("p1", { bloomMonths: [3, 4, 5, 6, 9, 10, 11] })];
    const result = buildBloomTimeline([zone("z1", ["p1"])], getPlant(plants));
    expect(result.gapMonths).toEqual([1, 2, 7, 8, 12]);
  });

  it("returns empty gapMonths when all 12 months are covered", () => {
    const plants = [
      basePlant("p1", { bloomMonths: [1, 2, 3, 4, 5, 6] }),
      basePlant("p2", { foliageMonths: [7, 8, 9, 10, 11, 12] }),
    ];
    const result = buildBloomTimeline(
      [zone("z1", ["p1", "p2"])],
      getPlant(plants),
    );
    expect(result.gapMonths).toEqual([]);
  });

  it("skips plants that are not found by getPlantInfo", () => {
    const result = buildBloomTimeline(
      [zone("z1", ["missing-id"])],
      getPlant([]),
    );
    expect(result.plantCount).toBe(0);
  });

  it("month entries are indexed 0-11 with month number 1-12", () => {
    const result = buildBloomTimeline([], getPlant([]));
    expect(result.months[0].month).toBe(1);
    expect(result.months[11].month).toBe(12);
  });
});
