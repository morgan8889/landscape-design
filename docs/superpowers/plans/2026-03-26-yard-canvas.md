# Yard Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build the foundational yard canvas: address search, satellite map view, polygon boundary drawing, area/perimeter calculation, save/export, and image upload fallback.

**Architecture:** Vanilla TypeScript with Mapbox GL JS for satellite rendering and geocoding. Four focused modules: address search, map view, boundary drawer (polygon tool), and yard summary. Data stored in localStorage, exportable as JSON. Image upload fallback when Mapbox is unavailable.

**Tech Stack:** TypeScript, Vite, Mapbox GL JS v3, Vitest, Playwright

---

## File Structure

```
src/
  types.ts                      # YardDesign interface, shared types
  main.ts                       # App bootstrap, state management
  main.test.ts                  # Bootstrap tests
  style.css                     # App styles
  geo/
    project.ts                  # Lat/lng to local meter projection
    area.ts                     # Shoelace formula for polygon area
    area.test.ts                # Unit tests for area calculation
    perimeter.ts                # Haversine distance for perimeter
    perimeter.test.ts           # Unit tests for perimeter
  components/
    address-search.ts           # Address input + Mapbox geocoding
    address-search.test.ts      # Unit tests (mocked fetch)
    map-view.ts                 # Mapbox GL JS map wrapper
    boundary-drawer.ts          # Click-to-place polygon tool
    yard-summary.ts             # Results display + save/export
    yard-summary.test.ts        # Unit tests for formatting/download
    image-fallback.ts           # Image upload fallback when map unavailable
    image-fallback.test.ts      # Unit tests for scale calculation
  storage/
    local-store.ts              # localStorage read/write for YardDesign
    local-store.test.ts         # Unit tests for storage
index.html                      # App shell
.env.example                    # VITE_MAPBOX_TOKEN placeholder
e2e/
  smoke.spec.ts                 # Homepage loads
  address-search.spec.ts        # Address search flow
```

---

## Task 1: Types and Data Model

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create the YardDesign type**

```typescript
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
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add YardDesign type and AppState"
```

---

## Task 2: Geo - Area Calculation (Shoelace Formula)

**Files:**
- Create: `src/geo/project.ts`
- Create: `src/geo/area.ts`
- Create: `src/geo/area.test.ts`

- [ ] **Step 1: Write the projection utility**

```typescript
// src/geo/project.ts
import type { LatLng } from "../types";

export function projectToMeters(
  vertices: LatLng[],
): { x: number; y: number }[] {
  const centLat =
    vertices.reduce((sum, v) => sum + v.lat, 0) / vertices.length;
  const centLng =
    vertices.reduce((sum, v) => sum + v.lng, 0) / vertices.length;

  const latToM = 111_320;
  const lngToM = 111_320 * Math.cos((centLat * Math.PI) / 180);

  return vertices.map((v) => ({
    x: (v.lng - centLng) * lngToM,
    y: (v.lat - centLat) * latToM,
  }));
}
```

- [ ] **Step 2: Write the failing test for area calculation**

```typescript
// src/geo/area.test.ts
import { describe, expect, it } from "vitest";
import { calculateAreaSqFt } from "./area";

describe("calculateAreaSqFt", () => {
  it("calculates area of a known rectangle", () => {
    const vertices = [
      { lat: 45.5, lng: -122.65 },
      { lat: 45.5, lng: -122.6496534 },
      { lat: 45.500274, lng: -122.6496534 },
      { lat: 45.500274, lng: -122.65 },
    ];
    const area = calculateAreaSqFt(vertices);
    expect(area).toBeGreaterThan(9800);
    expect(area).toBeLessThan(10200);
  });

  it("returns 0 for fewer than 3 vertices", () => {
    expect(calculateAreaSqFt([])).toBe(0);
    expect(calculateAreaSqFt([{ lat: 0, lng: 0 }])).toBe(0);
    expect(
      calculateAreaSqFt([
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
      ]),
    ).toBe(0);
  });

  it("returns positive area regardless of vertex winding order", () => {
    const cw = [
      { lat: 45.5, lng: -122.65 },
      { lat: 45.5, lng: -122.649 },
      { lat: 45.501, lng: -122.649 },
      { lat: 45.501, lng: -122.65 },
    ];
    const ccw = [...cw].reverse();
    expect(calculateAreaSqFt(cw)).toBeCloseTo(calculateAreaSqFt(ccw), 0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/geo/area.test.ts`
