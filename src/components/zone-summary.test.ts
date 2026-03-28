// src/components/zone-summary.test.ts
import { describe, expect, it } from "vitest";
import type { Zone } from "../types";
import { formatZoneArea, getTotalZoneArea } from "./zone-summary";

describe("formatZoneArea", () => {
  it("formats area with category label", () => {
    expect(formatZoneArea("garden-bed", 320)).toBe("Garden Bed — 320 sq ft");
  });

  it("rounds to nearest integer", () => {
    expect(formatZoneArea("patio", 150.7)).toBe("Patio — 151 sq ft");
  });
});

describe("getTotalZoneArea", () => {
  it("sums all zone areas", () => {
    const zones: Zone[] = [
      { id: "1", category: "garden-bed", vertices: [], areaSqFt: 100 },
      { id: "2", category: "patio", vertices: [], areaSqFt: 200 },
    ];
    expect(getTotalZoneArea(zones)).toBe(300);
  });

  it("returns 0 for empty array", () => {
    expect(getTotalZoneArea([])).toBe(0);
  });
});
