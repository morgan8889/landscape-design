// src/components/yard-summary.ts
import { getPlantById } from "../data/plant-catalog";
import { calculateProjectCost, formatCurrency } from "../geo/plant-cost";
import {
  clearDesign,
  exportDesignJson,
  saveDesign,
} from "../storage/local-store";
import type { YardDesign } from "../types";
import { renderBloomTimeline } from "./bloom-timeline";
import { showConfirmDialog } from "./confirm-dialog";
import { renderZoneSummary } from "./zone-summary";

export function formatArea(sqFt: number): string {
  return `${Math.round(sqFt).toLocaleString("en-US")} sq ft`;
}

export function formatPerimeter(ft: number): string {
  return `${Math.round(ft)} ft`;
}

export function formatProjectCost(cost: number): string {
  if (cost === 0) return "—";
  return formatCurrency(cost);
}

export function triggerJsonDownload(json: string, filename: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function renderYardSummary(
  container: HTMLElement,
  design: YardDesign,
  onEdit: () => void,
  onAddZones?: () => void,
  onDeleteZone?: (zoneId: string) => void,
  onAddPlants?: (zoneId: string) => void,
  onRemovePlant?: (zoneId: string, plantId: string) => void,
  onShoppingList?: () => void,
): void {
  const wrapper = document.createElement("div");
  wrapper.className = "yard-summary";

  const h2 = document.createElement("h2");
  h2.textContent = design.address;

  const grid = document.createElement("div");
  grid.className = "summary-grid";

  const pointCount = design.pixelBoundary
    ? design.pixelBoundary.length
    : design.boundary.length;
  const cards = [
    { label: "Total Area", value: formatArea(design.areaSqFt) },
    { label: "Perimeter", value: formatPerimeter(design.perimeterFt) },
    { label: "Points", value: String(pointCount) },
    { label: "USDA Zone", value: design.usdaZone ?? "Unknown" },
  ];

  const projectCost = calculateProjectCost(
    design.zones ?? [],
    (id) => getPlantById(id)?.costPerUnit ?? 0,
  );
  cards.push({ label: "Est. Cost", value: formatProjectCost(projectCost) });

  for (const card of cards) {
    const cardEl = document.createElement("div");
    cardEl.className = "summary-card";
    const label = document.createElement("div");
    label.className = "summary-label";
    label.textContent = card.label;
    const value = document.createElement("div");
    value.className = "summary-value";
    value.textContent = card.value;
    cardEl.append(label, value);
    grid.appendChild(cardEl);
  }

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "summary-actions";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn-primary save-btn";
  saveBtn.textContent = "Save Design";

  const exportBtn = document.createElement("button");
  exportBtn.className = "btn btn-secondary export-btn";
  exportBtn.textContent = "Export JSON";

  const editBtn = document.createElement("button");
  editBtn.className = "btn btn-secondary edit-btn";
  editBtn.textContent = "Edit Boundary";

  const newDesignBtn = document.createElement("button");
  newDesignBtn.className = "btn btn-secondary new-design-btn";
  newDesignBtn.textContent = "New Design";

  const resetDesign = () => {
    clearDesign();
    location.reload();
  };

  let pendingReset: ReturnType<typeof setTimeout> | undefined;

  newDesignBtn.addEventListener("click", () => {
    // Cancel any pending reset before opening a new dialog (prevents orphaned reload)
    if (pendingReset !== undefined) {
      clearTimeout(pendingReset);
      pendingReset = undefined;
    }
    showConfirmDialog({
      title: "Start a new design?",
      body: "Download a backup of your current design before starting over?",
      actions: [
        {
          label: "Download & Start Over",
          variant: "primary",
          onClick: () => {
            const json = exportDesignJson(design);
            triggerJsonDownload(json, `yard-design-${design.id}.json`);
            pendingReset = setTimeout(resetDesign, 300);
          },
        },
        {
          label: "Start Over",
          variant: "danger",
          onClick: resetDesign,
        },
        { label: "Cancel", variant: "ghost", onClick: () => {} },
      ],
    });
  });

  if (onShoppingList && projectCost > 0) {
    const shoppingBtn = document.createElement("button");
    shoppingBtn.className = "btn btn-secondary shopping-list-btn";
    shoppingBtn.textContent = "Shopping List";
    shoppingBtn.addEventListener("click", onShoppingList);
    actionsDiv.append(saveBtn, exportBtn, shoppingBtn, editBtn, newDesignBtn);
  } else {
    actionsDiv.append(saveBtn, exportBtn, editBtn, newDesignBtn);
  }

  const status = document.createElement("p");
  status.className = "save-status";
  status.hidden = true;

  wrapper.append(h2, grid, actionsDiv, status);

  if (onAddZones) {
    renderZoneSummary(
      wrapper,
      design,
      (zoneId) => {
        if (onDeleteZone) onDeleteZone(zoneId);
      },
      onAddZones,
      (zoneId) => {
        if (onAddPlants) onAddPlants(zoneId);
      },
      (zoneId, plantId) => {
        if (onRemovePlant) onRemovePlant(zoneId, plantId);
      },
    );
    renderBloomTimeline(wrapper, design.zones ?? []);
  }

  container.textContent = "";
  container.appendChild(wrapper);

  saveBtn.addEventListener("click", () => {
    const ok = saveDesign(design);
    status.textContent = ok
      ? "Design saved!"
      : "Save failed — image may be too large for browser storage.";
    status.hidden = false;
    if (ok) {
      setTimeout(() => {
        status.hidden = true;
      }, 2000);
    }
  });

  exportBtn.addEventListener("click", () => {
    const json = exportDesignJson(design);
    triggerJsonDownload(json, `yard-design-${design.id}.json`);
  });

  editBtn.addEventListener("click", onEdit);
}
