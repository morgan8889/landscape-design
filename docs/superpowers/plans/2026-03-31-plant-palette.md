# Plant Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users browse a curated plant catalog, assign plants to zones, and see coverage calculations (how many plants to buy).

**Architecture:** Zone-first flow — user selects an existing zone, browses compatible plants in an overlay, adds them with auto-calculated quantities. Plant data is a static TypeScript module (~60 entries). Plant assignments are stored on the Zone object and persist via existing localStorage.

**Tech Stack:** Vanilla TypeScript, Vitest, Playwright, Biome. No new dependencies.

---

### Task 1: Types and Coverage Math

**Files:**
- Modify: `src/types.ts`
- Create: `src/geo/plant-coverage.ts`
- Create: `src/geo/plant-coverage.test.ts`

- [ ] **Step 1: Add types to `src/types.ts`**

Add after the existing `Zone` interface:

```typescript
export type PlantCategory =
  | "perennial"
  | "annual"
  | "shrub"
  | "ground-cover"
  | "grass"
  | "tree";

export type Sun = "full-sun" | "partial-shade" | "full-shade";
export type Water = "low" | "moderate" | "high";

export interface PlantInfo {
  id: string;
  name: string;
  category: PlantCategory;
  sunRequirement: Sun;
  waterNeed: Water;
  spacingInches: number;
  matureHeightFt: number;
  matureWidthFt: number;
  emoji: string;
  tags: string[];
  zoneCompatibility: ZoneCategory[];
}

export interface PlantAssignment {
  plantId: string;
  quantity: number;
  calculatedQuantity: number;
}
```

Add `plants` field to the `Zone` interface:

```typescript
export interface Zone {
  id: string;
  category: ZoneCategory;
  vertices: LatLng[];
  areaSqFt: number;
  plants?: PlantAssignment[];
}
```

- [ ] **Step 2: Write failing tests for coverage math**

Create `src/geo/plant-coverage.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { calculatePlantQuantity, calculateCoveragePercent } from "./plant-coverage";
import type { PlantAssignment } from "../types";

describe("calculatePlantQuantity", () => {
  it("calculates grid-based quantity for a standard zone", () => {
    // 320 sq ft, 18" spacing → spacingFt=1.5, plantsPerRow=floor(17.89/1.5)=11, total=121
    expect(calculatePlantQuantity(320, 18)).toBe(121);
  });

  it("returns 0 for zero area", () => {
    expect(calculatePlantQuantity(0, 18)).toBe(0);
  });

  it("returns 1 for very small area with large spacing", () => {
    // 1 sq ft, 24" spacing → spacingFt=2, plantsPerRow=floor(1/2)=0, but min 1 if area > 0
    // Actually floor(1/2)=0, 0*0=0 — should return 0 since nothing fits
    expect(calculatePlantQuantity(1, 24)).toBe(0);
  });

  it("handles 12-inch spacing", () => {
    // 100 sq ft, 12" spacing → spacingFt=1, plantsPerRow=floor(10/1)=10, total=100
    expect(calculatePlantQuantity(100, 12)).toBe(100);
  });

  it("throws for zero spacing", () => {
    expect(() => calculatePlantQuantity(100, 0)).toThrow("spacing must be greater than 0");
  });
});

describe("calculateCoveragePercent", () => {
  it("calculates coverage for a single plant type", () => {
    const assignments: PlantAssignment[] = [
      { plantId: "lavender", quantity: 121, calculatedQuantity: 121 },
    ];
    // 121 plants * (1.5ft)^2 = 121 * 2.25 = 272.25 sq ft / 320 = 85.08%
    const result = calculateCoveragePercent(320, assignments, (id) =>
      id === "lavender" ? 18 : 0
    );
    expect(result).toBeCloseTo(85.08, 0);
  });

  it("returns 0 for no assignments", () => {
    expect(calculateCoveragePercent(320, [], () => 0)).toBe(0);
  });

  it("returns 0 for zero area", () => {
    const assignments: PlantAssignment[] = [
      { plantId: "lavender", quantity: 10, calculatedQuantity: 10 },
    ];
    expect(calculateCoveragePercent(0, assignments, () => 18)).toBe(0);
  });

  it("can exceed 100%", () => {
    const assignments: PlantAssignment[] = [
      { plantId: "a", quantity: 200, calculatedQuantity: 100 },
    ];
    // 200 * (1.5)^2 = 450 / 320 = 140.6%
    const result = calculateCoveragePercent(320, assignments, () => 18);
    expect(result).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/geo/plant-coverage.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement coverage math**

Create `src/geo/plant-coverage.ts`:

```typescript
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/geo/plant-coverage.test.ts`
Expected: All 9 tests PASS

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: All tests pass (existing + new)

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/geo/plant-coverage.ts src/geo/plant-coverage.test.ts
git commit -m "feat: add plant types and coverage calculation

Add PlantInfo, PlantAssignment types. Zone gains optional plants array.
calculatePlantQuantity uses grid-based spacing formula.
calculateCoveragePercent sums plant footprints vs zone area."
```

---

### Task 2: Plant Catalog

**Files:**
- Create: `src/data/plant-catalog.ts`
- Create: `src/data/plant-catalog.test.ts`

- [ ] **Step 1: Write failing tests for catalog helpers**

