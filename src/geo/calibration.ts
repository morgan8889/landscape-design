// src/geo/calibration.ts
import type { Point } from "../types";

export function calculatePixelsPerFoot(
  a: Point,
  b: Point,
  distanceFt: number,
): number {
  if (distanceFt <= 0) throw new Error("Distance must be positive");

  const pixelDist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  if (pixelDist === 0) throw new Error("Calibration points must be different");

  return pixelDist / distanceFt;
}