Expected: FAIL

- [ ] **Step 4: Write the implementation**

```typescript
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/geo/area.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/geo/project.ts src/geo/area.ts src/geo/area.test.ts
git commit -m "feat: add polygon area calculation with Shoelace formula"
```

---

## Task 3: Geo - Perimeter Calculation (Haversine)

**Files:**
- Create: `src/geo/perimeter.ts`
- Create: `src/geo/perimeter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/geo/perimeter.test.ts
import { describe, expect, it } from "vitest";
import { calculatePerimeterFt } from "./perimeter";

describe("calculatePerimeterFt", () => {
  it("calculates perimeter of a known rectangle", () => {
    const vertices = [
      { lat: 45.5, lng: -122.65 },
      { lat: 45.5, lng: -122.6496534 },
      { lat: 45.500274, lng: -122.6496534 },
      { lat: 45.500274, lng: -122.65 },
    ];
    const perimeter = calculatePerimeterFt(vertices);
    expect(perimeter).toBeGreaterThan(392);
    expect(perimeter).toBeLessThan(408);
  });

  it("returns 0 for fewer than 2 vertices", () => {
    expect(calculatePerimeterFt([])).toBe(0);
    expect(calculatePerimeterFt([{ lat: 0, lng: 0 }])).toBe(0);
  });

  it("includes the closing segment back to first vertex", () => {
    const triangle = [
      { lat: 45.5, lng: -122.65 },
      { lat: 45.5, lng: -122.649 },
      { lat: 45.501, lng: -122.6495 },
    ];
    const perimeter = calculatePerimeterFt(triangle);
    expect(perimeter).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/geo/perimeter.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/geo/perimeter.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/geo/perimeter.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/geo/perimeter.ts src/geo/perimeter.test.ts
git commit -m "feat: add polygon perimeter calculation with Haversine"
```

---

## Task 4: localStorage Persistence

**Files:**
- Create: `src/storage/local-store.ts`
- Create: `src/storage/local-store.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/storage/local-store.test.ts
import { afterEach, describe, expect, it } from "vitest";
import { loadDesign, saveDesign, exportDesignJson } from "./local-store";
import type { YardDesign } from "../types";

const STORAGE_KEY = "yard-design";

const sampleDesign: YardDesign = {
  id: "test-123",
  address: "123 Oak St, Portland, OR",
  center: { lat: 45.5, lng: -122.65 },
  boundary: [
    { lat: 45.5, lng: -122.65 },
    { lat: 45.5, lng: -122.649 },
    { lat: 45.501, lng: -122.649 },
    { lat: 45.501, lng: -122.65 },
  ],
  areaSqFt: 2400,
  perimeterFt: 196,
  usdaZone: "8b",
  createdAt: "2026-03-26T00:00:00Z",
  updatedAt: "2026-03-26T00:00:00Z",
};

afterEach(() => {
  localStorage.removeItem(STORAGE_KEY);
});

describe("saveDesign", () => {
  it("saves a design to localStorage", () => {
    saveDesign(sampleDesign);
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual(sampleDesign);
  });
});

describe("loadDesign", () => {
  it("returns null when nothing is saved", () => {
    expect(loadDesign()).toBeNull();
  });

  it("returns the saved design", () => {
    saveDesign(sampleDesign);
    expect(loadDesign()).toEqual(sampleDesign);
  });
});

describe("exportDesignJson", () => {
  it("returns a JSON string of the design", () => {
    const json = exportDesignJson(sampleDesign);
    expect(JSON.parse(json)).toEqual(sampleDesign);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/storage/local-store.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/storage/local-store.ts
import type { YardDesign } from "../types";

const STORAGE_KEY = "yard-design";

export function saveDesign(design: YardDesign): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
}

export function loadDesign(): YardDesign | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as YardDesign;
}

export function exportDesignJson(design: YardDesign): string {
  return JSON.stringify(design, null, 2);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/storage/local-store.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/storage/local-store.ts src/storage/local-store.test.ts
git commit -m "feat: add localStorage persistence for YardDesign"
```

