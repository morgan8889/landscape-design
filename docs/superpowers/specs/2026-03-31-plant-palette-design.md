# Plant Palette — Feature Design Spec

**Date**: 2026-03-31
**Status**: Draft
**Depends on**: Garden Zones (branch: `garden-zones`)

## Problem

Users can draw zones on their yard map but have no way to plan what goes in them. The core homeowner question — "how many plants do I need to buy?" — is unanswered. Zones without plants are just colored shapes.

## Solution

A zone-first plant palette that lets users browse a curated plant catalog, assign plants to zones, and get automatic coverage calculations based on zone area and plant spacing.

## User Stories

### P1 — MVP (this feature)

**US-1: Browse plants for a zone**
As a homeowner, I want to select a zone and see plants that are compatible with it, so I can choose what to plant.

- Acceptance: Clicking "Add Plants" on a zone card opens a plant browser overlay
- The browser shows only plants whose `zoneCompatibility` includes the zone's category
- Plants display: name, category, sun requirement, water need, spacing
- User can search by name (substring match)
- User can filter by sun requirement, water need, and tags

**US-2: Add plants with coverage calculation**
As a homeowner, I want to see how many plants I need to fill my zone, so I know what to buy.

- Acceptance: Clicking "+ Add" on a plant expands an inline confirmation with:
  - Auto-calculated quantity based on zone area and plant spacing
  - Editable quantity input (pre-filled with calculated value)
  - "Confirm" adds the plant assignment to the zone
- Calculation: `plantsPerRow = floor(sqrt(areaSqFt) / (spacingInches / 12))`, total = `plantsPerRow²`
- Calculated and user-chosen quantities are both stored

**US-3: View zone plant summary**
As a homeowner, I want to see what plants are assigned to each zone with coverage info.

- Acceptance: Zone cards in the summary view show:
  - List of assigned plants with quantities
  - Total plant count across all types
  - Coverage percentage (sum of individual plant coverage areas vs zone area)
  - "Add More Plants" button to return to browser
  - Remove button per plant assignment

**US-4: Persist plant assignments**
As a homeowner, I want my plant selections saved so they're there when I come back.

- Acceptance: Plant assignments persist in localStorage as part of the Zone object
  - Adding/removing plants triggers `saveDesign()`
  - Loading a saved design restores plant assignments on zone cards

### P2 — Future (out of scope)

- Drag plants to specific positions within zones
- Plant images/thumbnails from external sources
- Cost estimation per plant
- Seasonal bloom calendar
- Plant compatibility warnings (shade plant in full-sun zone)
- External plant database API integration

## Data Model

### PlantInfo (static catalog)

```typescript
type PlantCategory = "perennial" | "annual" | "shrub" | "ground-cover" | "grass" | "tree";
type Sun = "full-sun" | "partial-shade" | "full-shade";
type Water = "low" | "moderate" | "high";

interface PlantInfo {
  id: string;
  name: string;
  category: PlantCategory;
  sunRequirement: Sun;
  waterNeed: Water;
  spacingInches: number;
  matureHeightFt: number;
  matureWidthFt: number;
  emoji: string;            // placeholder visual (e.g., "🌿"), real images are P2
  tags: string[];
  zoneCompatibility: ZoneCategory[];
}
```

### PlantAssignment (per zone)

```typescript
interface PlantAssignment {
  plantId: string;
  quantity: number;
  calculatedQuantity: number;
}
```

### Zone extension

```typescript
interface Zone {
  // ...existing fields
  plants?: PlantAssignment[];
}
```

## Component Architecture

### New files

| File | Responsibility |
|------|---------------|
| `src/data/plant-catalog.ts` | Static `PlantInfo[]` + helpers: `getPlantById()`, `getPlantsForZone()`, `searchPlants()` |
| `src/components/plant-browser.ts` | Overlay: search, filter chips, plant list, "Add" per row. `renderPlantBrowser(container, zone, onAdd, onClose)` |
| `src/components/plant-assignment.ts` | Inline confirmation: coverage calc, qty input, confirm/cancel. `renderPlantAssignment(container, plant, zone, onConfirm, onCancel)` |
| `src/components/zone-detail.ts` | Expanded zone card: plant list, coverage %, remove, add-more. `renderZoneDetail(container, zone, onAddPlants, onRemovePlant, onUpdateQuantity)` |
| `src/geo/plant-coverage.ts` | Pure math: `calculatePlantQuantity(areaSqFt, spacingInches)`, `calculateCoveragePercent(zone, catalog)` |

