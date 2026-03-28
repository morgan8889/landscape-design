import { calculateAreaSqFt } from "../geo/area";
// src/components/zone-drawer.ts
import type { LatLng, Zone, ZoneCategory } from "../types";
import { getCategoryColor, getCategoryFillOpacity } from "./zone-manager";

export interface ZoneDrawerHandle {
  destroy(): void;
}

export function createZoneDrawer(
  map: import("mapbox-gl").Map,
  category: ZoneCategory,
  zoneId: string,
  onClosed: (zone: Zone) => void,
  onCancel: () => void,
): ZoneDrawerHandle {
  const vertices: LatLng[] = [];
  const markers: import("mapbox-gl").Marker[] = [];
  const sourceId = `zone-source-${zoneId}`;
  const fillLayerId = `zone-fill-${zoneId}`;
  const lineLayerId = `zone-line-${zoneId}`;

  const color = getCategoryColor(category);
  const fillOpacity = getCategoryFillOpacity(category);

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
    paint: { "fill-color": color, "fill-opacity": fillOpacity },
  });

  map.addLayer({
    id: lineLayerId,
    type: "line",
    source: sourceId,
    paint: {
      "line-color": color,
      "line-width": 2,
      "line-dasharray": [2, 1],
    },
  });

  map.doubleClickZoom.disable();

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
    el.style.backgroundColor = color;

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
    map.doubleClickZoom.enable();

    const areaSqFt = calculateAreaSqFt(vertices);
    const zone: Zone = {
      id: zoneId,
      category,
      vertices: [...vertices],
      areaSqFt,
    };
    onClosed(zone);
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

  return {
    destroy() {
      map.off("click", onMapClick);
      map.off("dblclick", onMapDblClick);
      map.doubleClickZoom.enable();
      for (const m of markers) m.remove();
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      onCancel();
    },
  };
}
