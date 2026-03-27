// src/geo/pixel-perimeter.test.ts
import { describe, expect, it } from "vitest";
import type { Point } from "../types";
import { calculatePixelPerimeterFt } from "./pixel-perimeter";

describe("calculatePixelPerimeterFt", () => {
  it("calculates perimeter of a 100x100 pixel square at 10 px/ft", () => {
    const vertices: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const perimeter = calculatePixelPerimeterFt(vertices, 10);
    expect(perimeter).toBeCloseTo(40, 1);
  });

  it("returns 0 for fewer than 2 vertices", () => {
    expect(calculatePixelPerimeterFt([], 10)).toBe(0);
    expect(calculatePixelPerimeterFt([{ x: 0, y: 0 }], 10)).toBe(0);
  });

  it("includes closing segment", () => {
    const triangle: Point[] = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 15, y: 20 },
    ];
    const perimeter = calculatePixelPerimeterFt(triangle, 1);
    expect(perimeter).toBeGreaterThan(70);
    expect(perimeter).toBeLessThan(90);
  });

  it("throws if pixelsPerFoot is zero", () => {
    const vertices: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(() => calculatePixelPerimeterFt(vertices, 0)).toThrow();
  });
});
