// src/types.ts
export interface LatLng {
  lat: number;
  lng: number;
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
}

export type AppState =
  | { phase: "search" }
  | { phase: "drawing"; center: LatLng; address: string }
  | { phase: "summary"; design: YardDesign };
