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

export interface YardDesign {
  id: string;
  address: string;
  center: LatLng;
  boundary: LatLng[];
  areaSqFt: number;
  perimeterFt: number;
  usdaZone: string | null;
  createdAt: string;
  updatedAt: string;
  imageMode?: ImageMode;
}

export type AppState =
  | { phase: "search" }
  | { phase: "drawing"; center: LatLng; address: string }
  | { phase: "summary"; design: YardDesign }
  | { phase: "image-upload" }
  | { phase: "image-calibrating"; imageDataUrl: string }
  | {
      phase: "image-drawing";
      imageDataUrl: string;
      pixelsPerFoot: number;
      calibrationPoints: [Point, Point];
      calibrationDistanceFt: number;
    };
