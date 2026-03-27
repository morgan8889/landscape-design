// src/components/image-boundary-drawer.ts
import type { Point } from "../types";

export function renderImageBoundaryDrawer(
  container: HTMLElement,
  imageDataUrl: string,
  onClosed: (vertices: Point[]) => void,
  onCancel: () => void,
): void {
  // Clear container safely
  while (container.firstChild) container.removeChild(container.firstChild);

  const vertices: Point[] = [];
  let closed = false;

  // Wrapper holds image + SVG overlay
  const wrapper = document.createElement("div");
  wrapper.className = "boundary-drawer-wrapper";
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";

  const img = document.createElement("img");
  img.src = imageDataUrl;
  img.style.display = "block";
  img.style.maxWidth = "100%";
  img.style.cursor = "crosshair";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";

  wrapper.append(img, svg);

  // Controls
  const controls = document.createElement("div");
  controls.className = "boundary-drawer-controls";
  controls.style.marginTop = "8px";

  const instructions = document.createElement("div");
  instructions.className = "boundary-drawer-instructions";
  instructions.textContent =
    "Click to place boundary vertices. Double-click or click the first point to close.";

  const actions = document.createElement("div");
  actions.className = "boundary-drawer-actions";

  const undoBtn = document.createElement("button");
  undoBtn.className = "draw-undo";
  undoBtn.textContent = "Undo";
  undoBtn.disabled = true;

  const clearBtn = document.createElement("button");
  clearBtn.className = "draw-clear";
  clearBtn.textContent = "Clear";
  clearBtn.disabled = true;

  const backBtn = document.createElement("button");
  backBtn.className = "boundary-back";
  backBtn.textContent = "Back";

  actions.append(undoBtn, clearBtn, backBtn);
  controls.append(instructions, actions);
  container.append(wrapper, controls);

  // SVG element refs (recreated on each render)
  let polygonEl: SVGPolygonElement | null = null;
  let polylineEl: SVGPolylineElement | null = null;
  const vertexEls: SVGCircleElement[] = [];

  function getImagePoint(e: MouseEvent): Point {
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function toSvgCoords(p: Point): { x: number; y: number } {
    const rect = img.getBoundingClientRect();
    const scaleX = rect.width / img.naturalWidth;
    const scaleY = rect.height / img.naturalHeight;
    return { x: p.x * scaleX, y: p.y * scaleY };
  }

  function pointsAttr(pts: Point[]): string {
    return pts
      .map((p) => {
        const { x, y } = toSvgCoords(p);
        return `${x},${y}`;
      })
      .join(" ");
  }

  function renderOverlay(): void {
    // Remove old elements
    if (polygonEl) polygonEl.remove();
    if (polylineEl) polylineEl.remove();
    for (const el of vertexEls) el.remove();
    vertexEls.length = 0;
    polygonEl = null;
    polylineEl = null;

    if (vertices.length === 0) return;

    // Polygon fill (>= 3 vertices)
    if (vertices.length >= 3) {
      const polygon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "polygon",
      );
      polygon.setAttribute("class", "boundary-polygon");
      polygon.setAttribute("points", pointsAttr(vertices));
      polygon.setAttribute("fill", "#3b82f6");
      polygon.setAttribute("fill-opacity", "0.2");
      polygon.setAttribute("stroke", "none");
      svg.appendChild(polygon);
      polygonEl = polygon;
    }

    // Polyline (dashed blue, connects all vertices)
    const polyline = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polyline",
    );
    polyline.setAttribute("class", "boundary-polyline");
    polyline.setAttribute("points", pointsAttr(vertices));
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "#3b82f6");
    polyline.setAttribute("stroke-width", "2");
    polyline.setAttribute("stroke-dasharray", "6 3");
    svg.appendChild(polyline);
    polylineEl = polyline;

    // Vertex circles
    vertices.forEach((p, i) => {
      const { x, y } = toSvgCoords(p);
      const isFirst = i === 0;

      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );

      const isFirstHighlighted = isFirst && vertices.length >= 3 && !closed;
      circle.setAttribute(
        "class",
        isFirstHighlighted
          ? "boundary-vertex boundary-vertex-first"
          : "boundary-vertex",
      );
      circle.setAttribute("cx", String(x));
      circle.setAttribute("cy", String(y));
      circle.setAttribute("r", "7");
      circle.setAttribute("fill", isFirstHighlighted ? "#22c55e" : "#3b82f6");
      circle.setAttribute("stroke", "#fff");
      circle.setAttribute("stroke-width", "2");
      circle.style.cursor = isFirstHighlighted ? "pointer" : "default";

      if (isFirst && vertices.length >= 3 && !closed) {
        circle.addEventListener("click", (e: MouseEvent) => {
          e.stopPropagation();
          closePolygon();
        });
      }

      svg.appendChild(circle);
      vertexEls.push(circle);
    });
  }

  function updateButtons(): void {
    undoBtn.disabled = vertices.length === 0 || closed;
    clearBtn.disabled = vertices.length === 0;
  }

  function closePolygon(): void {
    if (closed || vertices.length < 3) return;
    closed = true;
    instructions.textContent = "Boundary complete!";
    img.style.cursor = "default";
    updateButtons();
    renderOverlay();
    onClosed([...vertices]);
  }

  svg.addEventListener("click", (e: MouseEvent) => {
    if (closed) return;
    if (img.naturalWidth === 0) return; // image not yet loaded
    const pt = getImagePoint(e);
    vertices.push(pt);
    renderOverlay();
    updateButtons();
  });

  svg.addEventListener("dblclick", (e: MouseEvent) => {
    if (closed) return;
    e.preventDefault();
    // Remove the last vertex added by the second click of the dblclick
    if (vertices.length > 0) {
      vertices.pop();
    }
    if (vertices.length >= 3) {
      closePolygon();
    }
  });

  undoBtn.addEventListener("click", () => {
    if (vertices.length === 0 || closed) return;
    vertices.pop();
    renderOverlay();
    updateButtons();
  });

  clearBtn.addEventListener("click", () => {
    vertices.length = 0;
    closed = false;
    img.style.cursor = "crosshair";
    instructions.textContent =
      "Click to place boundary vertices. Double-click or click the first point to close.";
    renderOverlay();
    updateButtons();
  });

  backBtn.addEventListener("click", () => {
    onCancel();
  });

  // Suppress the default browser dblclick text-selection behaviour
  wrapper.addEventListener("dblclick", (e: MouseEvent) => {
    e.preventDefault();
  });
}
