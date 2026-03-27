# Image Upload Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add image upload fallback so the app works without Mapbox — user uploads a photo, calibrates scale with two points, traces boundary, gets area/perimeter.

**Architecture:** Three new components (ImageUpload, CalibrationTool, ImageBoundaryDrawer) plus pixel-based geo calculations. Integrates via the existing `onFallback` callback in AddressSearch and `onMapFailed` in MapView. The existing YardDesign type gets an optional `imageMode` field.

**Tech Stack:** TypeScript, Vite, Vitest, Playwright (existing stack — no new dependencies)

---

## File Structure

```
src/
  types.ts                          # Modify: add ImageMode interface
  main.ts                           # Modify: wire fallback flow
  geo/
    pixel-area.ts                   # Create: Shoelace on pixel coords / pixelsPerFoot²
    pixel-area.test.ts              # Create: unit tests
    pixel-perimeter.ts              # Create: pixel distance / pixelsPerFoot
    pixel-perimeter.test.ts         # Create: unit tests
    calibration.ts                  # Create: pixelsPerFoot from two points + distance
    calibration.test.ts             # Create: unit tests
  components/
    image-upload.ts                 # Create: file drop zone, read as data URL
    image-upload.test.ts            # Create: unit tests for validation
    calibration-tool.ts             # Create: click two points, enter distance
    image-boundary-drawer.ts        # Create: SVG overlay polygon drawing on image
  style.css                         # Modify: add styles for new components
e2e/
  image-fallback.spec.ts            # Create: E2E tests for upload flow
```

---

## Task 1: Add ImageMode to Types

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add ImageMode interface and update YardDesign**

```typescript
// Add to src/types.ts

export interface Point {
  x: number;
  y: number;
}

export interface ImageMode {
  imageDataUrl: string;
  pixelsPerFoot: number;
  calibrationPoints: [Point, Point];
  calibrationDistanceFt: number;
}

// Add to YardDesign interface:
//   imageMode?: ImageMode;
```

Add `imageMode?: ImageMode;` to the `YardDesign` interface after `updatedAt`.

Also add to `AppState`:
```typescript
  | { phase: "image-upload" }
  | { phase: "image-calibrating"; imageDataUrl: string }
  | { phase: "image-drawing"; imageDataUrl: string; pixelsPerFoot: number; calibrationPoints: [Point, Point]; calibrationDistanceFt: number }
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add ImageMode type and image-related AppState phases"
```

---

## Task 2: Pixel Area Calculation

**Files:**
- Create: `src/geo/pixel-area.ts`
- Create: `src/geo/pixel-area.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/geo/pixel-area.test.ts
import { describe, expect, it } from "vitest";
import { calculatePixelAreaSqFt } from "./pixel-area";
import type { Point } from "../types";

describe("calculatePixelAreaSqFt", () => {
  it("calculates area of a 100x100 pixel square at 10 px/ft", () => {
    const vertices: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    // 100x100 px = 10000 px², at 10 px/ft → 10000 / 100 = 100 sq ft
    const area = calculatePixelAreaSqFt(vertices, 10);
    expect(area).toBeCloseTo(100, 1);
  });

  it("returns 0 for fewer than 3 vertices", () => {
    expect(calculatePixelAreaSqFt([], 10)).toBe(0);
    expect(calculatePixelAreaSqFt([{ x: 0, y: 0 }], 10)).toBe(0);
  });

  it("returns positive area regardless of winding order", () => {
    const cw: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
    ];
    const ccw = [...cw].reverse();
    expect(calculatePixelAreaSqFt(cw, 5)).toBeCloseTo(
      calculatePixelAreaSqFt(ccw, 5),
      1,
    );
  });

  it("throws if pixelsPerFoot is zero", () => {
    const vertices: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(() => calculatePixelAreaSqFt(vertices, 0)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/geo/pixel-area.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/geo/pixel-area.ts
import type { Point } from "../types";

export function calculatePixelAreaSqFt(
  vertices: Point[],
  pixelsPerFoot: number,
): number {
  if (vertices.length < 3) return 0;
  if (pixelsPerFoot === 0) throw new Error("pixelsPerFoot must be non-zero");

  const n = vertices.length;
  let areaPixels = 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    areaPixels += vertices[i].x * vertices[j].y;
    areaPixels -= vertices[j].x * vertices[i].y;
  }

  areaPixels = Math.abs(areaPixels) / 2;
  return areaPixels / (pixelsPerFoot * pixelsPerFoot);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/geo/pixel-area.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/geo/pixel-area.ts src/geo/pixel-area.test.ts
git commit -m "feat: add pixel-based area calculation for image mode"
```

