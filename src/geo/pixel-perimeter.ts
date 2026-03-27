// src/geo/pixel-perimeter.ts
import type { Point } from "../types";

function pixelDistance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function calculatePixelPerimeterFt(
  vertices: Point[],
  pixelsPerFoot: number,
): number {
  if (vertices.length < 2) return 0;
  if (pixelsPerFoot === 0) throw new Error("pixelsPerFoot must be non-zero");

  let total = 0;
  for (let i = 0; i < vertices.length; i++) {
    const next = vertices[(i + 1) % vertices.length];
    total += pixelDistance(vertices[i], next);
  }
  return total / pixelsPerFoot;
}
