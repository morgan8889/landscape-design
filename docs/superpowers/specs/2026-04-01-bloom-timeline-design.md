# Seasonal Bloom Timeline — Design Spec

## Goal

Show homeowners when their plants bloom and have foliage interest across the year, highlighting months with no coverage so they can fill gaps before buying.

## Data Model

Add two optional fields to `PlantInfo` in `src/types.ts`:

```typescript
bloomMonths?: number[];    // 1-12. e.g., [4, 5, 6] for April-June
foliageMonths?: number[];  // seasonal foliage interest periods
```

Both optional. Plants with neither don't appear on the timeline. Populate across all 63 plants in `src/data/plant-catalog.ts`.

Month encoding: 1 = January, 12 = December. Arrays are unordered sets of active months. Non-contiguous months are supported (e.g., `[4, 5, 9, 10]` for spring + fall reblooming).

## Architecture

### Pure logic module: `src/geo/bloom-timeline.ts`

No DOM dependencies. Fully testable.

```typescript
interface MonthSummary {
  month: number;            // 1-12
  bloomingPlants: string[]; // plant IDs active this month
  foliagePlants: string[];  // plant IDs with foliage interest this month
  totalInterest: number;    // deduplicated count of plants with any interest
}

interface BloomTimeline {
  months: MonthSummary[];   // always 12 entries, index 0 = January
  gapMonths: number[];      // months where totalInterest === 0
  plantCount: number;       // distinct plants contributing bloom or foliage data
}
```

**`buildBloomTimeline(zones, getPlantInfo) → BloomTimeline`**

- Iterates all plant assignments across all zones
- Deduplicates by plantId (same plant in two zones = one timeline entry)
- For each plant with `bloomMonths` or `foliageMonths`, populates the 12-month grid
- Computes `gapMonths` as months where `totalInterest === 0`
- `plantCount` is the number of distinct plants that have any bloom/foliage data

### View component: `src/components/bloom-timeline.ts`

**`renderBloomTimeline(container, zones) → void`**

Renders the timeline inline in the yard summary, after the zones list. Only renders when at least one assigned plant has `bloomMonths` or `foliageMonths` data.

**Layout (top to bottom):**

1. **Header row**: "Bloom Timeline" label + 12 month abbreviations (J, F, M, A, M, J, J, A, S, O, N, D)

2. **Summary bar**: Single row of 12 cells, each color-coded:
   - Green intensity scaled by `totalInterest` count (more plants = darker green)
   - Gap months (zero interest) highlighted in warning/red tone
   - Each cell shows the count of active plants

3. **Gap callout**: If `gapMonths.length > 0`, text line: "No bloom coverage in [month names]"

4. **Expandable plant rows**: Each distinct plant with bloom/foliage data gets a row:
   - Left: plant emoji + name
   - Right: 12 cells — bloom months in green, foliage months in muted/subtle tone, empty otherwise

### Wiring: `src/components/yard-summary.ts`

Call `renderBloomTimeline(wrapper, design.zones ?? [])` after the zone summary section. Conditional on at least one assigned plant having bloom/foliage data.

### Styles: `src/style.css`

New `.bloom-timeline` CSS block using existing design tokens (`--surface`, `--border`, `--green`, `--text-muted`). Grid layout for the 12-month columns. Print-safe via existing `@media print` patterns.

## Reuse

- `getPlantById()` from `src/data/plant-catalog.ts` — plant info lookup
- Existing CSS variables and component patterns
- `PlantAssignment` iteration pattern from `shopping-list.ts`

## Files

### New
| File | Purpose |
|------|---------|
| `src/geo/bloom-timeline.ts` | Pure aggregation: `buildBloomTimeline()` |
| `src/geo/bloom-timeline.test.ts` | Unit tests for aggregation and gap detection |
| `src/components/bloom-timeline.ts` | DOM rendering: `renderBloomTimeline()` |

### Modified
| File | Change |
|------|--------|
| `src/types.ts` | Add `bloomMonths?` and `foliageMonths?` to `PlantInfo` |
| `src/data/plant-catalog.ts` | Populate bloom/foliage data for all 63 plants |
| `src/components/yard-summary.ts` | Call `renderBloomTimeline` after zones section |
| `src/style.css` | Bloom timeline styles + print rules |
| `e2e/` | E2E tests for timeline rendering |

## Testing

### Unit tests (`src/geo/bloom-timeline.test.ts`)
- Empty zones → empty timeline (all months zero, no gaps flagged — no plants means no expectation)
- Zones with plants but no bloom/foliage data → `plantCount: 0`, no rendering
- Single plant with `bloomMonths: [4, 5, 6]` → months 4-6 have `totalInterest: 1`, others 0
- Plant with both bloom and foliage → both arrays populated, `totalInterest` counts plant once per month
- Same plant in two zones → deduplicated (appears once)
- Gap detection: plants cover months 3-6 and 9-11 → `gapMonths: [1, 2, 7, 8, 12]`
- All 12 months covered → `gapMonths: []`

### E2E tests
- Timeline visible when plants with bloom data are assigned
- Timeline hidden when no plants or no bloom data
- Gap callout text appears when gaps exist
- Month cells have correct visual states

## Non-Goals

- No plant recommendations to fill gaps (future feature)
- No per-zone timeline breakdown (project-wide only)
- No animation or interactive month selection
- No bloom color data (all blooms shown as green, not flower-specific colors)