Create `src/data/plant-catalog.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  getPlantById,
  getPlantsForZone,
  searchPlants,
  PLANT_CATALOG,
} from "./plant-catalog";

describe("PLANT_CATALOG", () => {
  it("contains at least 50 plants", () => {
    expect(PLANT_CATALOG.length).toBeGreaterThanOrEqual(50);
  });

  it("every plant has required fields", () => {
    for (const plant of PLANT_CATALOG) {
      expect(plant.id).toBeTruthy();
      expect(plant.name).toBeTruthy();
      expect(plant.spacingInches).toBeGreaterThan(0);
      expect(plant.zoneCompatibility.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate IDs", () => {
    const ids = PLANT_CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getPlantById", () => {
  it("returns plant for valid ID", () => {
    const plant = getPlantById("lavender");
    expect(plant).toBeDefined();
    expect(plant!.name).toBe("Lavender");
  });

  it("returns undefined for unknown ID", () => {
    expect(getPlantById("nonexistent")).toBeUndefined();
  });
});

describe("getPlantsForZone", () => {
  it("returns only plants compatible with garden-bed", () => {
    const plants = getPlantsForZone("garden-bed");
    expect(plants.length).toBeGreaterThan(0);
    for (const p of plants) {
      expect(p.zoneCompatibility).toContain("garden-bed");
    }
  });

  it("returns only plants compatible with lawn", () => {
    const plants = getPlantsForZone("lawn");
    expect(plants.length).toBeGreaterThan(0);
    for (const p of plants) {
      expect(p.zoneCompatibility).toContain("lawn");
    }
  });
});

describe("searchPlants", () => {
  it("finds plants by name substring", () => {
    const results = searchPlants("lav", "garden-bed");
    expect(results.some((p) => p.id === "lavender")).toBe(true);
  });

  it("is case-insensitive", () => {
    const results = searchPlants("LAV", "garden-bed");
    expect(results.some((p) => p.id === "lavender")).toBe(true);
  });

  it("returns all compatible plants for empty query", () => {
    const all = getPlantsForZone("garden-bed");
    const searched = searchPlants("", "garden-bed");
    expect(searched.length).toBe(all.length);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/data/plant-catalog.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement plant catalog**

Create `src/data/plant-catalog.ts`:

```typescript
import type { PlantInfo, ZoneCategory } from "../types";

