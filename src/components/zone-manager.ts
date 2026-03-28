// src/components/zone-manager.ts
import type { ZoneCategory } from "../types";

interface CategoryConfig {
  id: ZoneCategory;
  label: string;
  color: string;
  fillOpacity: number;
}

export const ZONE_CATEGORIES: CategoryConfig[] = [
  { id: "garden-bed", label: "Garden Bed", color: "#22c55e", fillOpacity: 0.3 },
  { id: "lawn", label: "Lawn", color: "#86efac", fillOpacity: 0.2 },
  { id: "patio", label: "Patio", color: "#a78bfa", fillOpacity: 0.3 },
  { id: "path", label: "Path", color: "#fbbf24", fillOpacity: 0.3 },
  { id: "deck", label: "Deck", color: "#f97316", fillOpacity: 0.3 },
  { id: "pool", label: "Pool", color: "#38bdf8", fillOpacity: 0.4 },
];

export function getCategoryLabel(category: ZoneCategory): string {
  const config = ZONE_CATEGORIES.find((c) => c.id === category);
  return config?.label ?? category;
}

export function getCategoryColor(category: ZoneCategory): string {
  const config = ZONE_CATEGORIES.find((c) => c.id === category);
  return config?.color ?? "#888888";
}

export function getCategoryFillOpacity(category: ZoneCategory): number {
  const config = ZONE_CATEGORIES.find((c) => c.id === category);
  return config?.fillOpacity ?? 0.3;
}
