// src/geo/pixel-area.ts
import type { Point } from "../types";

export function calculatePixelAreaSqFt(
  vertices: Point[],
  pixelsPerFoot: number,
): number {
  if (vertices.length < 3) return 0;
  if (pixelsPerFoot === 0) throw new Error("pixelsPerFoot must be non-zero");

  const n = vertices.length;
  let areaPixels = 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    areaPixels += vertices[i].x * vertices[j].y;
    areaPixels -= vertices[j].x * vertices[i].y;
  }

  areaPixels = Math.abs(areaPixels) / 2;
  return areaPixels / (pixelsPerFoot * pixelsPerFoot);
}
