import type { PlantCategory, PlantInfo, Zone } from "../types";
import { calculateAssignmentCost, formatCurrency } from "./plant-cost";

export interface ShoppingLineItem {
  plantId: string;
  name: string;
  emoji: string;
  category: PlantCategory;
  totalQuantity: number;
  unitCost: number;
  lineTotal: number;
  zoneIds: string[];
}

export interface ShoppingCategory {
  category: PlantCategory;
  label: string;
  items: ShoppingLineItem[];
  subtotal: number;
}

export interface ShoppingList {
  categories: ShoppingCategory[];
  grandTotal: number;
  totalItems: number;
  totalQuantity: number;
}

const CATEGORY_ORDER: PlantCategory[] = [
  "tree",
  "shrub",
  "perennial",
  "annual",
  "grass",
  "ground-cover",
];

const CATEGORY_LABELS: Record<PlantCategory, string> = {
  tree: "Trees",
  shrub: "Shrubs",
  perennial: "Perennials",
  annual: "Annuals",
  grass: "Grasses",
  "ground-cover": "Ground Covers",
};

export function formatCategoryLabel(category: PlantCategory): string {
  return CATEGORY_LABELS[category];
}

export function aggregatePlants(
  zones: Zone[],
  getPlantInfo: (id: string) => PlantInfo | undefined,
): ShoppingLineItem[] {
  const map = new Map<
    string,
    {
      plant: PlantInfo;
      totalQuantity: number;
      lineTotal: number;
      zoneIds: Set<string>;
    }
  >();

  for (const zone of zones) {
    for (const a of zone.plants ?? []) {
      const plant = getPlantInfo(a.plantId);
      if (!plant) continue;

      const cost = calculateAssignmentCost(
        a.quantity,
        a.costPerUnit,
        plant.costPerUnit,
      );

      let entry = map.get(a.plantId);
      if (!entry) {
        entry = { plant, totalQuantity: 0, lineTotal: 0, zoneIds: new Set() };
        map.set(a.plantId, entry);
      }
      entry.totalQuantity += a.quantity;
      entry.lineTotal += cost;
      entry.zoneIds.add(zone.id);
    }
  }

  const items: ShoppingLineItem[] = [];
  for (const [plantId, entry] of map) {
    items.push({
      plantId,
      name: entry.plant.name,
      emoji: entry.plant.emoji,
      category: entry.plant.category,
      totalQuantity: entry.totalQuantity,
      unitCost: entry.lineTotal / entry.totalQuantity,
      lineTotal: entry.lineTotal,
      zoneIds: [...entry.zoneIds],
    });
  }

  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

export function groupByCategory(items: ShoppingLineItem[]): ShoppingCategory[] {
  const grouped = new Map<PlantCategory, ShoppingLineItem[]>();
  for (const item of items) {
    let list = grouped.get(item.category);
    if (!list) {
      list = [];
      grouped.set(item.category, list);
    }
    list.push(item);
  }

  const categories: ShoppingCategory[] = [];
  for (const cat of CATEGORY_ORDER) {
    const catItems = grouped.get(cat);
    if (!catItems || catItems.length === 0) continue;
    categories.push({
      category: cat,
      label: formatCategoryLabel(cat),
      items: catItems,
      subtotal: catItems.reduce((sum, i) => sum + i.lineTotal, 0),
    });
  }

  return categories;
}

export function formatShoppingListText(
  list: ShoppingList,
  address: string,
  zoneLabels: Map<string, string>,
): string {
  const lines: string[] = [];

  const header = `SHOPPING LIST \u2014 ${address}`;
  lines.push(header);
  lines.push("=".repeat(header.length));
  lines.push("");

  for (let i = 0; i < list.categories.length; i++) {
    const cat = list.categories[i];
    lines.push(cat.label.toUpperCase());

    for (const item of cat.items) {
      const zones = item.zoneIds
        .map((id) => zoneLabels.get(id) ?? id)
        .join(", ");
      lines.push(
        `  ${item.name} x${item.totalQuantity}  @ ${formatCurrency(item.unitCost)}  = ${formatCurrency(item.lineTotal)}  (${zones})`,
      );
    }

    lines.push(`  Subtotal: ${formatCurrency(cat.subtotal)}`);
    lines.push("");
  }

  const typesWord = list.totalItems === 1 ? "type" : "types";
  const plantsWord = list.totalQuantity === 1 ? "plant" : "plants";
  lines.push(
    `TOTAL: ${formatCurrency(list.grandTotal)} (${list.totalItems} ${typesWord}, ${list.totalQuantity} ${plantsWord})`,
  );

  return lines.join("\n");
}

export function buildShoppingList(
  zones: Zone[],
  getPlantInfo: (id: string) => PlantInfo | undefined,
): ShoppingList {
  const items = aggregatePlants(zones, getPlantInfo);
  const categories = groupByCategory(items);

  return {
    categories,
    grandTotal: items.reduce((sum, i) => sum + i.lineTotal, 0),
    totalItems: items.length,
    totalQuantity: items.reduce((sum, i) => sum + i.totalQuantity, 0),
  };
}