export const PLANT_CATALOG: PlantInfo[] = [
  // === Perennials ===
  { id: "lavender", name: "Lavender", category: "perennial", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 18, matureHeightFt: 2, matureWidthFt: 2, emoji: "🌿", tags: ["drought-tolerant", "pollinator", "fragrant"], zoneCompatibility: ["garden-bed"] },
  { id: "hosta-blue", name: "Hosta (Blue Angel)", category: "perennial", sunRequirement: "full-shade", waterNeed: "moderate", spacingInches: 24, matureHeightFt: 3, matureWidthFt: 4, emoji: "🌱", tags: ["shade-loving", "foliage"], zoneCompatibility: ["garden-bed"] },
  { id: "black-eyed-susan", name: "Black-Eyed Susan", category: "perennial", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 12, matureHeightFt: 3, matureWidthFt: 2, emoji: "🌻", tags: ["native", "pollinator", "drought-tolerant"], zoneCompatibility: ["garden-bed"] },
  { id: "daylily", name: "Daylily", category: "perennial", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 18, matureHeightFt: 3, matureWidthFt: 2, emoji: "🌸", tags: ["low-maintenance", "colorful"], zoneCompatibility: ["garden-bed"] },
  { id: "coneflower", name: "Coneflower (Echinacea)", category: "perennial", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 18, matureHeightFt: 4, matureWidthFt: 2, emoji: "🌼", tags: ["native", "pollinator", "drought-tolerant"], zoneCompatibility: ["garden-bed"] },
  { id: "sedum", name: "Sedum (Stonecrop)", category: "perennial", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 12, matureHeightFt: 1, matureWidthFt: 1.5, emoji: "🪴", tags: ["drought-tolerant", "succulent", "ground-cover"], zoneCompatibility: ["garden-bed", "path"] },
  { id: "astilbe", name: "Astilbe", category: "perennial", sunRequirement: "partial-shade", waterNeed: "high", spacingInches: 18, matureHeightFt: 2.5, matureWidthFt: 2, emoji: "🌸", tags: ["shade-loving", "colorful"], zoneCompatibility: ["garden-bed"] },
  { id: "peony", name: "Peony", category: "perennial", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 36, matureHeightFt: 3, matureWidthFt: 3, emoji: "🌺", tags: ["fragrant", "colorful", "long-lived"], zoneCompatibility: ["garden-bed"] },
  { id: "bee-balm", name: "Bee Balm", category: "perennial", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 18, matureHeightFt: 3, matureWidthFt: 2, emoji: "🌺", tags: ["native", "pollinator", "fragrant"], zoneCompatibility: ["garden-bed"] },
  { id: "coral-bells", name: "Coral Bells (Heuchera)", category: "perennial", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 12, matureHeightFt: 1.5, matureWidthFt: 1.5, emoji: "🍂", tags: ["foliage", "shade-loving", "colorful"], zoneCompatibility: ["garden-bed"] },
  { id: "russian-sage", name: "Russian Sage", category: "perennial", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 24, matureHeightFt: 4, matureWidthFt: 3, emoji: "🌿", tags: ["drought-tolerant", "pollinator"], zoneCompatibility: ["garden-bed"] },
  { id: "catmint", name: "Catmint (Nepeta)", category: "perennial", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 18, matureHeightFt: 2, matureWidthFt: 2, emoji: "🌿", tags: ["drought-tolerant", "pollinator", "fragrant"], zoneCompatibility: ["garden-bed", "path"] },
  { id: "iris", name: "Iris (Bearded)", category: "perennial", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 18, matureHeightFt: 3, matureWidthFt: 1.5, emoji: "💜", tags: ["colorful", "fragrant"], zoneCompatibility: ["garden-bed"] },
  { id: "phlox", name: "Garden Phlox", category: "perennial", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 18, matureHeightFt: 4, matureWidthFt: 2, emoji: "🌸", tags: ["pollinator", "colorful", "fragrant"], zoneCompatibility: ["garden-bed"] },
  { id: "salvia", name: "Salvia (Perennial)", category: "perennial", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 18, matureHeightFt: 3, matureWidthFt: 2, emoji: "🌿", tags: ["pollinator", "drought-tolerant"], zoneCompatibility: ["garden-bed"] },

  // === Annuals ===
  { id: "marigold", name: "Marigold", category: "annual", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 10, matureHeightFt: 1, matureWidthFt: 1, emoji: "🌼", tags: ["colorful", "pest-deterrent"], zoneCompatibility: ["garden-bed"] },
  { id: "petunia", name: "Petunia", category: "annual", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 12, matureHeightFt: 1, matureWidthFt: 1.5, emoji: "🌸", tags: ["colorful", "trailing"], zoneCompatibility: ["garden-bed", "patio"] },
  { id: "zinnia", name: "Zinnia", category: "annual", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 12, matureHeightFt: 3, matureWidthFt: 1, emoji: "🌺", tags: ["pollinator", "colorful"], zoneCompatibility: ["garden-bed"] },
  { id: "impatiens", name: "Impatiens", category: "annual", sunRequirement: "full-shade", waterNeed: "high", spacingInches: 10, matureHeightFt: 1, matureWidthFt: 1, emoji: "🌸", tags: ["shade-loving", "colorful"], zoneCompatibility: ["garden-bed"] },
  { id: "begonia", name: "Begonia", category: "annual", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 10, matureHeightFt: 1, matureWidthFt: 1, emoji: "🌺", tags: ["shade-loving", "colorful"], zoneCompatibility: ["garden-bed", "patio"] },
  { id: "geranium-annual", name: "Geranium (Annual)", category: "annual", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 12, matureHeightFt: 1.5, matureWidthFt: 1.5, emoji: "🌺", tags: ["colorful"], zoneCompatibility: ["garden-bed", "patio"] },
  { id: "snapdragon", name: "Snapdragon", category: "annual", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 10, matureHeightFt: 2, matureWidthFt: 1, emoji: "🌸", tags: ["colorful", "pollinator"], zoneCompatibility: ["garden-bed"] },
  { id: "cosmos", name: "Cosmos", category: "annual", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 18, matureHeightFt: 4, matureWidthFt: 2, emoji: "🌸", tags: ["pollinator", "drought-tolerant"], zoneCompatibility: ["garden-bed"] },

  // === Shrubs ===
  { id: "boxwood", name: "Boxwood", category: "shrub", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 36, matureHeightFt: 4, matureWidthFt: 4, emoji: "🌳", tags: ["evergreen", "hedge"], zoneCompatibility: ["garden-bed", "path"] },
  { id: "hydrangea", name: "Hydrangea", category: "shrub", sunRequirement: "partial-shade", waterNeed: "high", spacingInches: 48, matureHeightFt: 5, matureWidthFt: 5, emoji: "💐", tags: ["colorful", "shade-loving"], zoneCompatibility: ["garden-bed"] },
  { id: "azalea", name: "Azalea", category: "shrub", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 36, matureHeightFt: 4, matureWidthFt: 4, emoji: "🌺", tags: ["colorful", "evergreen"], zoneCompatibility: ["garden-bed"] },
  { id: "rose-knockout", name: "Rose (Knockout)", category: "shrub", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 36, matureHeightFt: 4, matureWidthFt: 3, emoji: "🌹", tags: ["colorful", "fragrant", "low-maintenance"], zoneCompatibility: ["garden-bed"] },
  { id: "holly", name: "Holly", category: "shrub", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 48, matureHeightFt: 8, matureWidthFt: 6, emoji: "🎄", tags: ["evergreen", "native"], zoneCompatibility: ["garden-bed"] },
  { id: "lilac", name: "Lilac", category: "shrub", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 60, matureHeightFt: 10, matureWidthFt: 8, emoji: "💜", tags: ["fragrant", "colorful", "pollinator"], zoneCompatibility: ["garden-bed"] },
  { id: "butterfly-bush", name: "Butterfly Bush", category: "shrub", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 48, matureHeightFt: 6, matureWidthFt: 5, emoji: "🦋", tags: ["pollinator", "drought-tolerant"], zoneCompatibility: ["garden-bed"] },
  { id: "spirea", name: "Spirea", category: "shrub", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 36, matureHeightFt: 4, matureWidthFt: 4, emoji: "🌿", tags: ["low-maintenance", "colorful"], zoneCompatibility: ["garden-bed"] },
  { id: "juniper-shrub", name: "Juniper (Blue Star)", category: "shrub", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 36, matureHeightFt: 3, matureWidthFt: 4, emoji: "🌲", tags: ["evergreen", "drought-tolerant"], zoneCompatibility: ["garden-bed", "path"] },

  // === Ground Covers ===
  { id: "creeping-thyme", name: "Creeping Thyme", category: "ground-cover", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 8, matureHeightFt: 0.25, matureWidthFt: 1, emoji: "🌿", tags: ["drought-tolerant", "fragrant", "pollinator"], zoneCompatibility: ["garden-bed", "path"] },
  { id: "pachysandra", name: "Pachysandra", category: "ground-cover", sunRequirement: "full-shade", waterNeed: "moderate", spacingInches: 8, matureHeightFt: 0.5, matureWidthFt: 1, emoji: "🌱", tags: ["shade-loving", "evergreen"], zoneCompatibility: ["garden-bed", "path"] },
  { id: "vinca", name: "Vinca (Periwinkle)", category: "ground-cover", sunRequirement: "partial-shade", waterNeed: "low", spacingInches: 10, matureHeightFt: 0.5, matureWidthFt: 1.5, emoji: "💜", tags: ["shade-loving", "drought-tolerant"], zoneCompatibility: ["garden-bed", "path"] },
  { id: "ajuga", name: "Ajuga (Bugleweed)", category: "ground-cover", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 10, matureHeightFt: 0.5, matureWidthFt: 1, emoji: "💜", tags: ["shade-loving", "pollinator"], zoneCompatibility: ["garden-bed", "path"] },
  { id: "irish-moss", name: "Irish Moss", category: "ground-cover", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 6, matureHeightFt: 0.1, matureWidthFt: 0.5, emoji: "🌱", tags: ["stepping-stone", "low-growing"], zoneCompatibility: ["garden-bed", "path", "patio"] },
  { id: "sedum-ground", name: "Sedum (Ground Cover)", category: "ground-cover", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 8, matureHeightFt: 0.25, matureWidthFt: 1, emoji: "🪴", tags: ["drought-tolerant", "succulent"], zoneCompatibility: ["garden-bed", "path"] },
  { id: "liriope", name: "Liriope (Lilyturf)", category: "ground-cover", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 12, matureHeightFt: 1, matureWidthFt: 1.5, emoji: "🌱", tags: ["shade-loving", "evergreen"], zoneCompatibility: ["garden-bed", "path"] },

  // === Grasses ===
  { id: "fountain-grass", name: "Fountain Grass", category: "grass", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 36, matureHeightFt: 4, matureWidthFt: 3, emoji: "🌾", tags: ["ornamental", "drought-tolerant"], zoneCompatibility: ["garden-bed", "lawn"] },
  { id: "blue-fescue", name: "Blue Fescue", category: "grass", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 12, matureHeightFt: 1, matureWidthFt: 1, emoji: "🌾", tags: ["ornamental", "drought-tolerant", "blue"], zoneCompatibility: ["garden-bed", "lawn"] },
  { id: "mondo-grass", name: "Mondo Grass", category: "grass", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 6, matureHeightFt: 0.5, matureWidthFt: 1, emoji: "🌱", tags: ["ground-cover", "shade-loving"], zoneCompatibility: ["garden-bed", "path", "lawn"] },
  { id: "karl-foerster", name: "Karl Foerster Grass", category: "grass", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 24, matureHeightFt: 5, matureWidthFt: 2, emoji: "🌾", tags: ["ornamental", "vertical-accent"], zoneCompatibility: ["garden-bed"] },
  { id: "switchgrass", name: "Switchgrass", category: "grass", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 36, matureHeightFt: 5, matureWidthFt: 3, emoji: "🌾", tags: ["native", "ornamental", "drought-tolerant"], zoneCompatibility: ["garden-bed", "lawn"] },
  { id: "bermuda-grass", name: "Bermuda Grass (sod)", category: "grass", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 6, matureHeightFt: 0.25, matureWidthFt: 1, emoji: "🌱", tags: ["lawn", "turf"], zoneCompatibility: ["lawn"] },
  { id: "fescue-lawn", name: "Tall Fescue (sod)", category: "grass", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 6, matureHeightFt: 0.5, matureWidthFt: 1, emoji: "🌱", tags: ["lawn", "turf", "shade-tolerant"], zoneCompatibility: ["lawn"] },
  { id: "zoysia", name: "Zoysia Grass (sod)", category: "grass", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 6, matureHeightFt: 0.25, matureWidthFt: 1, emoji: "🌱", tags: ["lawn", "turf", "drought-tolerant"], zoneCompatibility: ["lawn"] },

  // === Trees ===
  { id: "japanese-maple", name: "Japanese Maple", category: "tree", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 120, matureHeightFt: 20, matureWidthFt: 20, emoji: "🍁", tags: ["ornamental", "colorful"], zoneCompatibility: ["garden-bed"] },
  { id: "dogwood", name: "Dogwood", category: "tree", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 180, matureHeightFt: 25, matureWidthFt: 25, emoji: "🌸", tags: ["native", "colorful", "pollinator"], zoneCompatibility: ["garden-bed"] },
  { id: "crape-myrtle", name: "Crape Myrtle", category: "tree", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 120, matureHeightFt: 20, matureWidthFt: 15, emoji: "🌳", tags: ["colorful", "drought-tolerant"], zoneCompatibility: ["garden-bed"] },
  { id: "redbud", name: "Eastern Redbud", category: "tree", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 180, matureHeightFt: 25, matureWidthFt: 25, emoji: "🌸", tags: ["native", "colorful"], zoneCompatibility: ["garden-bed"] },
  { id: "magnolia", name: "Magnolia (Saucer)", category: "tree", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 180, matureHeightFt: 25, matureWidthFt: 25, emoji: "🌸", tags: ["fragrant", "colorful"], zoneCompatibility: ["garden-bed"] },
  { id: "river-birch", name: "River Birch", category: "tree", sunRequirement: "full-sun", waterNeed: "high", spacingInches: 240, matureHeightFt: 50, matureWidthFt: 35, emoji: "🌳", tags: ["native", "shade-tree"], zoneCompatibility: ["garden-bed", "lawn"] },

  // === Patio / Deck plants (container-friendly) ===
  { id: "dwarf-boxwood", name: "Dwarf Boxwood", category: "shrub", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 24, matureHeightFt: 2, matureWidthFt: 2, emoji: "🌳", tags: ["evergreen", "container"], zoneCompatibility: ["patio", "deck", "garden-bed"] },
  { id: "ornamental-pepper", name: "Ornamental Pepper", category: "annual", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 12, matureHeightFt: 1, matureWidthFt: 1, emoji: "🌶️", tags: ["colorful", "container"], zoneCompatibility: ["patio", "deck"] },
  { id: "trailing-rosemary", name: "Trailing Rosemary", category: "perennial", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 24, matureHeightFt: 1, matureWidthFt: 3, emoji: "🌿", tags: ["fragrant", "drought-tolerant", "edible", "container"], zoneCompatibility: ["patio", "deck", "garden-bed"] },
  { id: "potted-palm", name: "Potted Palm", category: "tree", sunRequirement: "partial-shade", waterNeed: "moderate", spacingInches: 48, matureHeightFt: 6, matureWidthFt: 4, emoji: "🌴", tags: ["tropical", "container"], zoneCompatibility: ["patio", "deck", "pool"] },
  { id: "hibiscus", name: "Hibiscus", category: "shrub", sunRequirement: "full-sun", waterNeed: "high", spacingInches: 48, matureHeightFt: 5, matureWidthFt: 4, emoji: "🌺", tags: ["tropical", "colorful", "container"], zoneCompatibility: ["patio", "deck", "pool", "garden-bed"] },
  { id: "bird-of-paradise", name: "Bird of Paradise", category: "perennial", sunRequirement: "full-sun", waterNeed: "moderate", spacingInches: 48, matureHeightFt: 5, matureWidthFt: 4, emoji: "🌺", tags: ["tropical", "colorful", "container"], zoneCompatibility: ["patio", "deck", "pool"] },
  { id: "bougainvillea", name: "Bougainvillea", category: "shrub", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 60, matureHeightFt: 10, matureWidthFt: 8, emoji: "🌺", tags: ["colorful", "drought-tolerant", "climbing"], zoneCompatibility: ["patio", "pool", "garden-bed"] },

  // === Pool area ===
  { id: "agapanthus", name: "Agapanthus", category: "perennial", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 18, matureHeightFt: 2, matureWidthFt: 2, emoji: "💜", tags: ["drought-tolerant", "colorful"], zoneCompatibility: ["pool", "garden-bed"] },
  { id: "dwarf-palmetto", name: "Dwarf Palmetto", category: "shrub", sunRequirement: "full-sun", waterNeed: "low", spacingInches: 48, matureHeightFt: 5, matureWidthFt: 5, emoji: "🌴", tags: ["native", "tropical"], zoneCompatibility: ["pool", "garden-bed"] },
];

