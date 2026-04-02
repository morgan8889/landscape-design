# Cost Estimation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [X]`) syntax for tracking.

**Goal:** Add inline cost estimation to zone cards and yard summary so homeowners can answer "how much will this cost?"

**Architecture:** Add `costPerUnit` to the PlantInfo type and catalog. Pure cost calculation functions in `src/geo/plant-cost.ts`. Inline cost display in zone-detail and yard-summary components. Price override in plant-browser add confirmation. Costs computed on-the-fly, not cached.

**Tech Stack:** TypeScript, Vitest, Playwright, vanilla DOM (no framework)

---

### Task 1: Types + Cost Calculation Functions

**Files:**
- Modify: `src/types.ts`
- Create: `src/geo/plant-cost.ts`
- Create: `src/geo/plant-cost.test.ts`

- [X] **Step 1: Write failing tests for cost calculation**

Create `src/geo/plant-cost.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import type { PlantAssignment, Zone } from "../types";
import {
  calculateAssignmentCost,
  calculateProjectCost,
  calculateZoneCost,
  formatCurrency,
} from "./plant-cost";

describe("calculateAssignmentCost", () => {
  it("uses catalog price when no override", () => {
    expect(calculateAssignmentCost(10, undefined, 3.5)).toBe(35);
  });

  it("uses override price when provided", () => {
    expect(calculateAssignmentCost(10, 5.0, 3.5)).toBe(50);
  });

  it("returns 0 for zero quantity", () => {
    expect(calculateAssignmentCost(0, undefined, 3.5)).toBe(0);
  });

  it("handles zero cost", () => {
    expect(calculateAssignmentCost(10, 0, 3.5)).toBe(0);
  });
});

describe("calculateZoneCost", () => {
  it("sums costs for multiple assignments", () => {
    const assignments: PlantAssignment[] = [
      { plantId: "lavender", quantity: 10, calculatedQuantity: 10 },
      { plantId: "boxwood", quantity: 5, calculatedQuantity: 5 },
    ];
    const getCost = (id: string) => (id === "lavender" ? 3.5 : 25.0);
    expect(calculateZoneCost(assignments, getCost)).toBe(160);
  });

  it("returns 0 for empty assignments", () => {
    expect(calculateZoneCost([], () => 0)).toBe(0);
  });

  it("respects per-assignment cost override", () => {
    const assignments: PlantAssignment[] = [
      { plantId: "lavender", quantity: 10, calculatedQuantity: 10, costPerUnit: 5.0 },
    ];
    const getCost = () => 3.5;
    expect(calculateZoneCost(assignments, getCost)).toBe(50);
  });
});

describe("calculateProjectCost", () => {
  it("sums costs across zones", () => {
    const zones: Zone[] = [
      {
        id: "z1",
        category: "garden-bed",
        vertices: [],
        areaSqFt: 100,
        plants: [{ plantId: "lavender", quantity: 10, calculatedQuantity: 10 }],
      },
      {
        id: "z2",
        category: "patio",
        vertices: [],
        areaSqFt: 50,
        plants: [{ plantId: "boxwood", quantity: 3, calculatedQuantity: 3 }],
      },
    ];
    const getCost = (id: string) => (id === "lavender" ? 3.5 : 25.0);
    expect(calculateProjectCost(zones, getCost)).toBe(110);
  });

  it("returns 0 for zones with no plants", () => {
    const zones: Zone[] = [
      { id: "z1", category: "garden-bed", vertices: [], areaSqFt: 100 },
    ];
    expect(calculateProjectCost(zones, () => 0)).toBe(0);
  });

  it("returns 0 for empty zones array", () => {
    expect(calculateProjectCost([], () => 0)).toBe(0);
  });
});

describe("formatCurrency", () => {
  it("formats whole dollars", () => {
    expect(formatCurrency(35)).toBe("$35.00");
  });

  it("formats cents", () => {
    expect(formatCurrency(35.5)).toBe("$35.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats large amounts with commas", () => {
    expect(formatCurrency(1247)).toBe("$1,247.00");
  });

  it("rounds to two decimal places", () => {
    expect(formatCurrency(35.999)).toBe("$36.00");
  });
});
```

