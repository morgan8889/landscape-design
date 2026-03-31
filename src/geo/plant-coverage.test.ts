import { describe, expect, it } from "vitest";
import type { PlantAssignment } from "../types";
import {
  calculateCoveragePercent,
  calculatePlantQuantity,
} from "./plant-coverage";

describe("calculatePlantQuantity", () => {
  it("calculates grid-based quantity for a standard zone", () => {
    // 320 sq ft, 18" spacing → spacingFt=1.5, plantsPerRow=floor(17.89/1.5)=11, total=121
    expect(calculatePlantQuantity(320, 18)).toBe(121);
  });

  it("returns 0 for zero area", () => {
    expect(calculatePlantQuantity(0, 18)).toBe(0);
  });

  it("returns 0 when nothing fits", () => {
    // 1 sq ft, 24" spacing → spacingFt=2, plantsPerRow=floor(1/2)=0, 0*0=0
    expect(calculatePlantQuantity(1, 24)).toBe(0);
  });

  it("handles 12-inch spacing", () => {
    // 100 sq ft, 12" spacing → spacingFt=1, plantsPerRow=floor(10/1)=10, total=100
    expect(calculatePlantQuantity(100, 12)).toBe(100);
  });

  it("throws for zero spacing", () => {
    expect(() => calculatePlantQuantity(100, 0)).toThrow(
      "spacing must be greater than 0",
    );
  });
});

describe("calculateCoveragePercent", () => {
  it("calculates coverage for a single plant type", () => {
    const assignments: PlantAssignment[] = [
      { plantId: "lavender", quantity: 121, calculatedQuantity: 121 },
    ];
    // 121 plants * (1.5ft)^2 = 121 * 2.25 = 272.25 sq ft / 320 = 85.08%
    const result = calculateCoveragePercent(320, assignments, (id) =>
      id === "lavender" ? 18 : 0,
    );
    expect(result).toBeCloseTo(85.08, 0);
  });

  it("returns 0 for no assignments", () => {
    expect(calculateCoveragePercent(320, [], () => 0)).toBe(0);
  });

  it("returns 0 for zero area", () => {
    const assignments: PlantAssignment[] = [
      { plantId: "lavender", quantity: 10, calculatedQuantity: 10 },
    ];
    expect(calculateCoveragePercent(0, assignments, () => 18)).toBe(0);
  });

  it("can exceed 100%", () => {
    const assignments: PlantAssignment[] = [
      { plantId: "a", quantity: 200, calculatedQuantity: 100 },
    ];
    // 200 * (1.5)^2 = 450 / 320 = 140.6%
    const result = calculateCoveragePercent(320, assignments, () => 18);
    expect(result).toBeGreaterThan(100);
  });
});