---

## Task 3: Pixel Perimeter Calculation

**Files:**
- Create: `src/geo/pixel-perimeter.ts`
- Create: `src/geo/pixel-perimeter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/geo/pixel-perimeter.test.ts
import { describe, expect, it } from "vitest";
import { calculatePixelPerimeterFt } from "./pixel-perimeter";
import type { Point } from "../types";

describe("calculatePixelPerimeterFt", () => {
  it("calculates perimeter of a 100x100 pixel square at 10 px/ft", () => {
    const vertices: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    // 4 sides * 100 px / 10 px/ft = 40 ft
    const perimeter = calculatePixelPerimeterFt(vertices, 10);
    expect(perimeter).toBeCloseTo(40, 1);
  });

  it("returns 0 for fewer than 2 vertices", () => {
    expect(calculatePixelPerimeterFt([], 10)).toBe(0);
    expect(calculatePixelPerimeterFt([{ x: 0, y: 0 }], 10)).toBe(0);
  });

  it("includes closing segment", () => {
    const triangle: Point[] = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 15, y: 20 },
    ];
    const perimeter = calculatePixelPerimeterFt(triangle, 1);
    // 30 + 25 + 25 = 80 (approx)
    expect(perimeter).toBeGreaterThan(70);
    expect(perimeter).toBeLessThan(90);
  });

  it("throws if pixelsPerFoot is zero", () => {
    const vertices: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(() => calculatePixelPerimeterFt(vertices, 0)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/geo/pixel-perimeter.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/geo/pixel-perimeter.ts
import type { Point } from "../types";

function pixelDistance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function calculatePixelPerimeterFt(
  vertices: Point[],
  pixelsPerFoot: number,
): number {
  if (vertices.length < 2) return 0;
  if (pixelsPerFoot === 0) throw new Error("pixelsPerFoot must be non-zero");

  let total = 0;
  for (let i = 0; i < vertices.length; i++) {
    const next = vertices[(i + 1) % vertices.length];
    total += pixelDistance(vertices[i], next);
  }
  return total / pixelsPerFoot;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/geo/pixel-perimeter.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/geo/pixel-perimeter.ts src/geo/pixel-perimeter.test.ts
git commit -m "feat: add pixel-based perimeter calculation for image mode"
```

---

## Task 4: Calibration Calculation

**Files:**
- Create: `src/geo/calibration.ts`
- Create: `src/geo/calibration.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/geo/calibration.test.ts
import { describe, expect, it } from "vitest";
import { calculatePixelsPerFoot } from "./calibration";
import type { Point } from "../types";

describe("calculatePixelsPerFoot", () => {
  it("calculates pixels per foot from two points and distance", () => {
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 100, y: 0 };
    // 100 pixels = 50 feet → 2 px/ft
    const ppf = calculatePixelsPerFoot(a, b, 50);
    expect(ppf).toBe(2);
  });

  it("works with diagonal distances", () => {
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 30, y: 40 };
    // pixel distance = 50, real distance = 25 ft → 2 px/ft
    const ppf = calculatePixelsPerFoot(a, b, 25);
    expect(ppf).toBe(2);
  });

  it("throws if distance is zero or negative", () => {
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 10, y: 0 };
    expect(() => calculatePixelsPerFoot(a, b, 0)).toThrow();
    expect(() => calculatePixelsPerFoot(a, b, -5)).toThrow();
  });

  it("throws if points are the same", () => {
    const a: Point = { x: 10, y: 10 };
    expect(() => calculatePixelsPerFoot(a, a, 50)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/geo/calibration.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/geo/calibration.ts
import type { Point } from "../types";

export function calculatePixelsPerFoot(
  a: Point,
  b: Point,
  distanceFt: number,
): number {
  if (distanceFt <= 0) throw new Error("Distance must be positive");

  const pixelDist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  if (pixelDist === 0) throw new Error("Calibration points must be different");

  return pixelDist / distanceFt;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/geo/calibration.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/geo/calibration.ts src/geo/calibration.test.ts
git commit -m "feat: add calibration calculation (pixels per foot)"
```

