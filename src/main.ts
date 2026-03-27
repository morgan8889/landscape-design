// src/main.ts
import "./style.css";
import { renderAddressSearch } from "./components/address-search";
import { createBoundaryDrawer } from "./components/boundary-drawer";
import { createMapView } from "./components/map-view";
import { renderYardSummary } from "./components/yard-summary";
import { calculateAreaSqFt } from "./geo/area";
import { calculatePerimeterFt } from "./geo/perimeter";
import { loadDesign } from "./storage/local-store";
import type { LatLng, YardDesign } from "./types";

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
    const msg = document.createElement("div");
    msg.className = "address-search";
    const h1 = document.createElement("h1");
    h1.textContent = "Design Your Yard";
    const p = document.createElement("p");
    p.className = "subtitle";
    p.textContent =
      "Mapbox token not configured. Set VITE_MAPBOX_TOKEN in .env";
    msg.append(h1, p);
    app.textContent = "";
    app.appendChild(msg);
    return;
  }

  renderAddressSearch(
    app,
    (result) => renderMap({ lat: result.lat, lng: result.lng }, result.address),
    () => {
      /* image upload fallback — future task */
    },
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

function renderSummary(design: YardDesign): void {
  const app = getApp();
  renderYardSummary(app, design, () => {
    void renderMap(design.center, design.address);
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