- [X] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/geo/plant-cost.test.ts`
Expected: FAIL — module `./plant-cost` not found

- [X] **Step 3: Add costPerUnit to types**

In `src/types.ts`, add `costPerUnit` to `PlantInfo` (line 49, before the closing brace):

```typescript
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
  costPerUnit: number;
}
```

Add optional `costPerUnit` to `PlantAssignment` (line 55, before the closing brace):

```typescript
export interface PlantAssignment {
  plantId: string;
  quantity: number;
  calculatedQuantity: number;
  costPerUnit?: number;
}
```

- [X] **Step 4: Implement cost calculation functions**

Create `src/geo/plant-cost.ts`:

```typescript
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
    total += calculateAssignmentCost(a.quantity, a.costPerUnit, getCatalogCost(a.plantId));
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
```

- [X] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/geo/plant-cost.test.ts`
Expected: All 14 tests PASS

Note: TypeScript will now report errors in `plant-catalog.ts` because `PlantInfo` requires `costPerUnit`. That's expected — Task 2 adds the prices.

- [X] **Step 6: Commit**

```bash
git add src/types.ts src/geo/plant-cost.ts src/geo/plant-cost.test.ts
git commit -m "feat: add cost calculation types and pure functions

Add costPerUnit to PlantInfo (required) and PlantAssignment (optional
override). Pure functions: calculateAssignmentCost, calculateZoneCost,
calculateProjectCost, formatCurrency."
```

---

### Task 2: Add Prices to Plant Catalog

**Files:**
- Modify: `src/data/plant-catalog.ts`

- [X] **Step 1: Add costPerUnit to every plant in the catalog**

Add `costPerUnit` field to each of the 52 plants in `src/data/plant-catalog.ts`. Place it after `zoneCompatibility` (last field before closing brace). Use these realistic US retail prices:

**Perennials** ($3–$12, 1-gallon):
```
lavender: 8.00, hosta-blue-angel: 12.00, black-eyed-susan: 7.00, daylily: 6.00,
coneflower: 7.00, sedum: 5.00, astilbe: 9.00, peony: 12.00, bee-balm: 8.00,
coral-bells: 9.00, russian-sage: 10.00, catmint: 7.00, iris: 6.00, phlox: 8.00,
salvia: 7.00
```

**Annuals** ($2–$5, pack/pot):
```
marigold: 3.00, petunia: 3.50, zinnia: 3.00, impatiens: 3.50, begonia: 4.00,
geranium: 4.50, snapdragon: 3.50, cosmos: 3.00
```

**Shrubs** ($15–$40, 3-gallon):
```
boxwood: 25.00, hydrangea: 30.00, azalea: 22.00, rose-knockout: 20.00,
holly: 28.00, lilac: 25.00, butterfly-bush: 18.00, spirea: 15.00, juniper: 20.00
```

**Ground Covers** ($3–$8):
```
creeping-thyme: 5.00, pachysandra: 4.00, vinca: 3.50, ajuga: 4.00,
irish-moss: 6.00, sedum-ground-cover: 4.50, liriope: 5.00
```

**Grasses** ($8–$15):
```
fountain-grass: 12.00, blue-fescue: 8.00, mondo-grass: 5.00, karl-foerster: 12.00,
switchgrass: 10.00, bermuda: 3.00, tall-fescue: 3.00, zoysia: 3.50
```

**Trees** ($50–$200):
```
japanese-maple: 85.00, dogwood: 65.00, crape-myrtle: 55.00, redbud: 60.00,
magnolia: 120.00, river-birch: 75.00
```

**Patio/Pool** (varies):
```
dwarf-boxwood: 18.00, ornamental-pepper: 4.00, trailing-rosemary: 8.00,
potted-palm: 45.00, hibiscus: 15.00, bird-of-paradise: 25.00,
bougainvillea: 20.00, agapanthus: 10.00, dwarf-palmetto: 35.00
```

For each plant entry, add the line after `zoneCompatibility`:

```typescript
  {
    id: "lavender",
    // ... existing fields ...
    zoneCompatibility: ["garden-bed", "patio", "path"],
    costPerUnit: 8.00,
  },
```

- [X] **Step 2: Run typecheck to verify catalog compiles**

Run: `npx tsc --noEmit`
Expected: PASS (no errors — all PlantInfo objects now have `costPerUnit`)

- [X] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS (existing + new cost tests)

- [X] **Step 4: Commit**

```bash
git add src/data/plant-catalog.ts
git commit -m "feat: add retail prices to all 52 plants in catalog

Realistic US retail prices: perennials $3-12, annuals $2-5, shrubs
$15-40, ground covers $3-8, grasses $3-15, trees $55-120."
```

---

### Task 3: Cost Display in Zone Detail

**Files:**
- Modify: `src/components/zone-detail.ts`
- Modify: `src/components/zone-detail.test.ts`

- [X] **Step 1: Write failing tests for cost display**

