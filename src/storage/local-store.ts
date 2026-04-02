// src/storage/local-store.ts
import type { YardDesign } from "../types";

const STORAGE_KEY = "yard-design";

export function saveDesign(design: YardDesign): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
    return true;
  } catch {
    return false;
  }
}

function isValidCost(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

function sanitizeDesign(design: YardDesign): YardDesign {
  if (design.zones) {
    for (const zone of design.zones) {
      if (zone.plants) {
        for (const plant of zone.plants) {
          if (
            plant.costPerUnit !== undefined &&
            !isValidCost(plant.costPerUnit)
          ) {
            plant.costPerUnit = undefined;
          }
        }
      }
    }
  }
  return design;
}

export function loadDesign(): YardDesign | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return sanitizeDesign(JSON.parse(raw) as YardDesign);
  } catch {
    return null;
  }
}

export function exportDesignJson(design: YardDesign): string {
  return JSON.stringify(design, null, 2);
}
