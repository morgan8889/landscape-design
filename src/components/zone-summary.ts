import type { YardDesign, Zone } from "../types";
import { showConfirmDialog } from "./confirm-dialog";
import { renderZoneDetail } from "./zone-detail";

export function formatZoneArea(category: string, areaSqFt: number): string {
  const label = category
    .replace("-", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${label} — ${Math.round(areaSqFt).toLocaleString("en-US")} sq ft`;
}

export function getTotalZoneArea(zones: Zone[]): number {
  return zones.reduce((sum, z) => sum + z.areaSqFt, 0);
}

export function renderZoneSummary(
  container: HTMLElement,
  design: YardDesign,
  onDelete: (zoneId: string) => void,
  onAddZones: () => void,
  onAddPlants: (zoneId: string) => void,
  onRemovePlant: (zoneId: string, plantId: string) => void,
): void {
  const section = document.createElement("div");
  section.className = "zone-summary-section";

  const header = document.createElement("h3");
  const zones = design.zones ?? [];
  header.textContent = `${zones.length === 1 ? "Zone" : "Zones"} (${zones.length})`;
  section.appendChild(header);

  if (zones.length > 0) {
    const list = document.createElement("div");
    list.className = "zone-list";

    for (const zone of zones) {
      const wrapper = document.createElement("div");
      wrapper.className = "zone-item-wrapper";

      renderZoneDetail(
        wrapper,
        zone,
        () => onAddPlants(zone.id),
        (plantId) => onRemovePlant(zone.id, plantId),
      );

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "zone-delete zone-delete-bottom";
      deleteBtn.textContent = "Delete Zone";
      deleteBtn.addEventListener("click", () => {
        showConfirmDialog({
          title: "Delete zone?",
          body: "This zone and all its plant assignments will be removed.",
          actions: [
            {
              label: "Delete",
              variant: "danger",
              onClick: () => onDelete(zone.id),
            },
            { label: "Cancel", variant: "ghost", onClick: () => {} },
          ],
        });
      });
      wrapper.appendChild(deleteBtn);

      list.appendChild(wrapper);
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
