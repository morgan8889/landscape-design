// src/storage/local-store.ts
import type { YardDesign } from "../types";

const STORAGE_KEY = "yard-design";

export function saveDesign(design: YardDesign): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
}

export function loadDesign(): YardDesign | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as YardDesign;
}

export function exportDesignJson(design: YardDesign): string {
  return JSON.stringify(design, null, 2);
}
