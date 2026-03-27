# Yard Canvas — P1 Feature Design

**Date**: 2026-03-26
**Status**: Approved
**Constitution version**: 1.0.0

## Purpose

The Yard Canvas is the foundational feature of the landscape design app. It lets a homeowner type their address, see their property on a satellite view, trace their yard boundary, and get area/perimeter calculations. This is the surface that all future features (garden beds, plant placement, hardscape, cost estimation) build on.

## User Scenario

**Persona**: Sam, a homeowner who just bought a house and wants to plan a backyard redesign.

**Flow**:
1. Sam opens the app and sees an address search box.
2. Sam types "123 Oak Street, Portland, OR" and clicks "Find My Yard."
3. The app geocodes the address and shows a satellite view centered on Sam's property.
4. Sam clicks the corners of their backyard fence to trace the boundary (4-6 clicks).
5. Sam closes the polygon by clicking the first point (or double-clicking).
6. The app displays: total area (2,400 sq ft), perimeter (196 ft), and USDA hardiness zone (8b).
7. Sam clicks "Save Design" — it persists in the browser. Sam can also export as JSON.

**Fallback scenario**: If the map fails to load, Sam sees an "Upload Image" option. Sam uploads a Google Maps screenshot, enters a scale reference ("my yard is about 60 feet wide"), and traces on the image instead.

## Data Model

```typescript
interface YardDesign {
  id: string;                    // UUID v4
  address: string;               // Formatted address from geocoder
  center: { lat: number; lng: number };
  boundary: { lat: number; lng: number }[]; // Polygon vertices, ordered
  areaSqFt: number;              // Calculated via Shoelace formula
  perimeterFt: number;           // Sum of segment distances
  usdaZone: string | null;       // Looked up from coordinates, null if unavailable
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

Stored in `localStorage` under key `yard-design`. One design at a time for P1. Exported as a `.json` file containing the `YardDesign` object.

For the image-upload fallback, boundary points are stored as pixel coordinates with a `scale` field (pixels per foot), and `center`/`usdaZone` are null.

## Components

### AddressSearch
- Text input with submit button.
- Calls Mapbox Geocoding API (`/geocoding/v5/mapbox.places/{query}.json`).
- On success: passes `{ lat, lng, address }` to MapView.
- On error: displays inline error message. Shows "Upload Image" fallback link.
- No autocomplete/typeahead for P1 — just search on submit.

### MapView
- Mapbox GL JS map with `mapbox://styles/mapbox/satellite-v9` style.
- Centers on geocoded coordinates at zoom ~18 (house-level).
- Standard zoom/pan controls.
- Hosts the BoundaryDrawer layer on top.
- On Mapbox load failure: switches to image-upload fallback automatically.

### BoundaryDrawer
- Click-to-place polygon drawing tool.
- Each click adds a vertex (blue dot with white border).
- Lines drawn between consecutive vertices (dashed blue).
- Semi-transparent blue fill on the polygon interior.
- Close the polygon by: clicking the first vertex, or double-clicking.
- "Undo" button removes the last placed vertex.
- "Clear" button removes all vertices and starts over.
- While drawing, displays running vertex count.

### YardSummary
- Shown after polygon is closed.
- Displays: address, total area (sq ft), perimeter (ft), vertex count, USDA zone.
- "Save Design" button — writes to localStorage.
- "Export JSON" button — triggers browser download of the YardDesign as a `.json` file.
- "Edit Boundary" button — reopens the polygon for adjustment.

## Calculations

### Area (Shoelace Formula)
Vertices are projected from lat/lng to a local flat coordinate system (meters from centroid) before applying the Shoelace formula. Result converted to square feet.

```
A = 0.5 * |Σ(x_i * y_{i+1} - x_{i+1} * y_i)|
```

This is accurate for yard-scale polygons (error < 0.1% for areas under 10 acres).

### Perimeter
Sum of Haversine distances between consecutive vertices, converted to feet.

### USDA Zone
Looked up from coordinates via the USDA PHZM API (`https://phzmapi.org/{lat}/{lng}.json`). Free, no API key required. If unavailable, display "Unknown" — never fabricate zone data.

## Technology

- **Mapbox GL JS v3** — satellite tiles, geocoding, map rendering. Free tier: 50k map loads/month.
- **Vanilla TypeScript** — no framework. DOM manipulation for the 4 components. The app is small enough that a framework adds unjustified complexity.
- **Vite** — already configured in the scaffold. Handles bundling and dev server.
- **localStorage** — persistence. No backend for P1.

### Mapbox API Key
Stored in an environment variable (`VITE_MAPBOX_TOKEN`). The Vite build injects it at build time. Added to `.env.example` (not `.env` — that's gitignored).

## Fallback: Image Upload Mode

When Mapbox is unavailable (load failure, no API key, network error):

1. App shows "Upload an image of your yard" with a file drop zone.
2. User uploads a JPG/PNG (satellite screenshot, drone photo, survey scan).
3. Image displays in the same canvas area as the map would.
4. User enters a scale reference: "Width of this image represents ___ feet."
5. BoundaryDrawer works identically — click to place vertices on the image.
6. Area/perimeter calculated using pixel coordinates scaled to feet.
7. `center` and `usdaZone` are null in the saved design.

This satisfies the constitution's requirement for graceful degradation.

## What's NOT in P1

- Multiple designs / project list
- Garden beds, plants, hardscape elements
- Cost estimation
- Full undo/redo history (only "undo last point" during drawing)
- Mobile-optimized touch interactions
- Sharing / collaboration
- Autocomplete/typeahead on address search
- Editing individual vertices after polygon is closed (only "Edit Boundary" which clears and redraws)

## Success Criteria

1. User can enter an address and see a satellite view of their property.
2. User can trace a polygon boundary on the satellite view by clicking vertices.
3. Area and perimeter are calculated and displayed accurately (within 1% of manual measurement).
4. Design persists across browser sessions via localStorage.
5. Design can be exported as a JSON file.
6. App remains functional when Mapbox is unavailable (image upload fallback).
7. All acceptance scenarios have passing automated tests.
