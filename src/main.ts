// src/main.ts
import "./style.css";
import { renderAddressSearch } from "./components/address-search";
import { createBoundaryDrawer } from "./components/boundary-drawer";
import { renderCalibrationTool } from "./components/calibration-tool";
import { renderImageBoundaryDrawer } from "./components/image-boundary-drawer";
import { renderImageUpload } from "./components/image-upload";
import { createMapView } from "./components/map-view";
import { renderPlantBrowser } from "./components/plant-browser";
import { renderShoppingList } from "./components/shopping-list-view";
import { renderYardSummary } from "./components/yard-summary";
import { renderZoneManager } from "./components/zone-manager";
import { calculateAreaSqFt } from "./geo/area";
import { calculatePerimeterFt } from "./geo/perimeter";
import { calculatePixelAreaSqFt } from "./geo/pixel-area";
import { calculatePixelPerimeterFt } from "./geo/pixel-perimeter";
import { loadDesign, saveDesign } from "./storage/local-store";
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
    MAPBOX_TOKEN ? () => renderSearch() : null,
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
    (vertices) => {
      const areaSqFt = calculatePixelAreaSqFt(vertices, pixelsPerFoot);
      const perimeterFt = calculatePixelPerimeterFt(vertices, pixelsPerFoot);

      const design: YardDesign = {
        id: crypto.randomUUID(),
        address: "Uploaded image",
        center: { lat: 0, lng: 0 },
        boundary: [],
        pixelBoundary: vertices,
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

async function renderZoneEditor(design: YardDesign): Promise<void> {
  if (!MAPBOX_TOKEN) return;
  if (design.boundary.length === 0) return;

  const app = getApp();
  const handle = await createMapView(app, design.center, MAPBOX_TOKEN, () => {
    renderSummary(design);
  });

  if (!handle) return;

  // Show boundary as static overlay
  const boundaryCoords = design.boundary.map((v) => [v.lng, v.lat]);
  boundaryCoords.push(boundaryCoords[0]);

  handle.map.addSource("boundary-overlay", {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [boundaryCoords] },
      properties: {},
    },
  });

  handle.map.addLayer({
    id: "boundary-overlay-line",
    type: "line",
    source: "boundary-overlay",
    paint: {
      "line-color": "#3b82f6",
      "line-width": 2,
      "line-dasharray": [4, 2],
    },
  });

  renderZoneManager(handle.map, design.zones ?? [], (zones) => {
    design.zones = zones;
    design.updatedAt = new Date().toISOString();
    saveDesign(design);
    renderSummary(design);
  });
}

function renderShoppingListView(design: YardDesign): void {
  const app = getApp();
  renderShoppingList(app, design, () => renderSummary(design));
}

const IMAGE_MODE_ZONE_MSG =
  "Zone editing requires a map-based design. Upload a new design using an address to draw zones.";

function renderSummary(design: YardDesign): void {
  const app = getApp();
  const zones = design.zones ?? [];
  renderYardSummary(
    app,
    design,
    () => {
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
    },
    design.imageMode
      ? () => window.alert(IMAGE_MODE_ZONE_MSG)
      : () => void renderZoneEditor(design),
    (zoneId) => {
      design.zones = zones.filter((z) => z.id !== zoneId);
      design.updatedAt = new Date().toISOString();
      saveDesign(design);
      renderSummary(design);
    },
    (zoneId) => {
      const zone = zones.find((z) => z.id === zoneId);
      if (!zone) return;
      renderPlantBrowser(
        app,
        zone,
        (plantId, quantity, calculatedQuantity, costOverride) => {
          if (!zone.plants) zone.plants = [];
          const existing = zone.plants.find((p) => p.plantId === plantId);
          if (existing) {
            existing.quantity += quantity;
            existing.calculatedQuantity = calculatedQuantity;
            if (costOverride !== undefined) existing.costPerUnit = costOverride;
          } else {
            zone.plants.push({
              plantId,
              quantity,
              calculatedQuantity,
              costPerUnit: costOverride,
            });
          }
          design.updatedAt = new Date().toISOString();
          saveDesign(design);
          renderSummary(design);
        },
        () => renderSummary(design),
      );
    },
    (zoneId, plantId) => {
      const zone = zones.find((z) => z.id === zoneId);
      if (!zone?.plants) return;
      zone.plants = zone.plants.filter((p) => p.plantId !== plantId);
      design.updatedAt = new Date().toISOString();
      saveDesign(design);
      renderSummary(design);
    },
    () => renderShoppingListView(design),
  );
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