---

## Task 5: ImageUpload Component

**Files:**
- Create: `src/components/image-upload.ts`
- Create: `src/components/image-upload.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/image-upload.test.ts
import { describe, expect, it } from "vitest";
import { isValidImageType } from "./image-upload";

describe("isValidImageType", () => {
  it("accepts jpg", () => {
    expect(isValidImageType("image/jpeg")).toBe(true);
  });

  it("accepts png", () => {
    expect(isValidImageType("image/png")).toBe(true);
  });

  it("rejects gif", () => {
    expect(isValidImageType("image/gif")).toBe(false);
  });

  it("rejects pdf", () => {
    expect(isValidImageType("application/pdf")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidImageType("")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/image-upload.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/components/image-upload.ts

const VALID_TYPES = new Set(["image/jpeg", "image/png"]);

export function isValidImageType(mimeType: string): boolean {
  return VALID_TYPES.has(mimeType);
}

export function renderImageUpload(
  container: HTMLElement,
  onImageLoaded: (dataUrl: string) => void,
  onCancel: () => void,
): void {
  const wrapper = document.createElement("div");
  wrapper.className = "image-upload";

  const h2 = document.createElement("h2");
  h2.textContent = "Upload an Image of Your Yard";

  const subtitle = document.createElement("p");
  subtitle.className = "subtitle";
  subtitle.textContent =
    "Use a satellite screenshot, drone photo, or survey scan";

  const dropZone = document.createElement("div");
  dropZone.className = "drop-zone";

  const dropLabel = document.createElement("p");
  dropLabel.textContent = "Drag and drop an image here, or click to browse";
  dropLabel.className = "drop-label";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".jpg,.jpeg,.png";
  fileInput.className = "file-input";
  fileInput.hidden = true;

  const error = document.createElement("p");
  error.className = "upload-error";
  error.hidden = true;

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn btn-secondary";
  cancelBtn.textContent = "Back to address search";

  dropZone.append(dropLabel, fileInput);
  wrapper.append(h2, subtitle, dropZone, error, cancelBtn);
  container.textContent = "";
  container.appendChild(wrapper);

  function handleFile(file: File): void {
    if (!isValidImageType(file.type)) {
      error.textContent = "Please upload a JPG or PNG image.";
      error.hidden = false;
      return;
    }
    error.hidden = true;
    const reader = new FileReader();
    reader.onload = () => {
      onImageLoaded(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  dropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file);
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  });

  cancelBtn.addEventListener("click", onCancel);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/image-upload.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/image-upload.ts src/components/image-upload.test.ts
git commit -m "feat: add ImageUpload component with drag-and-drop"
```

---

## Task 6: CalibrationTool Component

**Files:**
- Create: `src/components/calibration-tool.ts`

This component depends on mouse events on an image — tested via E2E.

- [ ] **Step 1: Write the CalibrationTool**

