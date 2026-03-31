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

export type PlantCategory =
  | "perennial"
  | "annual"
  | "shrub"
  | "ground-cover"
  | "grass"
  | "tree";

export type Sun = "full-sun" | "partial-shade" | "full-shade";
export type Water = "low" | "moderate" | "high";

export interface PlantInfo {
  id: string;
  name: string;
  category: PlantCategory;
  sunRequirement: Sun;
  waterNeed: Water;
  spacingInches: number;
  matureHeightFt: number;
  matureWidthFt: number;
  emoji: string;
  tags: string[];
  zoneCompatibility: ZoneCategory[];
}

export interface PlantAssignment {
  plantId: string;
  quantity: number;
  calculatedQuantity: number;
}

export interface Zone {
  id: string;
  category: ZoneCategory;
  vertices: LatLng[];
  areaSqFt: number;
  plants?: PlantAssignment[];
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
