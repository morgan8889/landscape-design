import { describe, expect, it } from "vitest";
import type { PlantAssignment, Zone } from "../types";
import {
  calculateAssignmentCost,
  calculateProjectCost,
  calculateZoneCost,
  formatCurrency,
} from "./plant-cost";

describe("calculateAssignmentCost", () => {
  it("uses catalog price when no override", () => {
    expect(calculateAssignmentCost(10, undefined, 3.5)).toBe(35);
  });

  it("uses override price when provided", () => {
    expect(calculateAssignmentCost(10, 5.0, 3.5)).toBe(50);
  });

  it("returns 0 for zero quantity", () => {
    expect(calculateAssignmentCost(0, undefined, 3.5)).toBe(0);
  });

  it("handles zero cost", () => {
    expect(calculateAssignmentCost(10, 0, 3.5)).toBe(0);
  });
});

describe("calculateZoneCost", () => {
  it("sums costs for multiple assignments", () => {
    const assignments: PlantAssignment[] = [
      { plantId: "lavender", quantity: 10, calculatedQuantity: 10 },
      { plantId: "boxwood", quantity: 5, calculatedQuantity: 5 },
    ];
    const getCost = (id: string) => (id === "lavender" ? 3.5 : 25.0);
    expect(calculateZoneCost(assignments, getCost)).toBe(160);
  });

  it("returns 0 for empty assignments", () => {
    expect(calculateZoneCost([], () => 0)).toBe(0);
  });

  it("respects per-assignment cost override", () => {
    const assignments: PlantAssignment[] = [
      {
        plantId: "lavender",
        quantity: 10,
        calculatedQuantity: 10,
        costPerUnit: 5.0,
      },
    ];
    const getCost = () => 3.5;
    expect(calculateZoneCost(assignments, getCost)).toBe(50);
  });
});

describe("calculateProjectCost", () => {
  it("sums costs across zones", () => {
    const zones: Zone[] = [
      {
        id: "z1",
        category: "garden-bed",
        vertices: [],
        areaSqFt: 100,
        plants: [{ plantId: "lavender", quantity: 10, calculatedQuantity: 10 }],
      },
      {
        id: "z2",
        category: "patio",
        vertices: [],
        areaSqFt: 50,
        plants: [{ plantId: "boxwood", quantity: 3, calculatedQuantity: 3 }],
      },
    ];
    const getCost = (id: string) => (id === "lavender" ? 3.5 : 25.0);
    expect(calculateProjectCost(zones, getCost)).toBe(110);
  });

  it("returns 0 for zones with no plants", () => {
    const zones: Zone[] = [
      { id: "z1", category: "garden-bed", vertices: [], areaSqFt: 100 },
    ];
    expect(calculateProjectCost(zones, () => 0)).toBe(0);
  });

  it("returns 0 for empty zones array", () => {
    expect(calculateProjectCost([], () => 0)).toBe(0);
  });
});

describe("formatCurrency", () => {
  it("formats whole dollars", () => {
    expect(formatCurrency(35)).toBe("$35.00");
  });

  it("formats cents", () => {
    expect(formatCurrency(35.5)).toBe("$35.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats large amounts with commas", () => {
    expect(formatCurrency(1247)).toBe("$1,247.00");
  });

  it("rounds to two decimal places", () => {
    expect(formatCurrency(35.999)).toBe("$36.00");
  });
});
