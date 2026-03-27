// src/geo/area.ts
import type { LatLng } from "../types";
import { projectToMeters } from "./project";

const SQ_METERS_TO_SQ_FEET = 10.7639;

export function calculateAreaSqFt(vertices: LatLng[]): number {
  if (vertices.length < 3) return 0;

  const projected = projectToMeters(vertices);
  const n = projected.length;
  let areaSqM = 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    areaSqM += projected[i].x * projected[j].y;
    areaSqM -= projected[j].x * projected[i].y;
  }

  areaSqM = Math.abs(areaSqM) / 2;
  return areaSqM * SQ_METERS_TO_SQ_FEET;
}