```typescript
// src/components/calibration-tool.ts
import type { Point } from "../types";
import { calculatePixelsPerFoot } from "../geo/calibration";

export interface CalibrationResult {
  pixelsPerFoot: number;
  points: [Point, Point];
  distanceFt: number;
}

export function renderCalibrationTool(
  container: HTMLElement,
  imageDataUrl: string,
  onCalibrated: (result: CalibrationResult) => void,
  onCancel: () => void,
): void {
  const wrapper = document.createElement("div");
  wrapper.className = "calibration-wrapper";

  const imageContainer = document.createElement("div");
  imageContainer.className = "image-canvas";

  const img = document.createElement("img");
  img.src = imageDataUrl;
  img.className = "uploaded-image";
  img.draggable = false;

  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  overlay.classList.add("calibration-overlay");
  overlay.setAttribute("width", "100%");
  overlay.setAttribute("height", "100%");

  imageContainer.append(img, overlay);

  const instructions = document.createElement("div");
  instructions.className = "calibration-instructions";
  instructions.textContent = "Click two points on the image that you know the distance between";

  const distanceForm = document.createElement("div");
  distanceForm.className = "calibration-form";
  distanceForm.hidden = true;

  const distanceLabel = document.createElement("label");
  distanceLabel.textContent = "Distance between points (feet): ";
  const distanceInput = document.createElement("input");
  distanceInput.type = "number";
  distanceInput.className = "calibration-input";
  distanceInput.min = "1";
  distanceInput.step = "any";
  distanceInput.placeholder = "e.g. 40";
  const submitBtn = document.createElement("button");
  submitBtn.className = "btn btn-primary";
  submitBtn.textContent = "Set Scale";
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "btn btn-secondary";
  resetBtn.textContent = "Reset";

  distanceForm.append(distanceLabel, distanceInput, submitBtn, resetBtn);

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn btn-secondary calibration-cancel";
  cancelBtn.textContent = "Back";

  wrapper.append(imageContainer, instructions, distanceForm, cancelBtn);
  container.textContent = "";
  container.appendChild(wrapper);

  const points: Point[] = [];
  const markers: SVGCircleElement[] = [];
  let line: SVGLineElement | null = null;

  function getImagePoint(e: MouseEvent): Point {
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function getDisplayPoint(p: Point): { dx: number; dy: number } {
    const rect = img.getBoundingClientRect();
    const svgRect = overlay.getBoundingClientRect();
    const scaleX = rect.width / img.naturalWidth;
    const scaleY = rect.height / img.naturalHeight;
    return {
      dx: (rect.left - svgRect.left) + p.x * scaleX,
      dy: (rect.top - svgRect.top) + p.y * scaleY,
    };
  }

  function addMarker(p: Point, index: number): void {
    const dp = getDisplayPoint(p);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(dp.dx));
    circle.setAttribute("cy", String(dp.dy));
    circle.setAttribute("r", "8");
    circle.classList.add("calibration-marker");

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(dp.dx));
    label.setAttribute("y", String(dp.dy - 14));
    label.classList.add("calibration-label");
    label.textContent = String(index + 1);

    overlay.append(circle, label);
    markers.push(circle);
  }

  function drawLine(): void {
    if (points.length < 2) return;
    const dp1 = getDisplayPoint(points[0]);
    const dp2 = getDisplayPoint(points[1]);
    line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(dp1.dx));
    line.setAttribute("y1", String(dp1.dy));
    line.setAttribute("x2", String(dp2.dx));
    line.setAttribute("y2", String(dp2.dy));
    line.classList.add("calibration-line");
    overlay.appendChild(line);
  }

  function reset(): void {
    points.length = 0;
    while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
    markers.length = 0;
    line = null;
    distanceForm.hidden = true;
    distanceInput.value = "";
    instructions.textContent = "Click two points on the image that you know the distance between";
  }

  img.addEventListener("click", (e) => {
    if (points.length >= 2) return;

    const p = getImagePoint(e);
    points.push(p);
    addMarker(p, points.length - 1);

    if (points.length === 1) {
      instructions.textContent = "Now click the second point";
    } else if (points.length === 2) {
      drawLine();
      instructions.textContent = "Enter the real-world distance between these points";
      distanceForm.hidden = false;
      distanceInput.focus();
    }
  });

  submitBtn.addEventListener("click", () => {
    const distanceFt = Number.parseFloat(distanceInput.value);
    if (!distanceFt || distanceFt <= 0) {
      distanceInput.setCustomValidity("Enter a positive number");
      distanceInput.reportValidity();
      return;
    }

    const pixelsPerFoot = calculatePixelsPerFoot(
      points[0],
      points[1],
      distanceFt,
    );

    onCalibrated({
      pixelsPerFoot,
      points: [points[0], points[1]],
      distanceFt,
    });
  });

  resetBtn.addEventListener("click", reset);
  cancelBtn.addEventListener("click", onCancel);
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/calibration-tool.ts
git commit -m "feat: add CalibrationTool for two-point scale calibration"
```

