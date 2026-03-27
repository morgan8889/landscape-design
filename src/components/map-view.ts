// src/components/map-view.ts
import type mapboxgl from "mapbox-gl";
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
    (mb as unknown as typeof mapboxgl).accessToken = token;

    if (!document.querySelector('link[href*="mapbox-gl"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      const version = (mb as Record<string, unknown>).version ?? "3.9.4";
      link.href = `https://api.mapbox.com/mapbox-gl-js/v${version}/mapbox-gl.css`;
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
