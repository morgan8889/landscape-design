import type { PlantInfo, Zone } from "../types";

export interface MonthSummary {
  month: number;
  bloomingPlants: string[];
  foliagePlants: string[];
  totalInterest: number;
}

export interface BloomTimeline {
  months: MonthSummary[];
  gapMonths: number[];
  plantCount: number;
  plantIds: string[];
}

export function buildBloomTimeline(
  zones: Zone[],
  getPlantInfo: (id: string) => PlantInfo | null,
): BloomTimeline {
  const months: MonthSummary[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    bloomingPlants: [],
    foliagePlants: [],
    totalInterest: 0,
  }));

  // Collect unique plant IDs across all zones
  const seen = new Set<string>();
  for (const zone of zones) {
    for (const assignment of zone.plants ?? []) {
      seen.add(assignment.plantId);
    }
  }

  let plantCount = 0;
  const plantIds: string[] = [];

  for (const plantId of seen) {
    const plant = getPlantInfo(plantId);
    if (!plant) continue;
    if (!plant.bloomMonths?.length && !plant.foliageMonths?.length) continue;

    plantCount++;
    plantIds.push(plantId);

    for (const month of plant.bloomMonths ?? []) {
      const entry = months[month - 1];
      if (!entry) continue;
      if (!entry.bloomingPlants.includes(plantId)) {
        entry.bloomingPlants.push(plantId);
      }
    }

    for (const month of plant.foliageMonths ?? []) {
      const entry = months[month - 1];
      if (!entry) continue;
      if (!entry.foliagePlants.includes(plantId)) {
        entry.foliagePlants.push(plantId);
      }
    }
  }

  // Compute totalInterest (deduplicated union of bloom + foliage per month)
  // Only flag gaps when at least one plant has data (plantCount > 0)
  const gapMonths: number[] = [];
  for (const entry of months) {
    const active = new Set([...entry.bloomingPlants, ...entry.foliagePlants]);
    entry.totalInterest = active.size;
    if (plantCount > 0 && entry.totalInterest === 0) {
      gapMonths.push(entry.month);
    }
  }

  return { months, gapMonths, plantCount, plantIds };
}