Add to `src/components/zone-detail.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { formatCoverage, formatZoneCost } from "./zone-detail";

// ... existing formatCoverage tests ...

describe("formatZoneCost", () => {
  it("formats zone cost", () => {
    expect(formatZoneCost(142.5)).toBe("$142.50");
  });

  it("returns null for zero", () => {
    expect(formatZoneCost(0)).toBeNull();
  });

  it("formats large amounts", () => {
    expect(formatZoneCost(1500)).toBe("$1,500.00");
  });
});
```

- [X] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/zone-detail.test.ts`
Expected: FAIL — `formatZoneCost` not exported

- [X] **Step 3: Add formatZoneCost and cost display to zone-detail.ts**

In `src/components/zone-detail.ts`, add the import and helper:

```typescript
import { getPlantById } from "../data/plant-catalog";
import { calculateZoneCost, formatCurrency } from "../geo/plant-cost";
import { calculateCoveragePercent } from "../geo/plant-coverage";
import type { Zone } from "../types";
import { getCategoryColor, getCategoryLabel } from "./zone-categories";

export function formatCoverage(percent: number): string {
  if (percent > 100) return ">100%";
  return `~${Math.round(percent)}%`;
}

export function formatZoneCost(cost: number): string | null {
  if (cost === 0) return null;
  return formatCurrency(cost);
}
```

In `renderZoneDetail`, inside the plant row loop (after the qty span, before the removeBtn), add a cost span:

```typescript
      const cost = document.createElement("span");
      cost.className = "zone-plant-cost";
      const unitCost = assignment.costPerUnit ?? info.costPerUnit;
      cost.textContent = `— ${formatCurrency(unitCost * assignment.quantity)}`;
      right.append(qty, cost, removeBtn);
```

Replace `right.append(qty, removeBtn);` with `right.append(qty, cost, removeBtn);`.

After the coverage bar section (after `card.appendChild(coverageBar)`), add the cost subtotal:

```typescript
    // Cost subtotal
    const zoneCost = calculateZoneCost(
      plants,
      (id) => getPlantById(id)?.costPerUnit ?? 0,
    );
    const formattedCost = formatZoneCost(zoneCost);
    if (formattedCost) {
      const costBar = document.createElement("div");
      costBar.className = "zone-cost-subtotal";
      costBar.textContent = `Estimated cost: ${formattedCost}`;
      card.appendChild(costBar);
    }
```

- [X] **Step 4: Run tests**

Run: `npx vitest run src/components/zone-detail.test.ts`
Expected: All tests PASS (existing + new)

- [X] **Step 5: Commit**

```bash
git add src/components/zone-detail.ts src/components/zone-detail.test.ts
git commit -m "feat: add inline cost display to zone detail cards

Each plant row shows cost suffix (Lavender x12 — $96.00). Zone subtotal
appears below coverage stats. Hidden when no cost."
```

---

### Task 4: Project Cost Total in Yard Summary

**Files:**
- Modify: `src/components/yard-summary.ts`
- Modify: `src/components/yard-summary.test.ts`

- [X] **Step 1: Write failing test for formatProjectCost**

Add to `src/components/yard-summary.test.ts`:

```typescript
import {
  formatArea,
  formatPerimeter,
  formatProjectCost,
  triggerJsonDownload,
} from "./yard-summary";

// ... existing tests ...

describe("formatProjectCost", () => {
  it("formats cost total", () => {
    expect(formatProjectCost(1247)).toBe("$1,247.00");
  });

  it("returns dash for zero", () => {
    expect(formatProjectCost(0)).toBe("—");
  });

  it("returns dash for no plants", () => {
    expect(formatProjectCost(0)).toBe("—");
  });
});
```

- [X] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/yard-summary.test.ts`
Expected: FAIL — `formatProjectCost` not exported

- [X] **Step 3: Add cost card to yard-summary.ts**

Add imports at top of `src/components/yard-summary.ts`:

```typescript
import { getPlantById } from "../data/plant-catalog";
import { calculateProjectCost, formatCurrency } from "../geo/plant-cost";
import { exportDesignJson, saveDesign } from "../storage/local-store";
import type { YardDesign } from "../types";
import { renderZoneSummary } from "./zone-summary";
```

Add the helper function after `formatPerimeter`:

```typescript
export function formatProjectCost(cost: number): string {
  if (cost === 0) return "—";
  return formatCurrency(cost);
}
```

In `renderYardSummary`, after the existing 4 cards array definition, add the cost card:

