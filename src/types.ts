// src/types.ts
export interface Point {
  x: number;
  y: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ImageMode {
  imageDataUrl: string;
  pixelsPerFoot: number;
  calibrationPoints: [Point, Point];
  calibrationDistanceFt: number;
}

export type ZoneCategory =
  | "garden-bed"
  | "lawn"
  | "patio"
  | "path"
  | "deck"
  | "pool";

export interface Zone {
  id: string;
  category: ZoneCategory;
  vertices: LatLng[];
  areaSqFt: number;
}

export interface YardDesign {
  id: string;
  address: string;
  center: LatLng;
  boundary: LatLng[];
  pixelBoundary?: Point[];
  areaSqFt: number;
  perimeterFt: number;
  usdaZone: string | null;
  createdAt: string;
  updatedAt: string;
  imageMode?: ImageMode;
  zones?: Zone[];
}