const plantMap = new Map(PLANT_CATALOG.map((p) => [p.id, p]));

export function getPlantById(id: string): PlantInfo | undefined {
  return plantMap.get(id);
}

export function getPlantsForZone(zoneCategory: ZoneCategory): PlantInfo[] {
  return PLANT_CATALOG.filter((p) =>
    p.zoneCompatibility.includes(zoneCategory)
  );
}

export function searchPlants(
  query: string,
  zoneCategory: ZoneCategory,
): PlantInfo[] {
  const compatible = getPlantsForZone(zoneCategory);
  if (!query.trim()) return compatible;
  const lower = query.toLowerCase();
  return compatible.filter((p) => p.name.toLowerCase().includes(lower));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/data/plant-catalog.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/data/plant-catalog.ts src/data/plant-catalog.test.ts
git commit -m "feat: add curated plant catalog with 60 plants

Static PlantInfo array with perennials, annuals, shrubs, ground covers,
grasses, and trees. Helper functions: getPlantById, getPlantsForZone,
searchPlants. Each plant has realistic spacing, sun/water needs, and
zone compatibility mappings."
```

---

### Task 3: Plant Browser Component

**Files:**
- Create: `src/components/plant-browser.ts`
- Modify: `src/style.css`

- [ ] **Step 1: Create plant browser component**

Create `src/components/plant-browser.ts`:

```typescript
import type { PlantInfo, Zone } from "../types";
import { getPlantsForZone, searchPlants } from "../data/plant-catalog";
import { calculatePlantQuantity } from "../geo/plant-coverage";

export function renderPlantBrowser(
  container: HTMLElement,
  zone: Zone,
  onAdd: (plantId: string, quantity: number, calculatedQuantity: number) => void,
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
  title.textContent = `Plants for ${zone.category.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}`;
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
      const sunLabel = plant.sunRequirement.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const waterLabel = plant.waterNeed.charAt(0).toUpperCase() + plant.waterNeed.slice(1);
      meta.textContent = `${plant.category} · ${sunLabel} · ${waterLabel} Water · ${plant.spacingInches}" spacing`;
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
        const calcQty = calculatePlantQuantity(zone.areaSqFt, plant.spacingInches);
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

        const confirmBtn = document.createElement("button");
        confirmBtn.className = "btn btn-primary plant-confirm-btn";
        confirmBtn.textContent = "Confirm";
        confirmBtn.addEventListener("click", () => {
          const qty = Number.parseInt(qtyInput.value, 10) || calcQty;
          onAdd(plant.id, qty, calcQty);
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
        confirm.append(calcLabel, inputRow);
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
```

- [ ] **Step 2: Add plant browser CSS to `src/style.css`**

Append to the end of `src/style.css`:

```css
/* Plant Browser Overlay */
.plant-browser-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.plant-browser {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  width: 90%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.plant-browser-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.plant-browser-header h3 {
  margin: 0 0 4px 0;
}

.plant-browser-subtitle {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.plant-browser-close {
  font-size: 0.8rem;
  padding: 4px 10px;
}

.plant-search-input {
  margin: 12px 16px;
  padding: 10px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.875rem;
  outline: none;
}

.plant-search-input:focus {
  border-color: var(--blue);
}

.plant-filter-bar {
  display: flex;
  gap: 6px;
  padding: 0 16px 12px;
  flex-wrap: wrap;
}

.plant-filter-chip {
  padding: 4px 10px;
  border-radius: 12px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.plant-filter-chip.active {
  background: var(--blue);
  color: #fff;
}

.plant-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plant-list-empty {
  color: var(--text-muted);
  text-align: center;
  padding: 24px;
}

.plant-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.plant-row-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.plant-emoji {
  font-size: 1.5rem;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--border);
  border-radius: var(--radius);
}

.plant-details {
  min-width: 0;
}

.plant-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.plant-meta {
  color: var(--text-muted);
  font-size: 0.75rem;
  margin-top: 2px;
}

.plant-add-btn {
  background: #22c55e;
  color: #fff;
  font-size: 0.75rem;
  padding: 6px 12px;
  white-space: nowrap;
}

/* Plant confirm inline */
.plant-confirm {
  padding: 12px;
  background: var(--surface);
  border: 2px solid #22c55e;
  border-radius: var(--radius);
}

.plant-calc-label {
  color: var(--text-muted);
  font-size: 0.8rem;
  margin-bottom: 8px;
}

.plant-confirm-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.plant-qty-label {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.plant-qty-input {
  width: 64px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  text-align: center;
}

.plant-qty-recommended {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.plant-confirm-btn {
  font-size: 0.8rem;
  padding: 6px 14px;
}

.plant-cancel-btn {
  font-size: 0.8rem;
  padding: 6px 10px;
}
```

- [ ] **Step 3: Run typecheck and lint**

Run: `npm run typecheck && npx biome check ./src`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/plant-browser.ts src/style.css
git commit -m "feat: add plant browser overlay component

Searchable plant list filtered by zone type. Includes filter chips
for sun/water/tags, inline add confirmation with calculated quantity
and editable override. Styled to match existing dark theme."
```

---

### Task 4: Zone Detail Component

**Files:**
- Create: `src/components/zone-detail.ts`

- [ ] **Step 1: Create zone detail component**

Create `src/components/zone-detail.ts`:

```typescript
import type { PlantAssignment, Zone } from "../types";
import { getPlantById } from "../data/plant-catalog";
import { getCategoryColor, getCategoryLabel } from "./zone-categories";
import { calculateCoveragePercent } from "../geo/plant-coverage";

export function formatCoverage(percent: number): string {
  if (percent > 100) return ">100%";
  return `~${Math.round(percent)}%`;
}

export function renderZoneDetail(
  container: HTMLElement,
  zone: Zone,
  onAddPlants: () => void,
  onRemovePlant: (plantId: string) => void,
): void {
  const card = document.createElement("div");
  card.className = "zone-item zone-detail-card";

  // Zone header
  const header = document.createElement("div");
  header.className = "zone-detail-header";

  const labelGroup = document.createElement("div");
  labelGroup.className = "zone-detail-label-group";

  const dot = document.createElement("span");
  dot.className = "zone-dot";
  dot.style.backgroundColor = getCategoryColor(zone.category);

  const name = document.createElement("span");
  name.className = "zone-label";
  name.textContent = getCategoryLabel(zone.category);

  labelGroup.append(dot, name);

  const area = document.createElement("span");
  area.className = "zone-detail-area";
  area.textContent = `${Math.round(zone.areaSqFt)} sq ft`;

  header.append(labelGroup, area);
  card.appendChild(header);

  const plants = zone.plants ?? [];

  if (plants.length > 0) {
    // Plant list
    const plantList = document.createElement("div");
    plantList.className = "zone-plant-list";

    for (const assignment of plants) {
      const info = getPlantById(assignment.plantId);
      if (!info) continue;

      const row = document.createElement("div");
      row.className = "zone-plant-row";

      const left = document.createElement("div");
      left.className = "zone-plant-left";
      const emoji = document.createElement("span");
      emoji.textContent = info.emoji;
      const plantName = document.createElement("span");
      plantName.textContent = info.name;
      left.append(emoji, plantName);

      const right = document.createElement("div");
      right.className = "zone-plant-right";
      const qty = document.createElement("span");
      qty.className = "zone-plant-qty";
      qty.textContent = `×${assignment.quantity}`;
      const removeBtn = document.createElement("button");
      removeBtn.className = "zone-plant-remove";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => onRemovePlant(assignment.plantId));
      right.append(qty, removeBtn);

      row.append(left, right);
      plantList.appendChild(row);
    }

    card.appendChild(plantList);

    // Coverage summary
    const coverageBar = document.createElement("div");
    coverageBar.className = "zone-coverage";

    const coverageLabel = document.createElement("div");
    coverageLabel.className = "zone-coverage-label";
    coverageLabel.textContent = "Coverage";

    const coverageStats = document.createElement("div");
    coverageStats.className = "zone-coverage-stats";

    const totalPlants = plants.reduce((sum, a) => sum + a.quantity, 0);
    const countText = document.createElement("span");
    countText.textContent = `${plants.length} plant type${plants.length === 1 ? "" : "s"} · ${totalPlants} total`;

    const percent = calculateCoveragePercent(
      zone.areaSqFt,
      plants,
      (id) => getPlantById(id)?.spacingInches ?? 0,
    );
    const percentText = document.createElement("span");
    percentText.className = "zone-coverage-percent";
    percentText.textContent = formatCoverage(percent);

    coverageStats.append(countText, percentText);
    coverageBar.append(coverageLabel, coverageStats);
    card.appendChild(coverageBar);
  } else {
    const empty = document.createElement("div");
    empty.className = "zone-detail-empty";
    empty.textContent = "No plants assigned";
    card.appendChild(empty);
  }

  // Actions
  const actions = document.createElement("div");
  actions.className = "zone-detail-actions";

  const addBtn = document.createElement("button");
  addBtn.className = "btn btn-primary zone-detail-add-btn";
  addBtn.textContent = plants.length > 0 ? "Add More Plants" : "Add Plants";
  addBtn.addEventListener("click", onAddPlants);

  actions.appendChild(addBtn);
  card.appendChild(actions);

  container.appendChild(card);
}
```

- [ ] **Step 2: Add zone detail CSS to `src/style.css`**

Append to `src/style.css`:

```css
/* Zone Detail (with plants) */
.zone-detail-card {
  flex-direction: column;
  gap: 0;
}

.zone-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 12px;
}

.zone-detail-label-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zone-detail-area {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.zone-plant-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  width: 100%;
}

.zone-plant-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: var(--bg);
  border-radius: 6px;
}

.zone-plant-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
}

.zone-plant-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zone-plant-qty {
  color: #22c55e;
  font-size: 0.8rem;
  font-weight: 500;
}

.zone-plant-remove {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 2px 6px;
}

.zone-coverage {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  margin-bottom: 12px;
  width: 100%;
  box-sizing: border-box;
}

.zone-coverage-label {
  color: var(--text-muted);
  font-size: 0.7rem;
  margin-bottom: 4px;
}

.zone-coverage-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.zone-coverage-percent {
  color: #f59e0b;
  font-weight: 500;
}

.zone-detail-empty {
  color: var(--text-muted);
  font-size: 0.8rem;
  margin-bottom: 12px;
}

.zone-detail-actions {
  width: 100%;
}

.zone-detail-add-btn {
  width: 100%;
  font-size: 0.8rem;
}
```

- [ ] **Step 3: Run typecheck and lint**

Run: `npm run typecheck && npx biome check ./src`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/zone-detail.ts src/style.css
git commit -m "feat: add zone detail component with plant list and coverage

Zone card expanded view shows assigned plants with quantities,
coverage percentage, and add/remove controls. formatCoverage
helper handles >100% display."
```

---

### Task 5: Wire Into Main App

**Files:**
- Modify: `src/components/zone-summary.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Update zone-summary to use zone-detail and add "Add Plants" button**

Replace the content of `src/components/zone-summary.ts`:

```typescript
import type { YardDesign, Zone } from "../types";
import { renderZoneDetail } from "./zone-detail";

export function formatZoneArea(
  category: string,
  areaSqFt: number,
): string {
  const label = category.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `${label} — ${Math.round(areaSqFt).toLocaleString("en-US")} sq ft`;
}

export function getTotalZoneArea(zones: Zone[]): number {
  return zones.reduce((sum, z) => sum + z.areaSqFt, 0);
}

export function renderZoneSummary(
  container: HTMLElement,
  design: YardDesign,
  onDelete: (zoneId: string) => void,
  onAddZones: () => void,
  onAddPlants: (zoneId: string) => void,
  onRemovePlant: (zoneId: string, plantId: string) => void,
): void {
  const section = document.createElement("div");
  section.className = "zone-summary-section";

  const header = document.createElement("h3");
  const zones = design.zones ?? [];
  header.textContent = `${zones.length === 1 ? "Zone" : "Zones"} (${zones.length})`;
  section.appendChild(header);

  if (zones.length > 0) {
    const list = document.createElement("div");
    list.className = "zone-list";

    for (const zone of zones) {
      const wrapper = document.createElement("div");
      wrapper.className = "zone-item-wrapper";

      renderZoneDetail(
        wrapper,
        zone,
        () => onAddPlants(zone.id),
        (plantId) => onRemovePlant(zone.id, plantId),
      );

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "zone-delete zone-delete-bottom";
      deleteBtn.textContent = "Delete Zone";
      deleteBtn.addEventListener("click", () => onDelete(zone.id));
      wrapper.appendChild(deleteBtn);

      list.appendChild(wrapper);
    }
    section.appendChild(list);
  }

  const addBtn = document.createElement("button");
  addBtn.className = "btn btn-primary";
  addBtn.textContent = zones.length > 0 ? "Edit Zones" : "Add Zones";
  addBtn.addEventListener("click", onAddZones);

  section.appendChild(addBtn);
  container.appendChild(section);
}
```

- [ ] **Step 2: Update `src/main.ts` to wire plant browser**

Add import at the top of `src/main.ts`:

```typescript
import { renderPlantBrowser } from "./components/plant-browser";
import { getPlantById } from "./data/plant-catalog";
import { calculatePlantQuantity } from "./geo/plant-coverage";
```

Update the `renderSummary` function to pass plant callbacks:

```typescript
function renderSummary(design: YardDesign): void {
  const app = getApp();
  renderYardSummary(
    app,
    design,
    () => {
      if (design.imageMode) {
        renderImageDraw(
          design.imageMode.imageDataUrl,
          design.imageMode.pixelsPerFoot,
          design.imageMode.calibrationPoints,
          design.imageMode.calibrationDistanceFt,
        );
      } else {
        void renderMap(design.center, design.address);
      }
    },
    design.imageMode
      ? () => {
          window.alert(
            "Zone editing requires a map-based design. Upload a new design using an address to draw zones.",
          );
        }
      : () => void renderZoneEditor(design),
    (zoneId) => {
      design.zones = (design.zones ?? []).filter((z) => z.id !== zoneId);
      design.updatedAt = new Date().toISOString();
      saveDesign(design);
      renderSummary(design);
    },
    (zoneId) => {
      const zone = (design.zones ?? []).find((z) => z.id === zoneId);
      if (!zone) return;
      renderPlantBrowser(
        app,
        zone,
        (plantId, quantity, calculatedQuantity) => {
          if (!zone.plants) zone.plants = [];
          const existing = zone.plants.find((p) => p.plantId === plantId);
          if (existing) {
            existing.quantity += quantity;
            existing.calculatedQuantity = calculatedQuantity;
          } else {
            zone.plants.push({ plantId, quantity, calculatedQuantity });
          }
          design.updatedAt = new Date().toISOString();
          saveDesign(design);
          renderSummary(design);
        },
        () => renderSummary(design),
      );
    },
    (zoneId, plantId) => {
      const zone = (design.zones ?? []).find((z) => z.id === zoneId);
      if (!zone || !zone.plants) return;
      zone.plants = zone.plants.filter((p) => p.plantId !== plantId);
      design.updatedAt = new Date().toISOString();
      saveDesign(design);
      renderSummary(design);
    },
  );
}
```

- [ ] **Step 3: Update `renderYardSummary` signature in `src/components/yard-summary.ts`**

Update the function signature and the `renderZoneSummary` call:

```typescript
export function renderYardSummary(
  container: HTMLElement,
  design: YardDesign,
  onEdit: () => void,
  onAddZones?: () => void,
  onDeleteZone?: (zoneId: string) => void,
  onAddPlants?: (zoneId: string) => void,
  onRemovePlant?: (zoneId: string, plantId: string) => void,
): void {
```

Update the `renderZoneSummary` call inside `renderYardSummary` (around line 86-95):

```typescript
  if (onAddZones) {
    renderZoneSummary(
      wrapper,
      design,
      (zoneId) => {
        if (onDeleteZone) onDeleteZone(zoneId);
      },
      onAddZones,
      (zoneId) => {
        if (onAddPlants) onAddPlants(zoneId);
      },
      (zoneId, plantId) => {
        if (onRemovePlant) onRemovePlant(zoneId, plantId);
      },
    );
  }
```

- [ ] **Step 4: Update zone-summary tests**

Update `src/components/zone-summary.test.ts` — the existing tests use exported pure functions (`formatZoneArea`, `getTotalZoneArea`) which don't change. Verify they still pass:

Run: `npx vitest run src/components/zone-summary.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Run full test suite and typecheck**

Run: `npm run typecheck && npm test`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add src/components/zone-summary.ts src/components/yard-summary.ts src/main.ts
git commit -m "feat: wire plant browser into main app flow

Zone cards now show plant assignments via zone-detail component.
'Add Plants' opens the plant browser overlay filtered by zone type.
Adding/removing plants persists to localStorage via saveDesign."
```

---

### Task 6: Zone Detail Unit Tests

**Files:**
- Create: `src/components/zone-detail.test.ts`

- [ ] **Step 1: Write zone detail tests**

Create `src/components/zone-detail.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { formatCoverage } from "./zone-detail";

describe("formatCoverage", () => {
  it("formats normal percentage", () => {
    expect(formatCoverage(85)).toBe("~85%");
  });

  it("rounds to nearest integer", () => {
    expect(formatCoverage(85.7)).toBe("~86%");
  });

  it("shows >100% for overflow", () => {
    expect(formatCoverage(140)).toBe(">100%");
  });

  it("shows ~0% for zero", () => {
    expect(formatCoverage(0)).toBe("~0%");
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/components/zone-detail.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/zone-detail.test.ts
git commit -m "test: add zone detail formatCoverage unit tests"
```

---

### Task 7: E2E Test

**Files:**
- Create: `e2e/plant-palette.spec.ts`

- [ ] **Step 1: Write E2E test**

Create `e2e/plant-palette.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

const FIXTURE_DESIGN = {
  id: "test-plant-palette",
  address: "456 Garden Ave, Portland, OR",
  center: { lat: 45.5152, lng: -122.6784 },
  boundary: [
    { lat: 45.5154, lng: -122.6788 },
    { lat: 45.5154, lng: -122.678 },
    { lat: 45.515, lng: -122.678 },
    { lat: 45.515, lng: -122.6788 },
  ],
  areaSqFt: 800,
  perimeterFt: 120,
  usdaZone: "8b",
  createdAt: "2026-03-31T00:00:00Z",
  updatedAt: "2026-03-31T00:00:00Z",
  zones: [
    {
      id: "zone-1",
      category: "garden-bed",
      vertices: [
        { lat: 45.5153, lng: -122.6786 },
        { lat: 45.5153, lng: -122.6782 },
        { lat: 45.5151, lng: -122.6782 },
      ],
      areaSqFt: 320,
    },
  ],
};

test("zone card shows Add Plants button", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await expect(page.locator(".yard-summary")).toBeVisible();
  await expect(page.getByRole("button", { name: /Add Plants/i })).toBeVisible();
});

test("plant browser opens and shows compatible plants", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await page.getByRole("button", { name: /Add Plants/i }).click();

  await expect(page.locator(".plant-browser")).toBeVisible();
  await expect(page.locator(".plant-browser-header h3")).toContainText("Garden Bed");
  await expect(page.locator(".plant-row").first()).toBeVisible();
});

test("can search for a plant", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await page.getByRole("button", { name: /Add Plants/i }).click();
  await page.locator(".plant-search-input").fill("lavender");

  const rows = page.locator(".plant-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.first().locator(".plant-name")).toContainText("Lavender");
});

test("full flow: add a plant and see coverage", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await page.getByRole("button", { name: /Add Plants/i }).click();
  await page.locator(".plant-search-input").fill("lavender");

  // Click + Add
  await page.locator(".plant-add-btn").click();

  // Confirm with default quantity
  await expect(page.locator(".plant-confirm")).toBeVisible();
  await page.locator(".plant-confirm-btn").click();

  // Should return to summary with plant showing
  await expect(page.locator(".zone-plant-row")).toBeVisible();
  await expect(page.locator(".zone-plant-qty")).toContainText("×");
  await expect(page.locator(".zone-coverage-percent")).toBeVisible();
});

test("plant assignments persist across reload", async ({ page }) => {
  // Pre-load a design with an existing plant assignment
  const designWithPlant = {
    ...FIXTURE_DESIGN,
    zones: [
      {
        ...FIXTURE_DESIGN.zones[0],
        plants: [
          { plantId: "lavender", quantity: 121, calculatedQuantity: 121 },
        ],
      },
    ],
  };

  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, designWithPlant);

  await page.goto("/");
  await expect(page.locator(".zone-plant-row")).toBeVisible();
  await expect(page.locator(".zone-plant-qty")).toContainText("×121");
});
```

- [ ] **Step 2: Run E2E tests**

Run: `npx playwright test e2e/plant-palette.spec.ts`
Expected: All 5 tests PASS

- [ ] **Step 3: Run full test suite (unit + E2E)**

Run: `npm test && npx playwright test`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add e2e/plant-palette.spec.ts
git commit -m "test: add E2E tests for plant palette flow

Tests: zone card shows Add Plants, browser opens with compatible plants,
search filters results, full add-plant-see-coverage flow, persistence
across reload."
```

---

### Task 8: Add Zone Detail CSS Fix + Delete Button Style

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Add zone-item-wrapper and delete button styles**

Append to `src/style.css`:

```css
/* Zone item wrapper (detail + delete) */
.zone-item-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.zone-delete-bottom {
  align-self: flex-end;
}
```

- [ ] **Step 2: Run typecheck and lint**

Run: `npm run typecheck && npx biome check ./src`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "fix: add zone-item-wrapper styles for detail card layout"
```

---

### Verification

After all tasks are complete:

1. Run `npm test` — all unit tests pass
2. Run `npm run typecheck` — no type errors
3. Run `npx biome check ./src` — no lint errors
4. Run `npx playwright test` — all E2E tests pass
5. Start dev server (`npm run dev`) and manually verify:
   - Load app with existing design that has zones
   - Click "Add Plants" on a zone card
   - Browse and search plants in overlay
   - Add a plant, verify quantity calculation
   - See plant in zone card with coverage %
   - Refresh page, verify plants persisted
