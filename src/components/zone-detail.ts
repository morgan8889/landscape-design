import { getPlantById } from "../data/plant-catalog";
import {
  calculateAssignmentCost,
  calculateZoneCost,
  formatCurrency,
} from "../geo/plant-cost";
import { calculateCoveragePercent } from "../geo/plant-coverage";
import type { Zone } from "../types";
import { getCategoryColor, getCategoryLabel } from "./zone-categories";

export function formatCoverage(percent: number): string {
  if (percent > 100) return ">100%";
  return `~${Math.round(percent)}%`;
}

export function formatZoneCost(cost: number): string | null {
  if (cost === 0) return null;
  return formatCurrency(cost);
}

export function renderZoneDetail(
  container: HTMLElement,
  zone: Zone,
  onAddPlants: () => void,
  onRemovePlant: (plantId: string) => void,
): void {
  const card = document.createElement("div");
  card.className = "zone-item zone-detail-card";

  // Zone header
  const header = document.createElement("div");
  header.className = "zone-detail-header";

  const labelGroup = document.createElement("div");
  labelGroup.className = "zone-detail-label-group";

  const dot = document.createElement("span");
  dot.className = "zone-dot";
  dot.style.backgroundColor = getCategoryColor(zone.category);

  const name = document.createElement("span");
  name.className = "zone-label";
  name.textContent = getCategoryLabel(zone.category);

  labelGroup.append(dot, name);

  const area = document.createElement("span");
  area.className = "zone-detail-area";
  area.textContent = `${Math.round(zone.areaSqFt)} sq ft`;

  header.append(labelGroup, area);
  card.appendChild(header);

  const plants = zone.plants ?? [];

  if (plants.length > 0) {
    const plantList = document.createElement("div");
    plantList.className = "zone-plant-list";

    for (const assignment of plants) {
      const info = getPlantById(assignment.plantId);
      if (!info) continue;

      const row = document.createElement("div");
      row.className = "zone-plant-row";

      const left = document.createElement("div");
      left.className = "zone-plant-left";
      const emoji = document.createElement("span");
      emoji.textContent = info.emoji;
      const plantName = document.createElement("span");
      plantName.textContent = info.name;
      left.append(emoji, plantName);

      const right = document.createElement("div");
      right.className = "zone-plant-right";
      const qty = document.createElement("span");
      qty.className = "zone-plant-qty";
      qty.textContent = `×${assignment.quantity}`;
      const lineCost = calculateAssignmentCost(
        assignment.quantity,
        assignment.costPerUnit,
        info.costPerUnit,
      );
      const removeBtn = document.createElement("button");
      removeBtn.className = "zone-plant-remove";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () =>
        onRemovePlant(assignment.plantId),
      );
      if (lineCost > 0) {
        const cost = document.createElement("span");
        cost.className = "zone-plant-cost";
        cost.textContent = `— ${formatCurrency(lineCost)}`;
        right.append(qty, cost, removeBtn);
      } else {
        right.append(qty, removeBtn);
      }

      row.append(left, right);
      plantList.appendChild(row);
    }

    card.appendChild(plantList);

    // Coverage summary
    const coverageBar = document.createElement("div");
    coverageBar.className = "zone-coverage";

    const coverageLabel = document.createElement("div");
    coverageLabel.className = "zone-coverage-label";
    coverageLabel.textContent = "Coverage";

    const coverageStats = document.createElement("div");
    coverageStats.className = "zone-coverage-stats";

    const totalPlants = plants.reduce((sum, a) => sum + a.quantity, 0);
    const countText = document.createElement("span");
    countText.textContent = `${plants.length} plant type${plants.length === 1 ? "" : "s"} · ${totalPlants} total`;

    const percent = calculateCoveragePercent(
      zone.areaSqFt,
      plants,
      (id) => getPlantById(id)?.spacingInches ?? 0,
    );
    const percentText = document.createElement("span");
    percentText.className = "zone-coverage-percent";
    percentText.textContent = formatCoverage(percent);

    coverageStats.append(countText, percentText);
    coverageBar.append(coverageLabel, coverageStats);
    card.appendChild(coverageBar);

    // Cost subtotal
    const zoneCost = calculateZoneCost(
      plants,
      (id) => getPlantById(id)?.costPerUnit ?? 0,
    );
    const formattedCost = formatZoneCost(zoneCost);
    if (formattedCost) {
      const costBar = document.createElement("div");
      costBar.className = "zone-cost-subtotal";
      costBar.textContent = `Estimated cost: ${formattedCost}`;
      card.appendChild(costBar);
    }
  } else {
    const empty = document.createElement("div");
    empty.className = "zone-detail-empty";
    empty.textContent = "No plants assigned";
    card.appendChild(empty);
  }

  const actions = document.createElement("div");
  actions.className = "zone-detail-actions";

  const addBtn = document.createElement("button");
  addBtn.className = "btn btn-primary zone-detail-add-btn";
  addBtn.textContent = plants.length > 0 ? "Add More Plants" : "Add Plants";
  addBtn.addEventListener("click", onAddPlants);

  actions.appendChild(addBtn);
  card.appendChild(actions);

  container.appendChild(card);
}