---

## Task 7: ImageBoundaryDrawer Component

**Files:**
- Create: `src/components/image-boundary-drawer.ts`

SVG-overlay polygon drawing on an image — tested via E2E.

- [ ] **Step 1: Write the ImageBoundaryDrawer**

```typescript
// src/components/image-boundary-drawer.ts
import type { Point } from "../types";

export function renderImageBoundaryDrawer(
  container: HTMLElement,
  imageDataUrl: string,
  pixelsPerFoot: number,
  onClosed: (vertices: Point[]) => void,
  onCancel: () => void,
): void {
  const wrapper = document.createElement("div");
  wrapper.className = "image-draw-wrapper";

  const imageContainer = document.createElement("div");
  imageContainer.className = "image-canvas";

  const img = document.createElement("img");
  img.src = imageDataUrl;
  img.className = "uploaded-image";
  img.draggable = false;

  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  overlay.classList.add("draw-overlay");
  overlay.setAttribute("width", "100%");
  overlay.setAttribute("height", "100%");

  imageContainer.append(img, overlay);

  const toolbar = document.createElement("div");
  toolbar.className = "draw-toolbar";

  const instructions = document.createElement("div");
  instructions.className = "draw-instructions";
  instructions.textContent = "Click corners of your yard to trace the boundary";

  const actions = document.createElement("div");
  actions.className = "draw-actions";

  const undoBtn = document.createElement("button");
  undoBtn.textContent = "Undo";
  undoBtn.disabled = true;

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear";
  clearBtn.disabled = true;

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Back";

  actions.append(undoBtn, clearBtn, cancelBtn);

  const countDisplay = document.createElement("div");
  countDisplay.className = "draw-count";
  countDisplay.textContent = "Points: 0";

  toolbar.append(instructions, actions, countDisplay);
  wrapper.append(imageContainer, toolbar);
  container.textContent = "";
  container.appendChild(wrapper);

  const vertices: Point[] = [];
  const markerElements: SVGCircleElement[] = [];
  let polygon: SVGPolygonElement | null = null;
  let polyline: SVGPolylineElement | null = null;
  let closed = false;

  function getImagePoint(e: MouseEvent): Point {
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function toDisplayCoords(p: Point): { dx: number; dy: number } {
    const rect = img.getBoundingClientRect();
    const svgRect = overlay.getBoundingClientRect();
    const scaleX = rect.width / img.naturalWidth;
    const scaleY = rect.height / img.naturalHeight;
    return {
      dx: (rect.left - svgRect.left) + p.x * scaleX,
      dy: (rect.top - svgRect.top) + p.y * scaleY,
    };
  }

  function updateOverlay(): void {
    // Clear existing shapes
    if (polygon) { polygon.remove(); polygon = null; }
    if (polyline) { polyline.remove(); polyline = null; }
    for (const m of markerElements) m.remove();
    markerElements.length = 0;

    if (vertices.length === 0) return;

    const displayPoints = vertices.map(toDisplayCoords);
    const pointsStr = displayPoints.map((d) => `${d.dx},${d.dy}`).join(" ");

    if (vertices.length >= 3) {
      polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      polygon.setAttribute("points", pointsStr);
      polygon.classList.add("boundary-polygon");
      overlay.appendChild(polygon);
    }

    polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", pointsStr);
    polyline.classList.add("boundary-polyline");
    overlay.appendChild(polyline);

    for (let i = 0; i < displayPoints.length; i++) {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(displayPoints[i].dx));
      circle.setAttribute("cy", String(displayPoints[i].dy));
      circle.setAttribute("r", "6");
      circle.classList.add("boundary-vertex");
      if (i === 0 && vertices.length >= 3) {
        circle.classList.add("boundary-vertex-first");
        circle.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!closed && vertices.length >= 3) closePolygon();
        });
      }
      overlay.appendChild(circle);
      markerElements.push(circle);
    }

    undoBtn.disabled = vertices.length === 0;
    clearBtn.disabled = vertices.length === 0;
    countDisplay.textContent = `Points: ${vertices.length}`;
  }

  function closePolygon(): void {
    closed = true;
    instructions.textContent = "Boundary complete!";
    onClosed([...vertices]);
  }

  img.addEventListener("click", (e) => {
    if (closed) return;
    vertices.push(getImagePoint(e));
    updateOverlay();
  });

  img.addEventListener("dblclick", (e) => {
    e.preventDefault();
    if (!closed && vertices.length >= 3) closePolygon();
  });

  undoBtn.addEventListener("click", () => {
    if (vertices.length === 0 || closed) return;
    vertices.pop();
    updateOverlay();
  });

  clearBtn.addEventListener("click", () => {
    vertices.length = 0;
    closed = false;
    instructions.textContent = "Click corners of your yard to trace the boundary";
    updateOverlay();
  });

  cancelBtn.addEventListener("click", onCancel);
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/image-boundary-drawer.ts
git commit -m "feat: add ImageBoundaryDrawer with SVG overlay on uploaded image"
```

