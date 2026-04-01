# Cost Estimation — Feature Design Spec

**Date**: 2026-04-01
**Status**: Approved
**Depends on**: Plant Palette (merged)

## Problem

Users can assign plants to zones and see coverage calculations, but have no way to estimate project costs. After "how many plants do I need?", the next homeowner question is "how much will this cost?"

## Solution

Add inline cost estimation to the existing zone/plant workflow. Each plant in the catalog gets a default retail price. Users can override prices per assignment. Costs display inline on zone cards with zone subtotals and a project-wide total.

## User Stories

### P1 — MVP (this feature)

**US-1: See plant costs in zone detail**
As a homeowner, I want to see the cost of each plant assignment in my zones, so I can understand my budget.

- Acceptance: Zone detail plant rows show cost suffix: `Lavender x12 — $36.00`
- Zone detail shows subtotal below coverage stats: `Estimated cost: $142.50`
- Costs only appear when plants are assigned (no empty "$0.00" states)

**US-2: Override plant prices**
As a homeowner, I want to adjust plant prices when adding them, so costs match my local nursery.

- Acceptance: Plant browser add confirmation shows editable price field
- Pre-filled with catalog default price
- User can change the price before confirming
- Override price persists on the PlantAssignment
- Line total updates live: `12 x $3.00 = $36.00`

**US-3: See project cost total**
As a homeowner, I want to see the total estimated cost across all zones.

- Acceptance: Yard summary grid shows 5th card: "Est. Cost" with project total
- Format: `$1,247.00` (USD, two decimal places)
- Shows `—` when no plants assigned anywhere

**US-4: Persist cost overrides**
As a homeowner, I want my price overrides saved so they're there when I come back.

- Acceptance: PlantAssignment.costPerUnit persists in localStorage as part of Zone
- Loading a saved design restores cost overrides and displays correct totals

### P2 — Future (out of scope)

- Labor cost estimation per zone
- Material costs (mulch, soil, pavers)
- Cost comparison between approaches
- Nursery/supplier price lookup API
- Budget constraints (warn when over budget)
- Cost export/print for shopping list

## Data Model

### PlantInfo extension

```typescript
interface PlantInfo {
  // ...existing fields
  costPerUnit: number;  // USD retail price per plant
}
```

### PlantAssignment extension

```typescript
interface PlantAssignment {
  // ...existing fields
  costPerUnit?: number; // User override — takes precedence over catalog price
}
```

### No changes to Zone or YardDesign

Costs are computed on-the-fly from assignments. No cached totals — avoids stale data.

## Cost Calculation

```
assignmentCost = quantity * (assignment.costPerUnit ?? catalogPlant.costPerUnit)
zoneCost = sum(assignmentCost for each assignment in zone)
projectCost = sum(zoneCost for each zone with plants)
```

Edge cases:
- No plants assigned → hide cost display entirely
- Zero costPerUnit → $0.00 (valid for free/donated plants)
- Override present → use override, ignore catalog price
- Override absent/undefined → use catalog price

## Component Architecture

### New files

| File | Responsibility |
|------|---------------|
| `src/geo/plant-cost.ts` | Pure functions: `calculateAssignmentCost()`, `calculateZoneCost()`, `calculateProjectCost()`, `formatCurrency()` |

### Modified files

| File | Change |
|------|--------|
| `src/types.ts` | Add `costPerUnit: number` to PlantInfo, `costPerUnit?: number` to PlantAssignment |
| `src/data/plant-catalog.ts` | Add realistic `costPerUnit` to all 52 plants |
| `src/components/zone-detail.ts` | Cost suffix on plant rows, zone subtotal below coverage |
| `src/components/yard-summary.ts` | 5th summary card: "Est. Cost" |
| `src/components/plant-browser.ts` | Price display + editable price in add confirmation |
| `src/style.css` | Minimal styling for cost elements |

### No changes needed

- `src/storage/local-store.ts` — PlantAssignment already serializes; new `costPerUnit` field serializes automatically
- `src/geo/plant-coverage.ts` — Coverage math unchanged
- `src/main.ts` — No new navigation or wiring needed; cost display is within existing components

## Plant Catalog Prices

Realistic average US retail prices per plant:
- Perennials: $3–$12 (1-gallon container)
- Annuals: $2–$5 (pack/pot)
- Shrubs: $15–$40 (3-gallon container)
- Ground covers: $3–$8 (pot/flat)
- Grasses: $8–$15 (1-gallon container)
- Trees: $50–$200 (5-15 gallon container)

## Testing Strategy

| Layer | Target | Method |
|-------|--------|--------|
| Unit | `calculateAssignmentCost()` | Vitest — catalog price, override, zero |
| Unit | `calculateZoneCost()` | Vitest — single plant, multiple plants, empty |
| Unit | `calculateProjectCost()` | Vitest — single zone, multiple zones, no zones |
| Unit | `formatCurrency()` | Vitest — whole numbers, decimals, zero, large |
| Unit | zone-detail cost rendering | Vitest — cost display, subtotal, no-plant state |
| Unit | yard-summary cost card | Vitest — total, no-plant state |
| E2E | Add plant with custom price → verify totals | Playwright |
| E2E | Persistence: add priced plants, reload, verify costs | Playwright |

## Constitution Compliance

1. **User-Centric Design** — Answers the real question: "how much will this cost?" Inline display keeps cost visible during plant selection decisions.
2. **Data Accuracy** — Realistic catalog prices from common retail ranges. User overrides for local accuracy. No hidden rounding or silent coercion.
3. **Test-First** — TDD for all cost math. E2E for user flows.
4. **Incremental Delivery** — P1 delivers standalone value (see costs, override prices). No dependency on external APIs.
5. **Simplicity** — Pure functions, existing patterns, no new dependencies. Computed on-the-fly, no cached state to manage.
