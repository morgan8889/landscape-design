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

export function loadDesign(): YardDesign | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as YardDesign;
  } catch {
    return null;
  }
}

export function exportDesignJson(design: YardDesign): string {
  return JSON.stringify(design, null, 2);
}