```typescript
  const projectCost = calculateProjectCost(
    design.zones ?? [],
    (id) => getPlantById(id)?.costPerUnit ?? 0,
  );
  cards.push({ label: "Est. Cost", value: formatProjectCost(projectCost) });
```

- [X] **Step 4: Run tests**

Run: `npx vitest run src/components/yard-summary.test.ts`
Expected: All tests PASS

- [X] **Step 5: Commit**

```bash
git add src/components/yard-summary.ts src/components/yard-summary.test.ts
git commit -m "feat: add project cost total to yard summary grid

5th summary card shows estimated total cost across all zones.
Displays dash when no plants assigned."
```

---

### Task 5: Price Override in Plant Browser

**Files:**
- Modify: `src/components/plant-browser.ts`

- [X] **Step 1: Update onAdd callback signature**

In `src/components/plant-browser.ts`, change the `onAdd` callback type to include `costPerUnit`:

```typescript
export function renderPlantBrowser(
  container: HTMLElement,
  zone: Zone,
  onAdd: (
    plantId: string,
    quantity: number,
    calculatedQuantity: number,
    costPerUnit: number | undefined,
  ) => void,
  onClose: () => void,
): void {
```

- [X] **Step 2: Add price display to plant row meta**

In the plant row rendering (inside `renderList`), update the meta text to include price:

```typescript
      meta.textContent = `${plant.category} · ${sunLabel} · ${waterLabel} Water · ${plant.spacingInches}" spacing · ${formatCurrency(plant.costPerUnit)}/ea`;
```

Add the import at top:

```typescript
import { formatCurrency } from "../geo/plant-cost";
```

- [X] **Step 3: Add editable price input to add confirmation**

In the expanded confirmation section (where `expandedPlantId === plant.id`), add a price input row after the qty input row:

```typescript
        const priceRow = document.createElement("div");
        priceRow.className = "plant-confirm-row";

        const priceLabel = document.createElement("span");
        priceLabel.className = "plant-qty-label";
        priceLabel.textContent = "Price:";

        const priceInput = document.createElement("input");
        priceInput.type = "number";
        priceInput.className = "plant-price-input";
        priceInput.value = String(plant.costPerUnit);
        priceInput.min = "0";
        priceInput.step = "0.01";

        const lineTotal = document.createElement("span");
        lineTotal.className = "plant-line-total";

        function updateLineTotal(): void {
          const qty = Number.parseInt(qtyInput.value, 10) || 0;
          const price = Number.parseFloat(priceInput.value) || 0;
          lineTotal.textContent = `= ${formatCurrency(qty * price)}`;
        }
        updateLineTotal();

        qtyInput.addEventListener("input", updateLineTotal);
        priceInput.addEventListener("input", updateLineTotal);

        priceRow.append(priceLabel, priceInput, lineTotal);
```

Insert `priceRow` after `inputRow` in the `confirm.append(...)` call:

```typescript
        confirm.append(calcLabel, inputRow, priceRow);
```

- [X] **Step 4: Update confirm button to pass costPerUnit**

Update the confirm button click handler to pass the cost override:

```typescript
        confirmBtn.addEventListener("click", () => {
          const qty = Number.parseInt(qtyInput.value, 10) || calcQty;
          const price = Number.parseFloat(priceInput.value);
          const costOverride = price !== plant.costPerUnit ? price : undefined;
          onAdd(plant.id, qty, calcQty, costOverride);
          expandedPlantId = null;
          renderList();
        });
