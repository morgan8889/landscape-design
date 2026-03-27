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
  instructions.textContent = "Click corners of your yard to trace the boundary";

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
    const source = map.getSource(sourceId) as import("mapbox-gl").GeoJSONSource;
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

    if (vertices.length === 2) {
      markers[0].getElement().addEventListener("click", (e) => {
        if (vertices.length >= 3) {
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
