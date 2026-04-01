import { getPlantsForZone, searchPlants } from "../data/plant-catalog";
import { formatCurrency } from "../geo/plant-cost";
import { calculatePlantQuantity } from "../geo/plant-coverage";
import type { PlantInfo, Zone } from "../types";

function toTitleCase(s: string): string {
  return s.replace(/[-\s]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function renderPlantBrowser(
  container: HTMLElement,
  zone: Zone,
  onAdd: (
    plantId: string,
    quantity: number,
    calculatedQuantity: number,
    costOverride: number | undefined,
  ) => void,
  onClose: () => void,
): void {
  const overlay = document.createElement("div");
  overlay.className = "plant-browser-overlay";

  const panel = document.createElement("div");
  panel.className = "plant-browser";

  // Header
  const header = document.createElement("div");
  header.className = "plant-browser-header";

  const titleDiv = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = `Plants for ${toTitleCase(zone.category)}`;
  const subtitle = document.createElement("div");
  subtitle.className = "plant-browser-subtitle";
  const compatible = getPlantsForZone(zone.category);
  subtitle.textContent = `${Math.round(zone.areaSqFt)} sq ft · ${compatible.length} compatible plants`;
  titleDiv.append(title, subtitle);

  const closeBtn = document.createElement("button");
  closeBtn.className = "btn btn-secondary plant-browser-close";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", onClose);

  header.append(titleDiv, closeBtn);

  // Search
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search plants...";
  searchInput.className = "plant-search-input";

  // Filter chips
  const filterBar = document.createElement("div");
  filterBar.className = "plant-filter-bar";

  const filters = [
    { label: "All", value: "" },
    { label: "Full Sun", value: "full-sun" },
    { label: "Partial Shade", value: "partial-shade" },
    { label: "Low Water", value: "low" },
    { label: "Pollinator", value: "pollinator" },
  ];

  let activeFilter = "";

  function applyFilters(plants: PlantInfo[]): PlantInfo[] {
    if (!activeFilter) return plants;
    return plants.filter(
      (p) =>
        p.sunRequirement === activeFilter ||
        p.waterNeed === activeFilter ||
        p.tags.includes(activeFilter),
    );
  }

  function renderFilterChips(): void {
    filterBar.textContent = "";
    for (const f of filters) {
      const chip = document.createElement("span");
      chip.className = `plant-filter-chip${activeFilter === f.value ? " active" : ""}`;
      chip.textContent = f.label;
      chip.addEventListener("click", () => {
        activeFilter = f.value;
        renderFilterChips();
        renderList();
      });
      filterBar.appendChild(chip);
    }
  }

  // Plant list
  const listContainer = document.createElement("div");
  listContainer.className = "plant-list";

  let expandedPlantId: string | null = null;

  function renderList(): void {
    const query = searchInput.value;
    const results = applyFilters(searchPlants(query, zone.category));
    listContainer.textContent = "";

    if (results.length === 0) {
      const empty = document.createElement("div");
      empty.className = "plant-list-empty";
      empty.textContent = "No plants match your search.";
      listContainer.appendChild(empty);
      return;
    }

    for (const plant of results) {
      const row = document.createElement("div");
      row.className = "plant-row";

      const info = document.createElement("div");
      info.className = "plant-row-info";

      const emoji = document.createElement("span");
      emoji.className = "plant-emoji";
      emoji.textContent = plant.emoji;

      const details = document.createElement("div");
      details.className = "plant-details";
      const name = document.createElement("div");
      name.className = "plant-name";
      name.textContent = plant.name;
      const meta = document.createElement("div");
      meta.className = "plant-meta";
      const sunLabel = toTitleCase(plant.sunRequirement);
      const waterLabel =
        plant.waterNeed.charAt(0).toUpperCase() + plant.waterNeed.slice(1);
      meta.textContent = `${plant.category} · ${sunLabel} · ${waterLabel} Water · ${plant.spacingInches}" spacing · ${formatCurrency(plant.costPerUnit)}/ea`;
      details.append(name, meta);
      info.append(emoji, details);

      const addBtn = document.createElement("button");
      addBtn.className = "btn plant-add-btn";
      addBtn.textContent = "+ Add";
      addBtn.addEventListener("click", () => {
        expandedPlantId = expandedPlantId === plant.id ? null : plant.id;
        renderList();
      });

      row.append(info, addBtn);
      listContainer.appendChild(row);

      // Expanded confirmation
      if (expandedPlantId === plant.id) {
        const calcQty = calculatePlantQuantity(
          zone.areaSqFt,
          plant.spacingInches,
        );
        const confirm = document.createElement("div");
        confirm.className = "plant-confirm";

        const calcLabel = document.createElement("div");
        calcLabel.className = "plant-calc-label";
        calcLabel.textContent = `${plant.spacingInches}" spacing → ~${calcQty} plants to fill ${Math.round(zone.areaSqFt)} sq ft`;

        const inputRow = document.createElement("div");
        inputRow.className = "plant-confirm-row";

        const qtyLabel = document.createElement("span");
        qtyLabel.className = "plant-qty-label";
        qtyLabel.textContent = "Qty:";

        const qtyInput = document.createElement("input");
        qtyInput.type = "number";
        qtyInput.className = "plant-qty-input";
        qtyInput.value = String(calcQty);
        qtyInput.min = "1";

        const recommended = document.createElement("span");
        recommended.className = "plant-qty-recommended";
        recommended.textContent = `(recommended: ${calcQty})`;

        const priceRow = document.createElement("div");
        priceRow.className = "plant-confirm-row";

        const priceLabel = document.createElement("span");
        priceLabel.className = "plant-price-label";
        priceLabel.textContent = "Price:";

        const priceInput = document.createElement("input");
        priceInput.type = "number";
        priceInput.className = "plant-price-input";
        priceInput.value = plant.costPerUnit.toFixed(2);
        priceInput.min = "0";
        priceInput.step = "0.01";
        let priceEdited = false;
        priceInput.addEventListener("input", () => {
          priceEdited = true;
        });

        const lineTotal = document.createElement("span");
        lineTotal.className = "plant-line-total";

        const updateLineTotal = (): void => {
          const q = Number.parseInt(qtyInput.value, 10) || calcQty;
          const p = Number.parseFloat(priceInput.value) || 0;
          lineTotal.textContent = `= ${formatCurrency(q * p)}`;
        };
        updateLineTotal();

        qtyInput.addEventListener("input", updateLineTotal);
        priceInput.addEventListener("input", updateLineTotal);

        priceRow.append(priceLabel, priceInput, lineTotal);

        const confirmBtn = document.createElement("button");
        confirmBtn.className = "btn btn-primary plant-confirm-btn";
        confirmBtn.textContent = "Confirm";
        confirmBtn.addEventListener("click", () => {
          const qty = Number.parseInt(qtyInput.value, 10) || calcQty;
          const price = Number.parseFloat(priceInput.value);
          const costOverride =
            priceEdited && !Number.isNaN(price) ? price : undefined;
          onAdd(plant.id, qty, calcQty, costOverride);
          expandedPlantId = null;
          renderList();
        });

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "btn btn-secondary plant-cancel-btn";
        cancelBtn.textContent = "Cancel";
        cancelBtn.addEventListener("click", () => {
          expandedPlantId = null;
          renderList();
        });

        inputRow.append(qtyLabel, qtyInput, recommended, confirmBtn, cancelBtn);

        confirm.append(calcLabel, inputRow, priceRow);
        listContainer.appendChild(confirm);
      }
    }
  }

  searchInput.addEventListener("input", renderList);

  renderFilterChips();
  panel.append(header, searchInput, filterBar, listContainer);
  overlay.appendChild(panel);

  container.textContent = "";
  container.appendChild(overlay);
  renderList();
}