```

- [X] **Step 5: Update main.ts to pass costPerUnit through**

In `src/main.ts`, the `renderSummary` function calls `renderPlantBrowser` with an `onAdd` callback. Update it to accept and store the cost override:

The current callback at line 234 is:
```typescript
      renderPlantBrowser(
        app,
        zone,
        (plantId, quantity, calculatedQuantity) => {
```

Update to:
```typescript
      renderPlantBrowser(
        app,
        zone,
        (plantId, quantity, calculatedQuantity, costPerUnit) => {
          if (!zone.plants) zone.plants = [];
          const existing = zone.plants.find((p) => p.plantId === plantId);
          if (existing) {
            existing.quantity += quantity;
            existing.calculatedQuantity = calculatedQuantity;
            if (costPerUnit !== undefined) existing.costPerUnit = costPerUnit;
          } else {
            zone.plants.push({ plantId, quantity, calculatedQuantity, costPerUnit });
          }
```

- [X] **Step 6: Run full test suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: All tests PASS, no type errors

- [X] **Step 7: Commit**

```bash
git add src/components/plant-browser.ts src/main.ts
git commit -m "feat: add price display and editable override in plant browser

Plant rows show price per unit. Add confirmation has editable price
field with live line total. Override persists on PlantAssignment."
```

---

### Task 6: CSS Styling for Cost Elements

**Files:**
- Modify: `src/style.css`

- [X] **Step 1: Add cost styles**

Add to the end of `src/style.css`:

```css
/* ── Cost Estimation ──────────────────────────────────────────────────── */

.zone-plant-cost {
  color: #6b7280;
  font-size: 0.85rem;
  margin-left: 0.25rem;
}

.zone-cost-subtotal {
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #059669;
  border-top: 1px solid #e5e7eb;
}

.plant-price-input {
  width: 5rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
}

.plant-line-total {
  font-size: 0.9rem;
  font-weight: 500;
  color: #059669;
  margin-left: 0.5rem;
}
```

- [X] **Step 2: Run typecheck and full tests**

Run: `npx vitest run && npx tsc --noEmit`
Expected: All PASS

- [X] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "feat: add CSS styles for cost estimation elements

Styles for zone plant cost suffix, zone cost subtotal, price input,
and line total display."
```

---

### Task 7: E2E Tests

**Files:**
- Create: `tests/e2e/cost-estimation.spec.ts`

- [X] **Step 1: Write E2E test for cost flow**

Create `tests/e2e/cost-estimation.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

test.describe("Cost Estimation", () => {
  test.beforeEach(async ({ page }) => {
    // Load fixture design with zones and plants
    const design = {
      id: "test-cost",
      address: "123 Test St",
      center: { lat: 0, lng: 0 },
      boundary: [],
      areaSqFt: 1000,
      perimeterFt: 130,
      usdaZone: "7a",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      zones: [
        {
          id: "zone-1",
          category: "garden-bed",
          vertices: [],
          areaSqFt: 200,
          plants: [
            { plantId: "lavender", quantity: 12, calculatedQuantity: 12 },
            { plantId: "boxwood", quantity: 3, calculatedQuantity: 3 },
          ],
        },
      ],
    };
    await page.goto("/");
    await page.evaluate(
      (d) => localStorage.setItem("yard-design", JSON.stringify(d)),
      design,
    );
    await page.reload();
  });

  test("shows plant costs in zone detail", async ({ page }) => {
    // Lavender: 12 x $8.00 = $96.00
    await expect(page.locator(".zone-plant-cost").first()).toContainText("$96.00");
    // Boxwood: 3 x $25.00 = $75.00
    await expect(page.locator(".zone-plant-cost").nth(1)).toContainText("$75.00");
  });

  test("shows zone cost subtotal", async ({ page }) => {
    // $96 + $75 = $171.00
    await expect(page.locator(".zone-cost-subtotal")).toContainText("$171.00");
  });

  test("shows project cost in summary", async ({ page }) => {
    await expect(page.locator(".summary-card").last()).toContainText("$171.00");
  });

  test("persists cost override after reload", async ({ page }) => {
    // Modify lavender's cost in localStorage
    await page.evaluate(() => {
      const raw = localStorage.getItem("yard-design");
      if (!raw) return;
      const d = JSON.parse(raw);
      d.zones[0].plants[0].costPerUnit = 10.0; // override from $8 to $10
      localStorage.setItem("yard-design", JSON.stringify(d));
    });
    await page.reload();
    // Lavender: 12 x $10.00 = $120.00
    await expect(page.locator(".zone-plant-cost").first()).toContainText("$120.00");
    // Total: $120 + $75 = $195.00
    await expect(page.locator(".zone-cost-subtotal")).toContainText("$195.00");
  });
});
```

- [X] **Step 2: Run E2E tests**

Run: `npx playwright test tests/e2e/cost-estimation.spec.ts`
Expected: All 4 tests PASS

- [X] **Step 3: Commit**

```bash
git add tests/e2e/cost-estimation.spec.ts
git commit -m "test: add E2E tests for cost estimation flow

Tests: plant costs in zone detail, zone subtotal, project total,
cost override persistence after reload."
```

---

## Verification Checklist

After all tasks:
1. `npx vitest run` — all unit tests pass (existing + ~20 new cost tests)
2. `npx tsc --noEmit` — no type errors
3. `npx biome check ./src` — no lint errors
4. `npx playwright test` — all E2E tests pass
5. Browser: zone detail shows per-plant costs and subtotal
6. Browser: yard summary has 5th card with project total
7. Browser: plant browser shows price + editable override in add confirmation
8. Persistence: reload page, costs still display correctly