---

## Task 8: Wire Up Main + Styles

**Files:**
- Modify: `src/main.ts`
- Modify: `src/style.css`

- [ ] **Step 1: Add styles for new components**

Append to `src/style.css`:

```css
/* Image Upload */
.image-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  text-align: center;
}

.drop-zone {
  width: 100%;
  max-width: 500px;
  padding: 48px 24px;
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  margin-bottom: 16px;
}

.drop-zone:hover, .drop-zone.drag-over {
  border-color: var(--blue);
  background: rgba(59, 130, 246, 0.05);
}

.drop-label { color: var(--text-muted); }
.file-input { display: none; }
.upload-error { color: #ef4444; margin-top: 8px; }

/* Calibration */
.calibration-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.image-canvas {
  position: relative;
  flex: 1;
  overflow: hidden;
  background: #000;
}

.uploaded-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
}

.calibration-overlay, .draw-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.calibration-overlay circle, .calibration-overlay line,
.draw-overlay circle, .draw-overlay polygon, .draw-overlay polyline {
  pointer-events: auto;
}

.calibration-marker { fill: #f59e0b; stroke: white; stroke-width: 2; cursor: default; }
.calibration-label { fill: white; font-size: 14px; text-anchor: middle; font-weight: 600; }
.calibration-line { stroke: #f59e0b; stroke-width: 2; stroke-dasharray: 6 3; }

.calibration-instructions {
  padding: 12px 20px;
  background: var(--surface);
  color: var(--text);
  text-align: center;
  font-size: 14px;
}

.calibration-form {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  background: var(--surface);
}

.calibration-input {
  width: 100px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
}

.calibration-cancel { margin: 8px auto; }

/* Image Boundary Drawing */
.image-draw-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.boundary-polygon { fill: rgba(59, 130, 246, 0.15); stroke: none; }
.boundary-polyline { fill: none; stroke: var(--blue); stroke-width: 2; stroke-dasharray: 6 3; }
.boundary-vertex { fill: var(--blue); stroke: white; stroke-width: 2; cursor: pointer; }
.boundary-vertex-first { fill: #22c55e; }
```

