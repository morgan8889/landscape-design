import { saveDesign } from "../storage/local-store";
// src/components/zone-summary.ts
import type { YardDesign, Zone, ZoneCategory } from "../types";
import { getCategoryColor, getCategoryLabel } from "./zone-manager";

export function formatZoneArea(
  category: ZoneCategory,
  areaSqFt: number,
): string {
  return `${getCategoryLabel(category)} — ${Math.round(areaSqFt).toLocaleString("en-US")} sq ft`;
}

export function getTotalZoneArea(zones: Zone[]): number {
  return zones.reduce((sum, z) => sum + z.areaSqFt, 0);
}

export function renderZoneSummary(
  container: HTMLElement,
  design: YardDesign,
  onDelete: (zoneId: string) => void,
  onAddZones: () => void,
): void {
  const section = document.createElement("div");
  section.className = "zone-summary-section";

  const header = document.createElement("h3");
  const zones = design.zones ?? [];
  header.textContent = `Zones (${zones.length})`;
  section.appendChild(header);

  if (zones.length > 0) {
    const list = document.createElement("div");
    list.className = "zone-list";

    for (const zone of zones) {
      const item = document.createElement("div");
      item.className = "zone-item";

      const dot = document.createElement("span");
      dot.className = "zone-dot";
      dot.style.backgroundColor = getCategoryColor(zone.category);

      const label = document.createElement("span");
      label.className = "zone-label";
      label.textContent = formatZoneArea(zone.category, zone.areaSqFt);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "zone-delete";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => onDelete(zone.id));

      item.append(dot, label, deleteBtn);
      list.appendChild(item);
    }
    section.appendChild(list);
  }

  const addBtn = document.createElement("button");
  addBtn.className = "btn btn-primary";
  addBtn.textContent = zones.length > 0 ? "Edit Zones" : "Add Zones";
  addBtn.addEventListener("click", onAddZones);

  section.appendChild(addBtn);
  container.appendChild(section);
}
