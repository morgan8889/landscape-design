// src/geo/calibration.test.ts
import { describe, expect, it } from "vitest";
import type { Point } from "../types";
import { calculatePixelsPerFoot } from "./calibration";

describe("calculatePixelsPerFoot", () => {
  it("calculates pixels per foot from two points and distance", () => {
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 100, y: 0 };
    const ppf = calculatePixelsPerFoot(a, b, 50);
    expect(ppf).toBe(2);
  });

  it("works with diagonal distances", () => {
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 30, y: 40 };
    const ppf = calculatePixelsPerFoot(a, b, 25);
    expect(ppf).toBe(2);
  });

  it("throws if distance is zero or negative", () => {
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 10, y: 0 };
    expect(() => calculatePixelsPerFoot(a, b, 0)).toThrow();
    expect(() => calculatePixelsPerFoot(a, b, -5)).toThrow();
  });

  it("throws if points are the same", () => {
    const a: Point = { x: 10, y: 10 };
    expect(() => calculatePixelsPerFoot(a, a, 50)).toThrow();
  });
});
