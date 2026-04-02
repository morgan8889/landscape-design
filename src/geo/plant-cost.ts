import type { PlantAssignment, Zone } from "../types";

export function calculateAssignmentCost(
  quantity: number,
  assignmentCostOverride: number | undefined,
  catalogCost: number,
): number {
  const unitCost = assignmentCostOverride ?? catalogCost;
  return quantity * unitCost;
}

export function calculateZoneCost(
  assignments: PlantAssignment[],
  getCatalogCost: (plantId: string) => number,
): number {
  let total = 0;
  for (const a of assignments) {
    total += calculateAssignmentCost(
      a.quantity,
      a.costPerUnit,
      getCatalogCost(a.plantId),
    );
  }
  return total;
}

export function calculateProjectCost(
  zones: Zone[],
  getCatalogCost: (plantId: string) => number,
): number {
  let total = 0;
  for (const zone of zones) {
    total += calculateZoneCost(zone.plants ?? [], getCatalogCost);
  }
  return total;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