- [ ] **Step 2: Update main.ts to wire the fallback flow**

Add imports at the top of `src/main.ts`:

```typescript
import { renderImageUpload } from "./components/image-upload";
import { renderCalibrationTool } from "./components/calibration-tool";
import { renderImageBoundaryDrawer } from "./components/image-boundary-drawer";
import { calculatePixelAreaSqFt } from "./geo/pixel-area";
import { calculatePixelPerimeterFt } from "./geo/pixel-perimeter";
import type { Point } from "./types";
```

Add three new render functions before `renderSummary`:

```typescript
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
```

Replace the fallback no-op in `renderSearch`:

```typescript
// Change:
//   () => { /* image upload fallback — future task */ },
// To:
    () => renderImageUploadView(),
```

Update `renderSummary` to handle image-based edit:

```typescript
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
```

Also update `renderSearch` to show the fallback link even without a Mapbox token:

```typescript
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
```

- [ ] **Step 3: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/main.ts src/style.css
git commit -m "feat: wire image upload fallback flow in main + add styles"
```

---

## Task 9: E2E Tests

**Files:**
- Create: `e2e/image-fallback.spec.ts`

- [ ] **Step 1: Write E2E test for the upload flow**

```typescript
// e2e/image-fallback.spec.ts
import { expect, test } from "@playwright/test";
import { join } from "node:path";

test("fallback link shows image upload view", async ({ page }) => {
  await page.goto("/");
  await page.click(".fallback-link");
  await expect(page.locator(".image-upload")).toBeVisible();
  await expect(page.locator(".drop-zone")).toBeVisible();
});

test("back button returns to address search", async ({ page }) => {
  await page.goto("/");
  await page.click(".fallback-link");
  await expect(page.locator(".image-upload")).toBeVisible();
  await page.click(".image-upload .btn-secondary");
  await expect(page.locator(".address-search")).toBeVisible();
});
```

- [ ] **Step 2: Run E2E tests**

Run: `VITE_MAPBOX_TOKEN=pk.test npx playwright test e2e/image-fallback.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 3: Commit**

```bash
git add e2e/image-fallback.spec.ts
git commit -m "test: add E2E tests for image upload fallback flow"
```

---

## Task 10: Browser Verification and Polish

- [ ] **Step 1: Start dev server and verify**

Run: `npm run dev`
Navigate to http://localhost:5173. Click "upload your own image". Verify:
- Drop zone renders with dark theme
- Drag-and-drop works (drop an image)
- Image displays in canvas
- Two-point calibration works (click two points, enter distance)
- Boundary drawing works on the image
- Summary shows area/perimeter
- "Edit Boundary" returns to image drawing (not map)
- "Back" buttons navigate correctly

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: ALL PASS

- [ ] **Step 3: Update visual regression baselines**

Run: `VITE_MAPBOX_TOKEN=pk.test npx playwright test --grep @visual --update-snapshots`
(Baselines may need updating if the landing page changed)

- [ ] **Step 4: Run all E2E tests**

Run: `VITE_MAPBOX_TOKEN=pk.test npx playwright test`
Expected: ALL PASS

- [ ] **Step 5: Commit any polish**

```bash
git add -A
git commit -m "polish: final adjustments from browser verification"
```

---

## Summary

| Task | What | Tests |
|------|------|-------|
| 1 | ImageMode type | Type check |
| 2 | Pixel area calculation | 4 unit tests |
| 3 | Pixel perimeter calculation | 4 unit tests |
| 4 | Calibration calculation | 4 unit tests |
| 5 | ImageUpload component | 5 unit tests |
| 6 | CalibrationTool component | Type check (E2E later) |
| 7 | ImageBoundaryDrawer component | Type check (E2E later) |
| 8 | Wire up main + styles | Type check + existing tests |
| 9 | E2E tests | 2 E2E tests |
| 10 | Browser verification | Manual + screenshots |

**Total:** 10 tasks, 17 new unit tests, 2 new E2E tests.
