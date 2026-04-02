import { getPlantById } from "../data/plant-catalog";
import { buildBloomTimeline } from "../geo/bloom-timeline";
import type { Zone } from "../types";

const MONTH_LABELS = [
  "J",
  "F",
  "M",
  "A",
  "M",
  "J",
  "J",
  "A",
  "S",
  "O",
  "N",
  "D",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function renderBloomTimeline(
  container: HTMLElement,
  zones: Zone[],
): void {
  const timeline = buildBloomTimeline(zones, (id) => getPlantById(id) ?? null);

  if (timeline.plantCount === 0) return;

  const section = document.createElement("div");
  section.className = "bloom-timeline";

  const header = document.createElement("h3");
  header.textContent = "Bloom Timeline";
  section.appendChild(header);

  // Month header row
  const headerRow = document.createElement("div");
  headerRow.className = "bloom-grid bloom-header-row";
  const labelCell = document.createElement("div");
  labelCell.className = "bloom-label";
  headerRow.appendChild(labelCell);

  for (const abbr of MONTH_LABELS) {
    const cell = document.createElement("div");
    cell.className = "bloom-month-label";
    cell.textContent = abbr;
    headerRow.appendChild(cell);
  }
  section.appendChild(headerRow);

  // Summary bar row
  const summaryRow = document.createElement("div");
  summaryRow.className = "bloom-grid bloom-summary-row";
  const summaryLabel = document.createElement("div");
  summaryLabel.className = "bloom-label";
  summaryLabel.textContent = "Coverage";
  summaryRow.appendChild(summaryLabel);

  const maxInterest = Math.max(...timeline.months.map((m) => m.totalInterest));

  for (const month of timeline.months) {
    const cell = document.createElement("div");
    cell.className = "bloom-cell";
    cell.setAttribute("data-month", String(month.month));

    if (month.totalInterest === 0) {
      cell.classList.add("bloom-cell-gap");
    } else {
      cell.classList.add("bloom-cell-active");
      const intensity =
        maxInterest > 0 ? Math.max(0.3, month.totalInterest / maxInterest) : 0;
      cell.style.setProperty("--bloom-intensity", String(intensity));
    }
    cell.textContent =
      month.totalInterest > 0 ? String(month.totalInterest) : "";
    summaryRow.appendChild(cell);
  }
  section.appendChild(summaryRow);

  // Gap callout
  if (timeline.gapMonths.length > 0) {
    const gapText = document.createElement("p");
    gapText.className = "bloom-gap-callout";
    const gapNames = timeline.gapMonths.map((m) => MONTH_NAMES[m - 1]);
    gapText.textContent = `No bloom coverage in ${gapNames.join(", ")}`;
    section.appendChild(gapText);
  }

  // Expandable plant rows
  const plantSection = document.createElement("div");
  plantSection.className = "bloom-plant-rows bloom-plant-rows--collapsed";

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "btn btn-secondary bloom-toggle";
  toggleBtn.textContent = `Show ${timeline.plantCount} plants`;
  toggleBtn.addEventListener("click", () => {
    const collapsed = plantSection.classList.toggle(
      "bloom-plant-rows--collapsed",
    );
    toggleBtn.textContent = collapsed
      ? `Show ${timeline.plantCount} plants`
      : "Hide plants";
  });
  section.appendChild(toggleBtn);

  // Build plant rows
  const seenPlants = new Set<string>();
  for (const month of timeline.months) {
    for (const id of [...month.bloomingPlants, ...month.foliagePlants]) {
      seenPlants.add(id);
    }
  }

  for (const plantId of seenPlants) {
    const plant = getPlantById(plantId);
    if (!plant) continue;

    const row = document.createElement("div");
    row.className = "bloom-grid bloom-plant-row";

    const nameCell = document.createElement("div");
    nameCell.className = "bloom-label";
    nameCell.textContent = `${plant.emoji} ${plant.name}`;
    row.appendChild(nameCell);

    for (const month of timeline.months) {
      const cell = document.createElement("div");
      cell.className = "bloom-cell";

      const isBlooming = month.bloomingPlants.includes(plantId);
      const isFoliage = month.foliagePlants.includes(plantId);

      if (isBlooming) {
        cell.classList.add("bloom-cell-bloom");
      } else if (isFoliage) {
        cell.classList.add("bloom-cell-foliage");
      }

      row.appendChild(cell);
    }
    plantSection.appendChild(row);
  }

  section.appendChild(plantSection);
  container.appendChild(section);
}
