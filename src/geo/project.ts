// src/geo/project.ts
import type { LatLng } from "../types";

export function projectToMeters(
  vertices: LatLng[],
): { x: number; y: number }[] {
  const centLat = vertices.reduce((sum, v) => sum + v.lat, 0) / vertices.length;
  const centLng = vertices.reduce((sum, v) => sum + v.lng, 0) / vertices.length;

  const latToM = 111_320;
  const lngToM = 111_320 * Math.cos((centLat * Math.PI) / 180);

  return vertices.map((v) => ({
    x: (v.lng - centLng) * lngToM,
    y: (v.lat - centLat) * latToM,
  }));
}
