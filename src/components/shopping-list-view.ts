import { getPlantById } from "../data/plant-catalog";
import { formatCurrency } from "../geo/plant-cost";
import {
  buildShoppingList,
  formatShoppingListText,
} from "../geo/shopping-list";
import type { YardDesign, Zone } from "../types";
import { getCategoryLabel } from "./zone-categories";

export function buildZoneLabels(zones: Zone[]): Map<string, string> {
  // Count how many zones share each category
  const categoryCounts = new Map<string, number>();
  for (const zone of zones) {
    categoryCounts.set(
      zone.category,
      (categoryCounts.get(zone.category) ?? 0) + 1,
    );
  }

  // Build labels, adding index only when category has >1 zone
  const labels = new Map<string, string>();
  const categoryIndex = new Map<string, number>();
  for (const zone of zones) {
    const label = getCategoryLabel(zone.category);
    const count = categoryCounts.get(zone.category) ?? 1;
    if (count > 1) {
      const idx = (categoryIndex.get(zone.category) ?? 0) + 1;
      categoryIndex.set(zone.category, idx);
      labels.set(zone.id, `${label} #${idx}`);
    } else {
      labels.set(zone.id, label);
    }
  }
  return labels;
}

export function renderShoppingList(
  container: HTMLElement,
  design: YardDesign,
  onBack: () => void,
): void {
  const zones = design.zones ?? [];
  const list = buildShoppingList(zones, (id) => getPlantById(id));
  const zoneLabels = buildZoneLabels(zones);

  const wrapper = document.createElement("div");
  wrapper.className = "shopping-list";

  // Header
  const header = document.createElement("div");
  header.className = "shopping-list-header";

  const heading = document.createElement("h2");
  heading.textContent = "Shopping List";
  header.appendChild(heading);

  const actions = document.createElement("div");
  actions.className = "shopping-list-actions";

  const copyBtn = document.createElement("button");
  copyBtn.className = "btn btn-secondary";
  copyBtn.textContent = "Copy to Clipboard";
  copyBtn.addEventListener("click", () => {
    const text = formatShoppingListText(list, design.address, zoneLabels);
    try {
      navigator.clipboard.writeText(text).then(
        () => {
          copyBtn.textContent = "Copied!";
          setTimeout(() => {
            copyBtn.textContent = "Copy to Clipboard";
          }, 2000);
        },
        () => {
          copyBtn.textContent = "Copy failed";
          setTimeout(() => {
            copyBtn.textContent = "Copy to Clipboard";
          }, 2000);
        },
      );
    } catch {
      copyBtn.textContent = "Copy failed";
      setTimeout(() => {
        copyBtn.textContent = "Copy to Clipboard";
      }, 2000);
    }
  });

  const printBtn = document.createElement("button");
  printBtn.className = "btn btn-secondary";
  printBtn.textContent = "Print";
  printBtn.addEventListener("click", () => {
    window.print();
  });

  const backBtn = document.createElement("button");
  backBtn.className = "btn btn-secondary";
  backBtn.textContent = "Back to Summary";
  backBtn.addEventListener("click", onBack);

  actions.append(copyBtn, printBtn, backBtn);
  header.appendChild(actions);
  wrapper.appendChild(header);

  // Empty state
  if (list.totalItems === 0) {
    const empty = document.createElement("div");
    empty.className = "shopping-list-empty";
    const emptyMsg = document.createElement("p");
    emptyMsg.textContent =
      "No plants assigned yet. Add plants to your zones to see a shopping list.";
    empty.appendChild(emptyMsg);
    wrapper.appendChild(empty);
  } else {
    // Categories
    for (const cat of list.categories) {
      const catDiv = document.createElement("div");
      catDiv.className = "shopping-category";

      const catTitle = document.createElement("h3");
      catTitle.className = "shopping-category-title";
      catTitle.textContent = cat.label;
      catDiv.appendChild(catTitle);

      const itemsDiv = document.createElement("div");
      itemsDiv.className = "shopping-items";

      for (const item of cat.items) {
        const itemDiv = document.createElement("div");
        itemDiv.className = "shopping-item";

        const emoji = document.createElement("span");
        emoji.className = "plant-emoji";
        emoji.textContent = item.emoji;

        const nameSpan = document.createElement("span");
        nameSpan.className = "shopping-item-name";
        nameSpan.textContent = item.name;

        const qtySpan = document.createElement("span");
        qtySpan.className = "shopping-item-qty";
        qtySpan.textContent = `x${item.totalQuantity}`;

        const unitCostSpan = document.createElement("span");
        unitCostSpan.className = "shopping-item-unit-cost";
        unitCostSpan.textContent = `@ ${formatCurrency(item.unitCost)}`;

        const lineTotalSpan = document.createElement("span");
        lineTotalSpan.className = "shopping-item-line-total";
        lineTotalSpan.textContent = formatCurrency(item.lineTotal);

        itemDiv.append(emoji, nameSpan, qtySpan, unitCostSpan, lineTotalSpan);
        itemsDiv.appendChild(itemDiv);

        // Zone labels below item
        const zonesDiv = document.createElement("div");
        zonesDiv.className = "shopping-item-zones";
        zonesDiv.textContent = item.zoneIds
          .map((id) => zoneLabels.get(id) ?? id)
          .join(", ");
        itemsDiv.appendChild(zonesDiv);
      }

      catDiv.appendChild(itemsDiv);

      const subtotal = document.createElement("div");
      subtotal.className = "shopping-category-subtotal";
      subtotal.textContent = `Subtotal: ${formatCurrency(cat.subtotal)}`;
      catDiv.appendChild(subtotal);

      wrapper.appendChild(catDiv);
    }

    // Grand total
    const totalDiv = document.createElement("div");
    totalDiv.className = "shopping-total";

    const totalAmount = document.createElement("div");
    totalAmount.className = "shopping-total-amount";
    totalAmount.textContent = `Total: ${formatCurrency(list.grandTotal)}`;

    const typesWord = list.totalItems === 1 ? "type" : "types";
    const plantsWord = list.totalQuantity === 1 ? "plant" : "plants";
    const totalCount = document.createElement("div");
    totalCount.className = "shopping-total-count";
    totalCount.textContent = `${list.totalItems} plant ${typesWord} · ${list.totalQuantity} total ${plantsWord}`;

    totalDiv.append(totalAmount, totalCount);
    wrapper.appendChild(totalDiv);
  }

  container.textContent = "";
  container.appendChild(wrapper);
}
