// src/geo/pixel-area.test.ts
import { describe, expect, it } from "vitest";
import type { Point } from "../types";
import { calculatePixelAreaSqFt } from "./pixel-area";

describe("calculatePixelAreaSqFt", () => {
  it("calculates area of a 100x100 pixel square at 10 px/ft", () => {
    const vertices: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const area = calculatePixelAreaSqFt(vertices, 10);
    expect(area).toBeCloseTo(100, 1);
  });

  it("returns 0 for fewer than 3 vertices", () => {
    expect(calculatePixelAreaSqFt([], 10)).toBe(0);
    expect(calculatePixelAreaSqFt([{ x: 0, y: 0 }], 10)).toBe(0);
  });

  it("returns positive area regardless of winding order", () => {
    const cw: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
    ];
    const ccw = [...cw].reverse();
    expect(calculatePixelAreaSqFt(cw, 5)).toBeCloseTo(
      calculatePixelAreaSqFt(ccw, 5),
      1,
    );
  });

  it("throws if pixelsPerFoot is zero", () => {
    const vertices: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(() => calculatePixelAreaSqFt(vertices, 0)).toThrow();
  });
});
