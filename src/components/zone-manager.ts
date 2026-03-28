// src/components/zone-manager.ts
import type { Zone, ZoneCategory } from "../types";
import { createZoneDrawer } from "./zone-drawer";
import type { ZoneDrawerHandle } from "./zone-drawer";

interface CategoryConfig {
  id: ZoneCategory;
  label: string;
  color: string;
  fillOpacity: number;
}

export const ZONE_CATEGORIES: CategoryConfig[] = [
  { id: "garden-bed", label: "Garden Bed", color: "#22c55e", fillOpacity: 0.3 },
  { id: "lawn", label: "Lawn", color: "#86efac", fillOpacity: 0.2 },
  { id: "patio", label: "Patio", color: "#a78bfa", fillOpacity: 0.3 },
  { id: "path", label: "Path", color: "#fbbf24", fillOpacity: 0.3 },
  { id: "deck", label: "Deck", color: "#f97316", fillOpacity: 0.3 },
  { id: "pool", label: "Pool", color: "#38bdf8", fillOpacity: 0.4 },
];

export function getCategoryLabel(category: ZoneCategory): string {
  const config = ZONE_CATEGORIES.find((c) => c.id === category);
  return config?.label ?? category;
}

export function getCategoryColor(category: ZoneCategory): string {
  const config = ZONE_CATEGORIES.find((c) => c.id === category);
  return config?.color ?? "#888888";
}

export function getCategoryFillOpacity(category: ZoneCategory): number {
  const config = ZONE_CATEGORIES.find((c) => c.id === category);
  return config?.fillOpacity ?? 0.3;
}

function renderStaticZone(map: import("mapbox-gl").Map, zone: Zone): void {
  const sourceId = `zone-static-${zone.id}`;
  const fillLayerId = `zone-static-${zone.id}-fill`;
  const lineLayerId = `zone-static-${zone.id}-line`;

  const color = getCategoryColor(zone.category);
  const fillOpacity = getCategoryFillOpacity(zone.category);
  const coords = zone.vertices.map((v) => [v.lng, v.lat]);
  if (coords.length >= 3) {
    coords.push(coords[0]);
  }

  map.addSource(sourceId, {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [coords] },
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
    paint: { "line-color": color, "line-width": 2 },
  });
}

export function renderZoneManager(
  map: import("mapbox-gl").Map,
  existingZones: Zone[],
  onDone: (zones: Zone[]) => void,
): void {
  const zones: Zone[] = [...existingZones];

  for (const zone of zones) {
    renderStaticZone(map, zone);
  }

  // Build toolbar DOM
  const toolbar = document.createElement("div");
  toolbar.className = "zone-toolbar";

  const instructions = document.createElement("div");
  instructions.className = "zone-instructions";
  instructions.textContent = "Select a category and draw a zone";

  const controls = document.createElement("div");
  controls.className = "zone-controls";

  const select = document.createElement("select");
  select.className = "zone-category-select";
  for (const cat of ZONE_CATEGORIES) {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.label;
    select.appendChild(option);
  }

  const drawBtn = document.createElement("button");
  drawBtn.className = "btn btn-primary";
  drawBtn.textContent = "Draw Zone";

  const doneBtn = document.createElement("button");
  doneBtn.className = "btn btn-secondary";
  doneBtn.textContent = "Done";

  controls.append(select, drawBtn, doneBtn);

  const countDisplay = document.createElement("div");
  countDisplay.className = "zone-count";
  countDisplay.textContent = `${zones.length} zone${zones.length !== 1 ? "s" : ""}`;

  toolbar.append(instructions, controls, countDisplay);
  map.getContainer().appendChild(toolbar);

  let activeDrawer: ZoneDrawerHandle | null = null;

  function updateCount(): void {
    countDisplay.textContent = `${zones.length} zone${zones.length !== 1 ? "s" : ""}`;
  }

  drawBtn.addEventListener("click", () => {
    if (activeDrawer) return;

    const category = select.value as ZoneCategory;
    const zoneId = crypto.randomUUID();

    select.disabled = true;
    drawBtn.disabled = true;

    activeDrawer = createZoneDrawer(
      map,
      category,
      zoneId,
      (zone) => {
        zones.push(zone);
        renderStaticZone(map, zone);
        activeDrawer = null;
        select.disabled = false;
        drawBtn.disabled = false;
        updateCount();
      },
      () => {
        activeDrawer = null;
        select.disabled = false;
        drawBtn.disabled = false;
      },
    );
  });

  doneBtn.addEventListener("click", () => {
    if (activeDrawer) {
      activeDrawer.destroy(true);
      activeDrawer = null;
    }
    toolbar.remove();
    onDone(zones);
  });
}
