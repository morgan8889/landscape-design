// src/main.ts
import "./style.css";
import { renderAddressSearch } from "./components/address-search";
import { createBoundaryDrawer } from "./components/boundary-drawer";
import { renderCalibrationTool } from "./components/calibration-tool";
import { renderImageBoundaryDrawer } from "./components/image-boundary-drawer";
import { renderImageUpload } from "./components/image-upload";
import { createMapView } from "./components/map-view";
import { renderYardSummary } from "./components/yard-summary";
import { calculateAreaSqFt } from "./geo/area";
import { calculatePerimeterFt } from "./geo/perimeter";
import { calculatePixelAreaSqFt } from "./geo/pixel-area";
import { calculatePixelPerimeterFt } from "./geo/pixel-perimeter";
import { loadDesign } from "./storage/local-store";
import type { LatLng, YardDesign } from "./types";
import type { Point } from "./types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

function getApp(): HTMLElement {
  const el = document.getElementById("app");
  if (!el) throw new Error("#app element not found");
  return el;
}

export async function lookupUsdaZone(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const res = await fetch(`https://phzmapi.org/${lat}/${lng}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.zone ?? null;
  } catch {
    return null;
  }
}

function renderSearch(): void {
  const app = getApp();

  if (!MAPBOX_TOKEN) {
    renderImageUploadView();
    return;
  }

  renderAddressSearch(
    app,
    (result) => renderMap({ lat: result.lat, lng: result.lng }, result.address),
    () => renderImageUploadView(),
    MAPBOX_TOKEN,
  );
}

async function renderMap(center: LatLng, address: string): Promise<void> {
  if (!MAPBOX_TOKEN) {
    renderSearch();
    return;
  }

  const app = getApp();

  const handle = await createMapView(app, center, MAPBOX_TOKEN, () => {
    renderSearch();
  });

  if (!handle) return;

  createBoundaryDrawer(handle.map, async (vertices) => {
    const areaSqFt = calculateAreaSqFt(vertices);
    const perimeterFt = calculatePerimeterFt(vertices);
    const usdaZone = await lookupUsdaZone(center.lat, center.lng);

    const design: YardDesign = {
      id: crypto.randomUUID(),
      address,
      center,
      boundary: vertices,
      areaSqFt,
      perimeterFt,
      usdaZone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    renderSummary(design);
  });
}

function renderImageUploadView(): void {
  const app = getApp();
  renderImageUpload(
    app,
    (dataUrl) => renderCalibration(dataUrl),
    () => renderSearch(),
  );
}

function renderCalibration(imageDataUrl: string): void {
  const app = getApp();
  renderCalibrationTool(
    app,
    imageDataUrl,
    (result) =>
      renderImageDraw(
        imageDataUrl,
        result.pixelsPerFoot,
        result.points,
        result.distanceFt,
      ),
    () => renderImageUploadView(),
  );
}

function renderImageDraw(
  imageDataUrl: string,
  pixelsPerFoot: number,
  calibrationPoints: [Point, Point],
  calibrationDistanceFt: number,
): void {
  const app = getApp();
  renderImageBoundaryDrawer(
    app,
    imageDataUrl,
    pixelsPerFoot,
    (vertices) => {
      const areaSqFt = calculatePixelAreaSqFt(vertices, pixelsPerFoot);
      const perimeterFt = calculatePixelPerimeterFt(vertices, pixelsPerFoot);

      const design: YardDesign = {
        id: crypto.randomUUID(),
        address: "Uploaded image",
        center: { lat: 0, lng: 0 },
        boundary: vertices.map((p) => ({ lat: p.y, lng: p.x })),
        areaSqFt,
        perimeterFt,
        usdaZone: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        imageMode: {
          imageDataUrl,
          pixelsPerFoot,
          calibrationPoints,
          calibrationDistanceFt,
        },
      };

      renderSummary(design);
    },
    () => renderCalibration(imageDataUrl),
  );
}

function renderSummary(design: YardDesign): void {
  const app = getApp();
  renderYardSummary(app, design, () => {
    if (design.imageMode) {
      renderImageDraw(
        design.imageMode.imageDataUrl,
        design.imageMode.pixelsPerFoot,
        design.imageMode.calibrationPoints,
        design.imageMode.calibrationDistanceFt,
      );
    } else {
      void renderMap(design.center, design.address);
    }
  });
}

function bootstrap(): void {
  const saved = loadDesign();
  if (saved) {
    renderSummary(saved);
  } else {
    renderSearch();
  }
}

if (typeof document !== "undefined") {
  bootstrap();
}

export { bootstrap };
