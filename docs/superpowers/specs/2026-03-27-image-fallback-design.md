# Image Upload Fallback — Feature Design

**Date**: 2026-03-27
**Status**: Approved
**Depends on**: Yard Canvas P1 (merged)

## Purpose

When Mapbox is unavailable (no API key, network error, rate limited) or when the user prefers their own image, they can upload a photo/screenshot of their yard and trace on it. This satisfies the constitution's graceful degradation requirement.

## User Scenario

**Persona**: Sam can't get a Mapbox token, or prefers to use a drone photo of their yard.

**Flow**:
1. Sam clicks "upload your own image" on the address search page (or Mapbox fails and the fallback triggers automatically).
2. A file drop zone appears. Sam drops a JPG/PNG (Google Maps screenshot, drone photo, survey scan).
3. The image displays full-width in the canvas area.
4. **Calibration**: Sam clicks two points on the image (e.g., two fence posts) and enters the real-world distance between them ("40 feet"). The app calculates pixels-per-foot.
5. Sam traces the yard boundary by clicking vertices on the image — same interaction as the map view.
6. The summary shows area and perimeter in square feet / feet, calculated from pixel coordinates scaled by the calibration. `center` and `usdaZone` are null (displayed as "N/A" and "Unknown").
7. Sam saves the design and exports as JSON.

## Data Model

Add optional `imageMode` to `YardDesign`:

```typescript
interface ImageMode {
  imageDataUrl: string;
  pixelsPerFoot: number;
  calibrationPoints: [{ x: number; y: number }, { x: number; y: number }];
  calibrationDistanceFt: number;
}
```

When `imageMode` is present:
- `boundary` stores pixel coordinates as `{ lat: pixelY, lng: pixelX }` (reuses LatLng type)
- `center` is `{ lat: 0, lng: 0 }` (placeholder)
- `usdaZone` is null
- `address` is "Uploaded image"
- Area uses Shoelace formula on pixel coords, divided by `pixelsPerFoot²`
- Perimeter uses pixel distances divided by `pixelsPerFoot`

## Components

### ImageUpload
- File input with drag-and-drop zone
- Accepts `.jpg`, `.jpeg`, `.png`
- Reads file as data URL via `FileReader`
- Validates file type and shows error for unsupported formats
- Displays uploaded image in the canvas area
- Passes data URL to parent on successful upload

### CalibrationTool
- Overlays on the uploaded image
- User clicks two points — each shown as a numbered marker (1, 2)
- A line drawn between the two points
- Text input appears: "Distance between these points: ___ feet"
- Submit calculates `pixelsPerFoot = pixelDistance / feetEntered`
- Validates: distance must be > 0, both points must be placed
- "Reset" button to clear calibration and start over

### ImageBoundaryDrawer
- Same interaction as BoundaryDrawer (click to place vertices, double-click or click first to close)
- Renders on the image using absolute-positioned HTML/SVG overlay (not Mapbox layers)
- Vertices shown as blue dots, lines as dashed blue SVG paths
- Semi-transparent blue fill on closed polygon
- Undo and Clear buttons
- On close, passes pixel-coordinate vertices to parent

### Area/Perimeter (Image Mode)

```
pixelDistance(a, b) = sqrt((b.x - a.x)² + (b.y - a.y)²)

perimeterFt = sum(pixelDistance(v[i], v[i+1])) / pixelsPerFoot

areaSqFt = shoelaceArea(pixelCoords) / (pixelsPerFoot²)
```

No geo projection needed — pure pixel math.

## Integration with Existing Code

- `renderAddressSearch` already has an `onFallback` callback — wire it to `renderImageUpload`
- `createMapView` already calls `onMapFailed` — wire it to `renderImageUpload`
- `renderYardSummary` works as-is — just receives a `YardDesign` with null usdaZone
- `saveDesign` / `loadDesign` / `exportDesignJson` work as-is — `imageMode` field is just extra data in the JSON
- The "Edit Boundary" button in summary should return to image view (not map) when `imageMode` is present

## What's NOT Included

- Image editing (crop, rotate, brightness adjustment)
- Multiple calibration measurements (averaging)
- Server-side image storage (stays in localStorage as data URL)
- Automatic scale detection from image metadata

## Success Criteria

1. User can upload a JPG/PNG image and see it displayed
2. User can calibrate by clicking two points and entering a distance
3. User can trace a polygon boundary on the image
4. Area and perimeter are calculated correctly using pixel-to-feet scaling
5. Design saves and loads correctly with image data
6. Export JSON includes the image data URL and calibration info
7. "Edit Boundary" returns to image view (not map) for image-based designs
8. Fallback triggers automatically when Mapbox fails
