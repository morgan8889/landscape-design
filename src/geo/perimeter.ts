import type { LatLng } from "../types";

const EARTH_RADIUS_FT = 20_902_231;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistanceFt(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_FT * Math.asin(Math.sqrt(h));
}

export function calculatePerimeterFt(vertices: LatLng[]): number {
  if (vertices.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < vertices.length; i++) {
    const next = vertices[(i + 1) % vertices.length];
    total += haversineDistanceFt(vertices[i], next);
  }
  return total;
}