---

## Task 5: AddressSearch Component

**Files:**
- Create: `src/components/address-search.ts`
- Create: `src/components/address-search.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/address-search.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { geocodeAddress } from "./address-search";

describe("geocodeAddress", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns coordinates and address on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [
              {
                center: [-122.65, 45.5],
                place_name: "123 Oak St, Portland, OR 97201",
              },
            ],
          }),
      }),
    );

    const result = await geocodeAddress("123 Oak St", "fake-token");
    expect(result).toEqual({
      lat: 45.5,
      lng: -122.65,
      address: "123 Oak St, Portland, OR 97201",
    });
  });

  it("returns null when no results found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ features: [] }),
      }),
    );

    const result = await geocodeAddress("zzzznotanaddress", "fake-token");
    expect(result).toBeNull();
  });

  it("returns null on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    const result = await geocodeAddress("123 Oak St", "fake-token");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/address-search.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/components/address-search.ts
interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
}

export async function geocodeAddress(
  query: string,
  mapboxToken: string,
): Promise<GeocodeResult | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=1`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.features || data.features.length === 0) return null;

    const feature = data.features[0];
    return {
      lng: feature.center[0],
      lat: feature.center[1],
      address: feature.place_name,
    };
  } catch {
    return null;
  }
}

export function renderAddressSearch(
  container: HTMLElement,
  onResult: (result: GeocodeResult) => void,
  onFallback: () => void,
  mapboxToken: string,
): void {
  const wrapper = document.createElement("div");
  wrapper.className = "address-search";

  const h1 = document.createElement("h1");
  h1.textContent = "Design Your Yard";

  const subtitle = document.createElement("p");
  subtitle.className = "subtitle";
  subtitle.textContent = "Start by finding your property";

  const form = document.createElement("form");
  form.className = "search-form";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "search-input";
  input.placeholder = "123 Oak Street, Portland, OR";
  input.required = true;

  const button = document.createElement("button");
  button.type = "submit";
  button.className = "search-button";
  button.textContent = "Find My Yard";

  form.appendChild(input);
  form.appendChild(button);

  const error = document.createElement("p");
  error.className = "search-error";
  error.hidden = true;

  const fallbackP = document.createElement("p");
  fallbackP.className = "search-fallback";
  const fallbackBtn = document.createElement("button");
  fallbackBtn.type = "button";
  fallbackBtn.className = "fallback-link";
  fallbackBtn.textContent = "upload your own image";
  fallbackP.append("Or ", fallbackBtn);

  wrapper.append(h1, subtitle, form, error, fallbackP);
  container.textContent = "";
  container.appendChild(wrapper);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    error.hidden = true;
    button.disabled = true;
    button.textContent = "Searching...";

    const result = await geocodeAddress(query, mapboxToken);

    button.disabled = false;
    button.textContent = "Find My Yard";

    if (result) {
      onResult(result);
    } else {
      error.textContent =
        "Address not found. Please try again or upload an image.";
      error.hidden = false;
    }
  });

  fallbackBtn.addEventListener("click", onFallback);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/address-search.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/address-search.ts src/components/address-search.test.ts
git commit -m "feat: add AddressSearch component with Mapbox geocoding"
```

---

## Task 6: MapView Component

**Files:**
- Create: `src/components/map-view.ts`

Mapbox GL JS requires a real DOM and WebGL. This thin wrapper is tested via E2E in Task 10.

- [ ] **Step 1: Write the MapView wrapper**

```typescript
// src/components/map-view.ts
import type { LatLng } from "../types";

