// src/geo/area.test.ts
import { describe, expect, it } from "vitest";
import { calculateAreaSqFt } from "./area";

describe("calculateAreaSqFt", () => {
  it("calculates area of a known rectangle", () => {
    const vertices = [
      { lat: 45.5, lng: -122.65 },
      { lat: 45.5, lng: -122.6496097 },
      { lat: 45.500274, lng: -122.6496097 },
      { lat: 45.500274, lng: -122.65 },
    ];
    const area = calculateAreaSqFt(vertices);
    expect(area).toBeGreaterThan(9800);
    expect(area).toBeLessThan(10200);
  });

  it("returns 0 for fewer than 3 vertices", () => {
    expect(calculateAreaSqFt([])).toBe(0);
    expect(calculateAreaSqFt([{ lat: 0, lng: 0 }])).toBe(0);
    expect(
      calculateAreaSqFt([
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
      ]),
    ).toBe(0);
  });

  it("returns positive area regardless of vertex winding order", () => {
    const cw = [
      { lat: 45.5, lng: -122.65 },
      { lat: 45.5, lng: -122.649 },
      { lat: 45.501, lng: -122.649 },
      { lat: 45.501, lng: -122.65 },
    ];
    const ccw = [...cw].reverse();
    expect(calculateAreaSqFt(cw)).toBeCloseTo(calculateAreaSqFt(ccw), 0);
  });
});