### Modified files

| File | Change |
|------|--------|
| `src/types.ts` | Add `PlantInfo`, `PlantAssignment`, `PlantCategory`, `Sun`, `Water` |
| `src/components/zone-summary.ts` | Add "Add Plants" button + plant count on zone cards |
| `src/main.ts` | Wire plant browser overlay + zone detail navigation |
| `src/style.css` | Plant browser overlay, plant cards, filter chips, zone detail styles |

### No changes needed

- `src/storage/local-store.ts` — zones already persist via `saveDesign()`, `PlantAssignment[]` serializes as part of the Zone object

## User Flow

1. **Zone Summary** → User sees zones with "Add Plants" button
2. **Plant Browser** (overlay) → Filtered by zone type, searchable, filter chips for sun/water/tags
3. **Add Confirmation** (inline expand) → Auto-calculated quantity, editable, confirm/cancel
4. **Zone Detail** → Plant list with quantities, coverage %, remove buttons, "Add More Plants"

## Coverage Calculation

```
spacingFt = spacingInches / 12
plantsPerRow = floor(sqrt(areaSqFt) / spacingFt)
totalPlants = plantsPerRow * plantsPerRow
```

Coverage percentage per plant type:
```
plantCoverageSqFt = quantity * (spacingFt * spacingFt)
coveragePercent = (totalPlantCoverage / areaSqFt) * 100
```

Edge cases:
- Zone area = 0 → quantity = 0
- Spacing = 0 → error (invalid plant data)
- Coverage > 100% → display as ">100%" with visual indicator
- No plants assigned → "No plants assigned" text

## Plant Catalog

Ship ~50-100 curated plants covering common residential landscaping:
- Perennials: Lavender, Hosta, Black-Eyed Susan, Daylily, Coneflower, Sedum, etc.
- Annuals: Marigold, Petunia, Zinnia, Impatiens, etc.
- Shrubs: Boxwood, Hydrangea, Azalea, Rose, etc.
- Ground covers: Creeping Thyme, Pachysandra, Vinca, etc.
- Grasses: Fountain Grass, Blue Fescue, Mondo Grass, etc.
- Trees: Japanese Maple, Dogwood, Crape Myrtle, etc.

Each plant has realistic spacing, height, width, and sun/water data. Zone compatibility maps plant types to zone categories (e.g., ground-cover → garden-bed, path; grass → lawn; shrub → garden-bed, patio).

Plants use an `emoji` field as visual placeholder for MVP (e.g., "🌿", "🌸"). Real thumbnail images are P2.

## Testing Strategy

| Layer | Target | Method |
|-------|--------|--------|
| Unit | `calculatePlantQuantity()` | Vitest — normal, edge cases (tiny area, large spacing, zero) |
| Unit | `calculateCoveragePercent()` | Vitest — single plant, multiple plants, >100% |
| Unit | `getPlantsForZone()` | Vitest — filter by zone type, search substring |
| Unit | `searchPlants()` | Vitest — name matching, empty query |
| E2E | Full flow: summary → add plants → confirm → coverage display | Playwright with localStorage fixture |
| E2E | Persistence: add plants, reload, verify still there | Playwright |

## Constitution Compliance

1. **User-Centric Design** — Solves the real question: "how many plants do I need?" Zone-first flow matches how homeowners think (area first, then fill it).
2. **Data Accuracy** — Plant spacing data from common horticultural references. Coverage calculation uses validated formula. Calculated vs user quantity both stored for transparency.
3. **Test-First** — TDD for all coverage math. E2E for user flows.
4. **Incremental Delivery** — P1 delivers standalone value (browse + assign + calculate). No dependency on external APIs or future features.
5. **Simplicity** — Static catalog, no API. Pure functions. Existing patterns. No new dependencies.