export interface MapViewHandle {
  map: import("mapbox-gl").Map;
  container: HTMLElement;
}

export async function createMapView(
  container: HTMLElement,
  center: LatLng,
  token: string,
  onMapFailed: () => void,
): Promise<MapViewHandle | null> {
  const wrapper = document.createElement("div");
  wrapper.className = "map-container";

  const mapEl = document.createElement("div");
  mapEl.className = "map-element";
  mapEl.style.width = "100%";
  mapEl.style.height = "100%";

  const loading = document.createElement("div");
  loading.className = "map-loading";
  loading.textContent = "Loading satellite view...";

  wrapper.append(mapEl, loading);
  container.textContent = "";
  container.appendChild(wrapper);

  try {
    const mb = await import("mapbox-gl");
    (mb as any).accessToken = token;

    if (!document.querySelector('link[href*="mapbox-gl"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css";
      document.head.appendChild(link);
    }

    const map = new mb.Map({
      container: mapEl,
      style: "mapbox://styles/mapbox/satellite-v9",
      center: [center.lng, center.lat],
      zoom: 18,
    });

    return new Promise((resolve) => {
      map.on("load", () => {
        loading.hidden = true;
        resolve({ map, container });
      });

      map.on("error", () => {
        loading.textContent = "Failed to load map.";
        onMapFailed();
        resolve(null);
      });
    });
  } catch {
    onMapFailed();
    return null;
  }
}
```

- [ ] **Step 2: Install mapbox-gl dependency**

Run: `npm install mapbox-gl`

- [ ] **Step 3: Add mapbox-gl types**

Run: `npm install -D @types/mapbox-gl`

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/map-view.ts package.json package-lock.json
git commit -m "feat: add MapView component with Mapbox GL JS"
```

---

## Task 7: BoundaryDrawer Component

**Files:**
- Create: `src/components/boundary-drawer.ts`

Depends on Mapbox GL JS map instance. Tested via E2E.

- [ ] **Step 1: Write the BoundaryDrawer**

```typescript
// src/components/boundary-drawer.ts
import type { LatLng } from "../types";

export interface BoundaryDrawerHandle {
  getVertices(): LatLng[];
  clear(): void;
  destroy(): void;
}

export function createBoundaryDrawer(
  map: import("mapbox-gl").Map,
  onClosed: (vertices: LatLng[]) => void,
): BoundaryDrawerHandle {
  const vertices: LatLng[] = [];
  const markers: import("mapbox-gl").Marker[] = [];
  const sourceId = "boundary-source";
  const fillLayerId = "boundary-fill";
  const lineLayerId = "boundary-line";

  map.addSource(sourceId, {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[]] },
      properties: {},
    },
  });

  map.addLayer({
    id: fillLayerId,
    type: "fill",
    source: sourceId,
    paint: { "fill-color": "#3b82f6", "fill-opacity": 0.15 },
  });

  map.addLayer({
    id: lineLayerId,
    type: "line",
    source: sourceId,
    paint: {
      "line-color": "#3b82f6",
      "line-width": 2,
      "line-dasharray": [2, 1],
    },
  });

  const toolbar = document.createElement("div");
  toolbar.className = "draw-toolbar";

  const instructions = document.createElement("div");
  instructions.className = "draw-instructions";
  instructions.textContent =
    "Click corners of your yard to trace the boundary";

  const actions = document.createElement("div");
  actions.className = "draw-actions";

  const undoBtn = document.createElement("button");
  undoBtn.className = "draw-undo";
  undoBtn.textContent = "Undo";
  undoBtn.disabled = true;

  const clearBtn = document.createElement("button");
  clearBtn.className = "draw-clear";
  clearBtn.textContent = "Clear";
  clearBtn.disabled = true;

  actions.append(undoBtn, clearBtn);

  const countDisplay = document.createElement("div");
  countDisplay.className = "draw-count";
  countDisplay.textContent = "Points: 0";

  toolbar.append(instructions, actions, countDisplay);
  map.getContainer().appendChild(toolbar);

  function updatePolygon(): void {
    const coords = vertices.map((v) => [v.lng, v.lat]);
    if (coords.length >= 3) {
      coords.push(coords[0]);
    }
    const source = map.getSource(
      sourceId,
    ) as import("mapbox-gl").GeoJSONSource;
    source.setData({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: coords.length >= 3 ? [coords] : [[]],
      },
      properties: {},
    });
    undoBtn.disabled = vertices.length === 0;
    clearBtn.disabled = vertices.length === 0;
    countDisplay.textContent = `Points: ${vertices.length}`;
  }

  async function addVertex(lngLat: {
    lng: number;
    lat: number;
  }): Promise<void> {
    const mb = await import("mapbox-gl");
    const vertex: LatLng = { lat: lngLat.lat, lng: lngLat.lng };
    vertices.push(vertex);

    const el = document.createElement("div");
    el.className = "vertex-marker";

    const marker = new mb.Marker({ element: el })
      .setLngLat([vertex.lng, vertex.lat])
      .addTo(map);

    if (vertices.length > 1) {
      el.addEventListener("click", (e) => {
        if (markers.indexOf(marker) === 0 && vertices.length >= 3) {
          e.stopPropagation();
          closePolygon();
        }
      });
    }

    markers.push(marker);
    updatePolygon();
  }

  function closePolygon(): void {
    map.off("click", onMapClick);
    map.off("dblclick", onMapDblClick);
    instructions.textContent = "Boundary complete!";
    onClosed([...vertices]);
  }

  function onMapClick(e: import("mapbox-gl").MapMouseEvent): void {
    addVertex(e.lngLat);
  }

  function onMapDblClick(e: import("mapbox-gl").MapMouseEvent): void {
    e.preventDefault();
    if (vertices.length >= 3) {
      closePolygon();
    }
  }

  map.on("click", onMapClick);
  map.on("dblclick", onMapDblClick);
  map.doubleClickZoom.disable();

  undoBtn.addEventListener("click", () => {
    if (vertices.length === 0) return;
    vertices.pop();
    const marker = markers.pop();
    marker?.remove();
    updatePolygon();
  });

  clearBtn.addEventListener("click", () => {
    vertices.length = 0;
    for (const m of markers) m.remove();
    markers.length = 0;
    updatePolygon();
  });

  return {
    getVertices: () => [...vertices],
    clear() {
      clearBtn.click();
    },
    destroy() {
      map.off("click", onMapClick);
      map.off("dblclick", onMapDblClick);
      for (const m of markers) m.remove();
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      toolbar.remove();
    },
  };
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/boundary-drawer.ts
git commit -m "feat: add BoundaryDrawer click-to-place polygon tool"
```

---

## Task 8: YardSummary Component

**Files:**
- Create: `src/components/yard-summary.ts`
- Create: `src/components/yard-summary.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/yard-summary.test.ts
import { describe, expect, it, vi } from "vitest";
import {
  formatArea,
  formatPerimeter,
  triggerJsonDownload,
} from "./yard-summary";

describe("formatArea", () => {
  it("formats area with commas and unit", () => {
    expect(formatArea(2400)).toBe("2,400 sq ft");
  });

  it("rounds to nearest integer", () => {
    expect(formatArea(2400.7)).toBe("2,401 sq ft");
  });
});

describe("formatPerimeter", () => {
  it("formats perimeter with unit", () => {
    expect(formatPerimeter(196)).toBe("196 ft");
  });

  it("rounds to nearest integer", () => {
    expect(formatPerimeter(196.4)).toBe("196 ft");
  });
});

describe("triggerJsonDownload", () => {
  it("creates a download link with correct content", () => {
    const clickSpy = vi.fn();
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue({
        href: "",
        download: "",
        click: clickSpy,
      } as any);
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:fake");
    const revokeObjectURLSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});

    triggerJsonDownload('{"test":true}', "design.json");

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:fake");

    createElementSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/yard-summary.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/components/yard-summary.ts
import type { YardDesign } from "../types";
import { saveDesign, exportDesignJson } from "../storage/local-store";

export function formatArea(sqFt: number): string {
  return `${Math.round(sqFt).toLocaleString("en-US")} sq ft`;
}

export function formatPerimeter(ft: number): string {
  return `${Math.round(ft)} ft`;
}

export function triggerJsonDownload(json: string, filename: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function renderYardSummary(
  container: HTMLElement,
  design: YardDesign,
  onEdit: () => void,
): void {
  const wrapper = document.createElement("div");
  wrapper.className = "yard-summary";

  const h2 = document.createElement("h2");
  h2.textContent = design.address;

  const grid = document.createElement("div");
  grid.className = "summary-grid";

  const cards = [
    { label: "Total Area", value: formatArea(design.areaSqFt) },
    { label: "Perimeter", value: formatPerimeter(design.perimeterFt) },
    { label: "Points", value: String(design.boundary.length) },
    { label: "USDA Zone", value: design.usdaZone ?? "Unknown" },
  ];

  for (const card of cards) {
    const cardEl = document.createElement("div");
    cardEl.className = "summary-card";
    const label = document.createElement("div");
    label.className = "summary-label";
    label.textContent = card.label;
    const value = document.createElement("div");
    value.className = "summary-value";
    value.textContent = card.value;
    cardEl.append(label, value);
    grid.appendChild(cardEl);
  }

  const actions = document.createElement("div");
  actions.className = "summary-actions";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn-primary save-btn";
  saveBtn.textContent = "Save Design";

  const exportBtn = document.createElement("button");
  exportBtn.className = "btn btn-secondary export-btn";
  exportBtn.textContent = "Export JSON";

  const editBtn = document.createElement("button");
  editBtn.className = "btn btn-secondary edit-btn";
  editBtn.textContent = "Edit Boundary";

  actions.append(saveBtn, exportBtn, editBtn);

  const status = document.createElement("p");
  status.className = "save-status";
  status.hidden = true;

  wrapper.append(h2, grid, actions, status);
  container.textContent = "";
  container.appendChild(wrapper);

  saveBtn.addEventListener("click", () => {
    saveDesign(design);
    status.textContent = "Design saved!";
    status.hidden = false;
    setTimeout(() => {
      status.hidden = true;
    }, 2000);
  });

  exportBtn.addEventListener("click", () => {
    const json = exportDesignJson(design);
    triggerJsonDownload(json, `yard-design-${design.id}.json`);
  });

  editBtn.addEventListener("click", onEdit);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/yard-summary.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/yard-summary.ts src/components/yard-summary.test.ts
git commit -m "feat: add YardSummary component with save and export"
```

---

## Task 9: App Bootstrap and Styles

**Files:**
- Modify: `src/main.ts`
- Modify: `src/main.test.ts`
- Create: `src/style.css`
- Create: `.env.example`

- [ ] **Step 1: Create the CSS file**

Write `src/style.css` with styles for address-search, map-container, draw-toolbar, vertex-marker, yard-summary, summary-grid, summary-card, and button classes. Dark theme with `--blue: #3b82f6`, `--bg: #0f0f1a`, `--surface: #1a1a2e`.

- [ ] **Step 2: Rewrite main.ts as app orchestrator**

```typescript
// src/main.ts
import "./style.css";
import type { AppState, LatLng, YardDesign } from "./types";
import {
  geocodeAddress,
  renderAddressSearch,
} from "./components/address-search";
import { createMapView } from "./components/map-view";
import { createBoundaryDrawer } from "./components/boundary-drawer";
import { renderYardSummary } from "./components/yard-summary";
import { calculateAreaSqFt } from "./geo/area";
import { calculatePerimeterFt } from "./geo/perimeter";
import { loadDesign } from "./storage/local-store";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

function getApp(): HTMLElement {
  return document.getElementById("app")!;
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
    (result) =>
      renderMap({ lat: result.lat, lng: result.lng }, result.address),
    () => {
      /* image upload fallback handled in Task 12 */
    },
    MAPBOX_TOKEN,
  );
}

async function renderMap(center: LatLng, address: string): Promise<void> {
  const app = getApp();

  const handle = await createMapView(app, center, MAPBOX_TOKEN!, () => {
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
    renderMap(design.center, design.address);
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
```

- [ ] **Step 3: Update main.test.ts**

```typescript
// src/main.test.ts
import { describe, expect, it, vi } from "vitest";
import { lookupUsdaZone } from "./main";

describe("lookupUsdaZone", () => {
  it("returns zone on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ zone: "8b" }),
      }),
    );
    const zone = await lookupUsdaZone(45.5, -122.65);
    expect(zone).toBe("8b");
    vi.restoreAllMocks();
  });

  it("returns null on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );
    const zone = await lookupUsdaZone(45.5, -122.65);
    expect(zone).toBeNull();
    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 4: Create .env.example**

```
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

- [ ] **Step 5: Run all unit tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 6: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/main.ts src/main.test.ts src/style.css .env.example
git commit -m "feat: wire up app bootstrap with address, map, summary flow"
```

---

## Task 10: E2E Tests

**Files:**
- Modify: `e2e/smoke.spec.ts`
- Create: `e2e/address-search.spec.ts`

- [ ] **Step 1: Update smoke test**

```typescript
// e2e/smoke.spec.ts
import { expect, test } from "@playwright/test";

test("homepage loads with address search", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".address-search")).toBeVisible();
  await expect(page.locator(".search-input")).toBeVisible();
});
```

- [ ] **Step 2: Write address search E2E test**

```typescript
// e2e/address-search.spec.ts
import { expect, test } from "@playwright/test";

