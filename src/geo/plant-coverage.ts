import type { PlantAssignment } from "../types";

export function calculatePlantQuantity(
  areaSqFt: number,
  spacingInches: number,
): number {
  if (spacingInches <= 0) {
    throw new Error("spacing must be greater than 0");
  }
  if (areaSqFt <= 0) return 0;

  const spacingFt = spacingInches / 12;
  const sideLength = Math.sqrt(areaSqFt);
  const plantsPerRow = Math.floor(sideLength / spacingFt);
  return plantsPerRow * plantsPerRow;
}

export function calculateCoveragePercent(
  areaSqFt: number,
  assignments: PlantAssignment[],
  getSpacingInches: (plantId: string) => number,
): number {
  if (areaSqFt <= 0 || assignments.length === 0) return 0;

  let totalCoverage = 0;
  for (const a of assignments) {
    const spacingFt = getSpacingInches(a.plantId) / 12;
    totalCoverage += a.quantity * spacingFt * spacingFt;
  }

  return (totalCoverage / areaSqFt) * 100;
}
