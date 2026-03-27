import { describe, expect, it } from "vitest";
import { calculatePerimeterFt } from "./perimeter";

describe("calculatePerimeterFt", () => {
  it("calculates perimeter of a known rectangle", () => {
    const vertices = [
      { lat: 45.5, lng: -122.65 },
      { lat: 45.5, lng: -122.6496534 },
      { lat: 45.500274, lng: -122.6496534 },
      { lat: 45.500274, lng: -122.65 },
    ];
    const perimeter = calculatePerimeterFt(vertices);
    expect(perimeter).toBeGreaterThan(370);
    expect(perimeter).toBeLessThan(385);
  });

  it("returns 0 for fewer than 2 vertices", () => {
    expect(calculatePerimeterFt([])).toBe(0);
    expect(calculatePerimeterFt([{ lat: 0, lng: 0 }])).toBe(0);
  });

  it("includes the closing segment back to first vertex", () => {
    const triangle = [
      { lat: 45.5, lng: -122.65 },
      { lat: 45.5, lng: -122.649 },
      { lat: 45.501, lng: -122.6495 },
    ];
    const perimeter = calculatePerimeterFt(triangle);
    expect(perimeter).toBeGreaterThan(0);
  });
});