test("shows error when address is not found", async ({ page }) => {
  await page.goto("/");
  await page.fill(".search-input", "zzzznotanaddress");
  await page.click(".search-button");
  await expect(page.locator(".search-error")).toBeVisible({ timeout: 10000 });
});

test("address input is required", async ({ page }) => {
  await page.goto("/");
  await page.click(".search-button");
  await expect(page.locator(".search-error")).toBeHidden();
});
```

- [ ] **Step 3: Create .env file with Mapbox token**

Developer creates `.env` with their real Mapbox token:

```bash
echo "VITE_MAPBOX_TOKEN=pk.your_real_token" > .env
```

- [ ] **Step 4: Run E2E tests**

Run: `npx playwright test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/smoke.spec.ts e2e/address-search.spec.ts
git commit -m "test: add E2E tests for homepage and address search"
```

---

## Task 11: Browser Verification and Final Polish

- [ ] **Step 1: Start dev server and verify in browser**

Run: `npm run dev`
Navigate to http://localhost:5173. Verify address search renders with dark theme.

- [ ] **Step 2: Test full flow with real Mapbox token**

Enter a real address. Verify satellite map loads, drawing works, summary shows calculations.

- [ ] **Step 3: Run full test suite**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: ALL PASS

- [ ] **Step 4: Take screenshots for PR**

Use Playwright to capture search view, map view, and summary view.

- [ ] **Step 5: Commit any polish**

```bash
git add -A
git commit -m "polish: final UI adjustments from browser verification"
```

---

## Summary

| Task | What | Tests |
|------|------|-------|
| 1 | Types/data model | Type check |
| 2 | Area calculation | 3 unit tests |
| 3 | Perimeter calculation | 3 unit tests |
| 4 | localStorage persistence | 4 unit tests |
| 5 | AddressSearch component | 3 unit tests |
| 6 | MapView component | Type check (E2E later) |
| 7 | BoundaryDrawer component | Type check (E2E later) |
| 8 | YardSummary component | 5 unit tests |
| 9 | App bootstrap + styles | 2 unit tests + type check |
| 10 | E2E tests | 3 E2E tests |
| 11 | Browser verification | Manual + screenshot |

**Total:** 11 tasks, 23 unit tests, 3 E2E tests, full type coverage.
