# Seasonal Bloom Timeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show homeowners a 12-month bloom/foliage timeline with gap detection so they can fill seasonal coverage holes before buying plants.

**Architecture:** Pure logic module (`src/geo/bloom-timeline.ts`) computes a 12-month grid from zone plant assignments, deduplicating by plantId. View component (`src/components/bloom-timeline.ts`) renders inline in yard summary after the zones section. Data lives on the existing `PlantInfo` type (fields already added: `bloomMonths?`, `foliageMonths?`).

**Tech Stack:** TypeScript, Vitest (unit), Playwright (E2E), vanilla DOM rendering, CSS grid

---

## File Structure

### New
| File | Responsibility |
|------|---------------|
| `src/geo/bloom-timeline.ts` | Pure aggregation: `buildBloomTimeline(zones, getPlantInfo)` → `BloomTimeline` |
| `src/geo/bloom-timeline.test.ts` | Unit tests for aggregation and gap detection |
| `src/components/bloom-timeline.ts` | DOM rendering: `renderBloomTimeline(container, zones)` |
| `e2e/bloom-timeline.spec.ts` | E2E tests for timeline rendering and gap callouts |

### Modified
| File | Change |
|------|--------|
| `src/data/plant-catalog.ts` | Add `bloomMonths` and `foliageMonths` arrays to all 62 plants |
| `src/components/yard-summary.ts` | Call `renderBloomTimeline` after zone summary section |
| `src/style.css` | Add `.bloom-timeline` styles + `@media print` rules |

---

### Task 1: Populate bloom/foliage data for all 62 plants

**Files:**
- Modify: `src/data/plant-catalog.ts`

This task adds `bloomMonths` and `foliageMonths` data to every plant in the catalog. The `PlantInfo` type already has these optional fields (added in `src/types.ts:50-51`). Both use month numbers 1-12.

- [ ] **Step 1: Add bloom/foliage data to all plants**

Add `bloomMonths` and/or `foliageMonths` to each plant entry. Not every plant gets both — some are foliage-only (e.g., grasses, ground covers), some are bloom-only, some have both. Plants with neither are valid but won't appear on the timeline.

Here is the data for all 62 plants. Add these fields to each entry in `src/data/plant-catalog.ts`, placing them after the `zoneCompatibility` line:

```typescript
// ── Perennials ──
// lavender
bloomMonths: [6, 7, 8],
foliageMonths: [4, 5, 6, 7, 8, 9, 10],

// hosta-blue-angel
foliageMonths: [4, 5, 6, 7, 8, 9, 10],

// black-eyed-susan
bloomMonths: [6, 7, 8, 9],

// daylily
bloomMonths: [6, 7, 8],

// coneflower
bloomMonths: [6, 7, 8, 9],

// sedum
bloomMonths: [8, 9, 10],
foliageMonths: [4, 5, 6, 7, 8, 9, 10, 11],

// astilbe
bloomMonths: [6, 7],
foliageMonths: [4, 5, 6, 7, 8, 9],

// peony
bloomMonths: [5, 6],

// bee-balm
bloomMonths: [6, 7, 8],

// coral-bells
bloomMonths: [5, 6, 7],
foliageMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],

// russian-sage
bloomMonths: [7, 8, 9],
foliageMonths: [5, 6, 7, 8, 9, 10],

// catmint
bloomMonths: [5, 6, 7, 8, 9],

// iris
bloomMonths: [4, 5, 6],

// phlox
bloomMonths: [7, 8, 9],

// salvia
bloomMonths: [5, 6, 7, 8, 9],

// ── Annuals ──
// marigold
bloomMonths: [5, 6, 7, 8, 9, 10],

// petunia
bloomMonths: [5, 6, 7, 8, 9, 10],

// zinnia
bloomMonths: [6, 7, 8, 9, 10],

// impatiens
bloomMonths: [5, 6, 7, 8, 9, 10],

// begonia
bloomMonths: [5, 6, 7, 8, 9, 10],

// geranium
bloomMonths: [5, 6, 7, 8, 9, 10],

// snapdragon
bloomMonths: [4, 5, 6, 7, 8, 9, 10],

// cosmos
bloomMonths: [6, 7, 8, 9, 10],

// ── Shrubs ──
// boxwood
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// hydrangea
bloomMonths: [6, 7, 8, 9],
foliageMonths: [4, 5, 6, 7, 8, 9, 10],

// azalea
bloomMonths: [4, 5],
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// rose-knockout
bloomMonths: [5, 6, 7, 8, 9, 10],

// holly
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// lilac
bloomMonths: [4, 5],

// butterfly-bush
bloomMonths: [6, 7, 8, 9],

// spirea
bloomMonths: [4, 5, 6],
foliageMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],

// juniper
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// ── Ground Covers ──
// creeping-thyme
bloomMonths: [6, 7],
foliageMonths: [4, 5, 6, 7, 8, 9, 10],

// pachysandra
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// vinca
bloomMonths: [4, 5, 6],
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// ajuga
bloomMonths: [4, 5],
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// irish-moss
bloomMonths: [5, 6],
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// sedum-ground-cover
bloomMonths: [8, 9],
foliageMonths: [4, 5, 6, 7, 8, 9, 10],

// liriope
bloomMonths: [8, 9],
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// ── Grasses ──
// fountain-grass
foliageMonths: [4, 5, 6, 7, 8, 9, 10, 11],

// blue-fescue
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// mondo-grass
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// karl-foerster
bloomMonths: [6, 7, 8, 9],
foliageMonths: [4, 5, 6, 7, 8, 9, 10, 11],

// switchgrass
foliageMonths: [4, 5, 6, 7, 8, 9, 10, 11],

// bermuda
foliageMonths: [4, 5, 6, 7, 8, 9, 10],

// tall-fescue
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// zoysia
foliageMonths: [4, 5, 6, 7, 8, 9, 10],

// ── Trees ──
// japanese-maple
foliageMonths: [4, 5, 6, 7, 8, 9, 10, 11],

// dogwood
bloomMonths: [4, 5],
foliageMonths: [4, 5, 6, 7, 8, 9, 10],

// crape-myrtle
bloomMonths: [6, 7, 8, 9],

// redbud
bloomMonths: [3, 4],
foliageMonths: [4, 5, 6, 7, 8, 9, 10],

// magnolia
bloomMonths: [3, 4, 5],
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// river-birch
foliageMonths: [4, 5, 6, 7, 8, 9, 10, 11],

// ── Patio/Container ──
// dwarf-boxwood
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// ornamental-pepper
bloomMonths: [6, 7, 8, 9, 10],
foliageMonths: [5, 6, 7, 8, 9, 10],

// trailing-rosemary
bloomMonths: [3, 4, 5],
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// potted-palm
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// hibiscus
bloomMonths: [5, 6, 7, 8, 9, 10],

// bird-of-paradise
bloomMonths: [5, 6, 7, 8, 9],
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// bougainvillea
bloomMonths: [4, 5, 6, 7, 8, 9, 10, 11],

// agapanthus
bloomMonths: [6, 7, 8],
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

// dwarf-palmetto
foliageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
```

- [ ] **Step 2: Run type check to verify data is valid**

Run: `npx tsc --noEmit`
Expected: PASS — all entries match `PlantInfo` type

- [ ] **Step 3: Verify existing plant catalog tests still pass**

Run: `npx vitest run src/data/plant-catalog.test.ts`
Expected: All 10 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/data/plant-catalog.ts
git commit -m "feat: add bloom/foliage month data to all 62 plants"
```

---

### Task 2: Build bloom timeline aggregation logic (TDD)

**Files:**
- Create: `src/geo/bloom-timeline.test.ts`
- Create: `src/geo/bloom-timeline.ts`

**Reference:**
- `src/types.ts` — `Zone`, `PlantAssignment`, `PlantInfo`
- `src/data/plant-catalog.ts:830` — `getPlantById(id): PlantInfo | undefined`

- [ ] **Step 1: Write failing tests**

Create `src/geo/bloom-timeline.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import type { PlantInfo, Zone } from "../types";
import { buildBloomTimeline } from "./bloom-timeline";

function makePlant(
  id: string,
  bloom?: number[],
  foliage?: number[],
): PlantInfo {
  return {
    id,
    name: id,
    category: "perennial",
    sunRequirement: "full-sun",
    waterNeed: "low",
    spacingInches: 18,
    matureHeightFt: 2,
    matureWidthFt: 2,
    emoji: "🌸",
    tags: [],
    zoneCompatibility: ["garden-bed"],
    bloomMonths: bloom,
    foliageMonths: foliage,
  };
}

function makeZone(id: string, plantIds: string[]): Zone {
  return {
    id,
    category: "garden-bed",
    vertices: [],
    areaSqFt: 100,
    plants: plantIds.map((pid) => ({
      plantId: pid,
      quantity: 5,
      calculatedQuantity: 5,
    })),
  };
}

const catalog: Record<string, PlantInfo> = {};
function addPlant(p: PlantInfo): void {
  catalog[p.id] = p;
}
function lookup(id: string): PlantInfo | undefined {
  return catalog[id];
}

describe("buildBloomTimeline", () => {
  beforeEach(() => {
    for (const key of Object.keys(catalog)) delete catalog[key];
  });

  it("returns empty timeline for empty zones", () => {
    const result = buildBloomTimeline([], lookup);
    expect(result.months).toHaveLength(12);
    expect(result.months.every((m) => m.totalInterest === 0)).toBe(true);
    expect(result.gapMonths).toEqual([]);
    expect(result.plantCount).toBe(0);
  });

  it("returns empty timeline for zones with no plants", () => {
    const zone: Zone = {
      id: "z1",
      category: "garden-bed",
      vertices: [],
      areaSqFt: 100,
    };
    const result = buildBloomTimeline([zone], lookup);
    expect(result.plantCount).toBe(0);
    expect(result.gapMonths).toEqual([]);
  });

  it("returns plantCount 0 when plants have no bloom/foliage data", () => {
    addPlant(makePlant("plain"));
    const result = buildBloomTimeline([makeZone("z1", ["plain"])], lookup);
    expect(result.plantCount).toBe(0);
    expect(result.gapMonths).toEqual([]);
  });

  it("populates bloom months for a single plant", () => {
    addPlant(makePlant("daisy", [4, 5, 6]));
    const result = buildBloomTimeline([makeZone("z1", ["daisy"])], lookup);

    expect(result.plantCount).toBe(1);
    expect(result.months[3].bloomingPlants).toEqual(["daisy"]); // April = index 3
    expect(result.months[3].totalInterest).toBe(1);
    expect(result.months[0].totalInterest).toBe(0); // January
  });

  it("populates both bloom and foliage, counts plant once per month", () => {
    addPlant(makePlant("dual", [6, 7], [5, 6, 7, 8]));
    const result = buildBloomTimeline([makeZone("z1", ["dual"])], lookup);

    // June (index 5): both bloom and foliage
    expect(result.months[5].bloomingPlants).toEqual(["dual"]);
    expect(result.months[5].foliagePlants).toEqual(["dual"]);
    expect(result.months[5].totalInterest).toBe(1); // deduplicated

    // May (index 4): foliage only
    expect(result.months[4].bloomingPlants).toEqual([]);
    expect(result.months[4].foliagePlants).toEqual(["dual"]);
    expect(result.months[4].totalInterest).toBe(1);
  });

  it("deduplicates same plant across two zones", () => {
    addPlant(makePlant("rose", [5, 6]));
    const result = buildBloomTimeline(
      [makeZone("z1", ["rose"]), makeZone("z2", ["rose"])],
      lookup,
    );

    expect(result.plantCount).toBe(1);
    expect(result.months[4].bloomingPlants).toEqual(["rose"]); // May
    expect(result.months[4].totalInterest).toBe(1);
  });

  it("detects gap months correctly", () => {
    addPlant(makePlant("spring", [3, 4, 5, 6]));
    addPlant(makePlant("fall", [9, 10, 11]));
    const result = buildBloomTimeline(
      [makeZone("z1", ["spring", "fall"])],
      lookup,
    );

    expect(result.plantCount).toBe(2);
    expect(result.gapMonths).toEqual([1, 2, 7, 8, 12]);
  });

  it("returns empty gapMonths when all 12 months covered", () => {
    addPlant(
      makePlant("evergreen", undefined, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    );
    const result = buildBloomTimeline(
      [makeZone("z1", ["evergreen"])],
      lookup,
    );

    expect(result.gapMonths).toEqual([]);
  });

  it("ignores plants not found in catalog lookup", () => {
    const result = buildBloomTimeline(
      [makeZone("z1", ["nonexistent"])],
      lookup,
    );
    expect(result.plantCount).toBe(0);
  });

  it("month numbers are 1-indexed (1=Jan, 12=Dec)", () => {
    addPlant(makePlant("jan", [1]));
    const result = buildBloomTimeline([makeZone("z1", ["jan"])], lookup);

    expect(result.months[0].month).toBe(1);
    expect(result.months[0].bloomingPlants).toEqual(["jan"]);
    expect(result.months[11].month).toBe(12);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/geo/bloom-timeline.test.ts`
Expected: FAIL — `Cannot find module './bloom-timeline'`

- [ ] **Step 3: Implement `buildBloomTimeline`**

Create `src/geo/bloom-timeline.ts`:

```typescript
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
}

export function buildBloomTimeline(
  zones: Zone[],
  getPlantInfo: (id: string) => PlantInfo | undefined,
): BloomTimeline {
  const months: MonthSummary[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    bloomingPlants: [],
    foliagePlants: [],
    totalInterest: 0,
  }));

  // Collect unique plant IDs across all zones
  const seenPlantIds = new Set<string>();
  for (const zone of zones) {
    for (const assignment of zone.plants ?? []) {
      seenPlantIds.add(assignment.plantId);
    }
  }

  // Populate months from deduplicated plants
  let plantCount = 0;
  for (const plantId of seenPlantIds) {
    const plant = getPlantInfo(plantId);
    if (!plant) continue;

    const hasBloom = plant.bloomMonths && plant.bloomMonths.length > 0;
    const hasFoliage = plant.foliageMonths && plant.foliageMonths.length > 0;
    if (!hasBloom && !hasFoliage) continue;

    plantCount++;

    if (plant.bloomMonths) {
      for (const m of plant.bloomMonths) {
        months[m - 1].bloomingPlants.push(plantId);
      }
    }
    if (plant.foliageMonths) {
      for (const m of plant.foliageMonths) {
        months[m - 1].foliagePlants.push(plantId);
      }
    }
  }

  // Compute totalInterest (deduplicated count per month)
  for (const month of months) {
    const unique = new Set([...month.bloomingPlants, ...month.foliagePlants]);
    month.totalInterest = unique.size;
  }

  // Gap months: only relevant when at least one plant contributes data
  const gapMonths: number[] = [];
  if (plantCount > 0) {
    for (const month of months) {
      if (month.totalInterest === 0) {
        gapMonths.push(month.month);
      }
    }
  }

  return { months, gapMonths, plantCount };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/geo/bloom-timeline.test.ts`
Expected: All 9 tests pass

- [ ] **Step 5: Run full test suite + type check**

Run: `npm test && npx tsc --noEmit`
Expected: All tests pass, no type errors

- [ ] **Step 6: Commit**

```bash
git add src/geo/bloom-timeline.ts src/geo/bloom-timeline.test.ts
git commit -m "feat: add bloom timeline aggregation logic with tests"
```

---

### Task 3: Build bloom timeline view component

**Files:**
- Create: `src/components/bloom-timeline.ts`

**Reference:**
- `src/geo/bloom-timeline.ts` — `buildBloomTimeline()`, `BloomTimeline`, `MonthSummary`
- `src/data/plant-catalog.ts:830` — `getPlantById(id): PlantInfo | undefined`
- `src/types.ts` — `Zone`

- [ ] **Step 1: Create the view component**

Create `src/components/bloom-timeline.ts`:

```typescript
import { getPlantById } from "../data/plant-catalog";
import { buildBloomTimeline } from "../geo/bloom-timeline";
import type { Zone } from "../types";

const MONTH_LABELS = [
  "J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function renderBloomTimeline(
  container: HTMLElement,
  zones: Zone[],
): void {
  const timeline = buildBloomTimeline(zones, getPlantById);

  if (timeline.plantCount === 0) return;

  const section = document.createElement("div");
  section.className = "bloom-timeline";

  // Header
  const header = document.createElement("h3");
  header.textContent = "Bloom Timeline";
  section.appendChild(header);

  // Month header row
  const headerRow = document.createElement("div");
  headerRow.className = "bloom-grid bloom-header-row";
  const labelCell = document.createElement("div");
  labelCell.className = "bloom-label";
  labelCell.textContent = "";
  headerRow.appendChild(labelCell);

  for (const abbr of MONTH_LABELS) {
    const cell = document.createElement("div");
    cell.className = "bloom-month-label";
    cell.textContent = abbr;
    headerRow.appendChild(cell);
  }
  section.appendChild(headerRow);

  // Summary bar row
  const summaryRow = document.createElement("div");
  summaryRow.className = "bloom-grid bloom-summary-row";
  const summaryLabel = document.createElement("div");
  summaryLabel.className = "bloom-label";
  summaryLabel.textContent = "Coverage";
  summaryRow.appendChild(summaryLabel);

  const maxInterest = Math.max(...timeline.months.map((m) => m.totalInterest));

  for (const month of timeline.months) {
    const cell = document.createElement("div");
    cell.className = "bloom-cell";
    cell.setAttribute("data-month", String(month.month));

    if (month.totalInterest === 0) {
      cell.classList.add("bloom-cell-gap");
    } else {
      cell.classList.add("bloom-cell-active");
      const intensity = maxInterest > 0
        ? Math.max(0.3, month.totalInterest / maxInterest)
        : 0;
      cell.style.opacity = String(intensity);
    }
    cell.textContent = month.totalInterest > 0 ? String(month.totalInterest) : "";
    summaryRow.appendChild(cell);
  }
  section.appendChild(summaryRow);

  // Gap callout
  if (timeline.gapMonths.length > 0) {
    const gapText = document.createElement("p");
    gapText.className = "bloom-gap-callout";
    const gapNames = timeline.gapMonths.map((m) => MONTH_NAMES[m - 1]);
    gapText.textContent = `No bloom coverage in ${gapNames.join(", ")}`;
    section.appendChild(gapText);
  }

  // Expandable plant rows
  const plantSection = document.createElement("div");
  plantSection.className = "bloom-plant-rows";
  plantSection.hidden = true;

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "btn btn-secondary bloom-toggle";
  toggleBtn.textContent = `Show ${timeline.plantCount} plants`;
  toggleBtn.addEventListener("click", () => {
    plantSection.hidden = !plantSection.hidden;
    toggleBtn.textContent = plantSection.hidden
      ? `Show ${timeline.plantCount} plants`
      : "Hide plants";
  });
  section.appendChild(toggleBtn);

  // Build plant rows from the timeline data
  const seenPlants = new Set<string>();
  for (const month of timeline.months) {
    for (const id of [...month.bloomingPlants, ...month.foliagePlants]) {
      seenPlants.add(id);
    }
  }

  for (const plantId of seenPlants) {
    const plant = getPlantById(plantId);
    if (!plant) continue;

    const row = document.createElement("div");
    row.className = "bloom-grid bloom-plant-row";

    const nameCell = document.createElement("div");
    nameCell.className = "bloom-label";
    nameCell.textContent = `${plant.emoji} ${plant.name}`;
    row.appendChild(nameCell);

    for (const month of timeline.months) {
      const cell = document.createElement("div");
      cell.className = "bloom-cell";

      const isBlooming = month.bloomingPlants.includes(plantId);
      const isFoliage = month.foliagePlants.includes(plantId);

      if (isBlooming) {
        cell.classList.add("bloom-cell-bloom");
      } else if (isFoliage) {
        cell.classList.add("bloom-cell-foliage");
      }

      row.appendChild(cell);
    }
    plantSection.appendChild(row);
  }

  section.appendChild(plantSection);
  container.appendChild(section);
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/bloom-timeline.ts
git commit -m "feat: add bloom timeline view component"
```

---

### Task 4: Wire bloom timeline into yard summary

**Files:**
- Modify: `src/components/yard-summary.ts:1-4` (imports)
- Modify: `src/components/yard-summary.ts:88-103` (after zone summary)

**Reference:**
- `src/components/yard-summary.ts` — current file structure
- `src/components/bloom-timeline.ts` — `renderBloomTimeline(container, zones)`

- [ ] **Step 1: Add import**

Add to the top of `src/components/yard-summary.ts`, after the existing imports:

```typescript
import { renderBloomTimeline } from "./bloom-timeline";
```

- [ ] **Step 2: Call renderBloomTimeline after zone summary**

In `renderYardSummary`, after the `if (onAddZones)` block that calls `renderZoneSummary` (around line 103), add:

```typescript
  // Bloom timeline (after zones section)
  renderBloomTimeline(wrapper, design.zones ?? []);
```

This goes right before the `container.textContent = ""` line (line 105).

- [ ] **Step 3: Run type check and tests**

Run: `npx tsc --noEmit && npm test`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add src/components/yard-summary.ts
git commit -m "feat: wire bloom timeline into yard summary"
```

---

### Task 5: Add CSS styles for bloom timeline

**Files:**
- Modify: `src/style.css` (append before end of file)

**Reference:**
- CSS variables in `src/style.css:1-10`: `--blue`, `--bg`, `--surface`, `--text`, `--text-muted`, `--border`, `--radius`
- Component classes: `.bloom-timeline`, `.bloom-grid`, `.bloom-cell`, etc.

- [ ] **Step 1: Add bloom timeline styles**

Append to the end of `src/style.css`:

```css
/* Bloom Timeline */
.bloom-timeline {
  margin-top: 24px;
  padding: 16px;
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.bloom-timeline h3 {
  margin: 0 0 12px 0;
}

.bloom-grid {
  display: grid;
  grid-template-columns: 140px repeat(12, 1fr);
  gap: 2px;
  align-items: center;
}

.bloom-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 8px;
}

.bloom-month-label {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.bloom-cell {
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--bg);
}

.bloom-cell-active {
  background: #22c55e;
  color: #000;
}

.bloom-cell-gap {
  background: #ef4444;
  opacity: 0.4;
}

.bloom-cell-bloom {
  background: #22c55e;
  opacity: 0.8;
}

.bloom-cell-foliage {
  background: #22c55e;
  opacity: 0.25;
}

.bloom-summary-row {
  margin-bottom: 8px;
}

.bloom-gap-callout {
  color: #ef4444;
  font-size: 0.85rem;
  margin: 8px 0;
  font-weight: 500;
}

.bloom-toggle {
  font-size: 0.8rem;
  margin: 8px 0;
}

.bloom-plant-rows {
  margin-top: 8px;
}

.bloom-plant-row {
  margin-bottom: 2px;
}

.bloom-plant-row .bloom-label {
  font-size: 0.75rem;
}

/* Print styles */
@media print {
  .bloom-timeline {
    break-inside: avoid;
    background: #fff;
    border: 1px solid #ccc;
    color: #000;
  }

  .bloom-toggle {
    display: none;
  }

  .bloom-plant-rows {
    display: block !important;
  }

  .bloom-cell-active {
    background: #4ade80;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .bloom-cell-gap {
    background: #fca5a5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .bloom-cell-bloom {
    background: #4ade80;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .bloom-cell-foliage {
    background: #bbf7d0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .bloom-gap-callout {
    color: #dc2626;
  }

  .bloom-label {
    color: #333;
  }
}
```

- [ ] **Step 2: Run lint check**

Run: `npx biome check ./src`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "feat: add bloom timeline CSS styles with print support"
```

---

### Task 6: E2E tests for bloom timeline

**Files:**
- Create: `e2e/bloom-timeline.spec.ts`

**Reference:**
- `e2e/zones.spec.ts:1-50` — fixture design pattern with localStorage injection
- `src/data/plant-catalog.ts` — lavender has `bloomMonths: [6, 7, 8]`

- [ ] **Step 1: Create E2E test file**

Create `e2e/bloom-timeline.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

const FIXTURE_DESIGN_WITH_BLOOMS = {
  id: "test-bloom-design",
  address: "456 Garden Lane",
  center: { lat: 37.7749, lng: -122.4194 },
  boundary: [
    { lat: 37.7751, lng: -122.4198 },
    { lat: 37.7751, lng: -122.419 },
    { lat: 37.7747, lng: -122.419 },
    { lat: 37.7747, lng: -122.4198 },
  ],
  areaSqFt: 1200,
  perimeterFt: 140,
  usdaZone: "9b",
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
  zones: [
    {
      id: "zone-1",
      category: "garden-bed",
      vertices: [
        { lat: 37.775, lng: -122.4196 },
        { lat: 37.775, lng: -122.4193 },
        { lat: 37.7748, lng: -122.4193 },
      ],
      areaSqFt: 200,
      plants: [
        { plantId: "lavender", quantity: 5, calculatedQuantity: 5 },
        { plantId: "hydrangea", quantity: 3, calculatedQuantity: 3 },
      ],
    },
  ],
};

const FIXTURE_DESIGN_NO_PLANTS = {
  id: "test-no-plants",
  address: "789 Empty Ave",
  center: { lat: 37.7749, lng: -122.4194 },
  boundary: [
    { lat: 37.7751, lng: -122.4198 },
    { lat: 37.7751, lng: -122.419 },
    { lat: 37.7747, lng: -122.419 },
    { lat: 37.7747, lng: -122.4198 },
  ],
  areaSqFt: 800,
  perimeterFt: 120,
  usdaZone: "9b",
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
  zones: [
    {
      id: "zone-1",
      category: "garden-bed",
      vertices: [
        { lat: 37.775, lng: -122.4196 },
        { lat: 37.775, lng: -122.4193 },
        { lat: 37.7748, lng: -122.4193 },
      ],
      areaSqFt: 200,
    },
  ],
};

test("bloom timeline visible when plants with bloom data are assigned", async ({
  page,
}) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN_WITH_BLOOMS);

  await page.goto("/");
  await expect(page.locator(".bloom-timeline")).toBeVisible();
  await expect(page.locator(".bloom-timeline h3")).toHaveText("Bloom Timeline");
});

test("bloom timeline hidden when no plants assigned", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN_NO_PLANTS);

  await page.goto("/");
  await expect(page.locator(".bloom-timeline")).not.toBeVisible();
});

test("gap callout shows months with no coverage", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN_WITH_BLOOMS);

  await page.goto("/");

  // Lavender blooms June-Aug, Hydrangea blooms June-Sep with foliage Apr-Oct
  // Gaps should be: January, February, March, November, December
  const gapCallout = page.locator(".bloom-gap-callout");
  await expect(gapCallout).toBeVisible();
  await expect(gapCallout).toContainText("January");
  await expect(gapCallout).toContainText("February");
  await expect(gapCallout).toContainText("December");
});

test("month cells have correct visual states", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN_WITH_BLOOMS);

  await page.goto("/");

  // Active month cell (June = month 6, both plants bloom)
  const juneCell = page.locator(
    '.bloom-summary-row .bloom-cell[data-month="6"]',
  );
  await expect(juneCell).toHaveClass(/bloom-cell-active/);

  // Gap month cell (January = month 1)
  const janCell = page.locator(
    '.bloom-summary-row .bloom-cell[data-month="1"]',
  );
  await expect(janCell).toHaveClass(/bloom-cell-gap/);
});

test("show/hide toggle reveals plant detail rows", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN_WITH_BLOOMS);

  await page.goto("/");

  const toggle = page.locator(".bloom-toggle");
  await expect(toggle).toContainText("Show");

  await toggle.click();
  await expect(page.locator(".bloom-plant-rows")).toBeVisible();
  await expect(toggle).toContainText("Hide");

  await toggle.click();
  await expect(page.locator(".bloom-plant-rows")).not.toBeVisible();
});
```

- [ ] **Step 2: Run E2E tests**

Run: `npx playwright test e2e/bloom-timeline.spec.ts`
Expected: All 5 tests pass

- [ ] **Step 3: Run full E2E suite for regression**

Run: `npx playwright test --grep-invert @visual`
Expected: All existing E2E tests pass alongside new ones

- [ ] **Step 4: Commit**

```bash
git add e2e/bloom-timeline.spec.ts
git commit -m "feat: add E2E tests for bloom timeline rendering"
```

---

## Verification Checklist

After all tasks are complete:

1. `npm test` — all unit tests pass (74 existing + 9 new = 83+)
2. `npx tsc --noEmit` — no type errors
3. `npx biome check ./src` — no lint errors
4. `npx playwright test --grep-invert @visual` — all E2E tests pass
5. Browser verify: load app with saved design containing zones with plants → bloom timeline renders below zones → gap months highlighted → toggle expands plant detail rows
6. Print preview: timeline renders on white background, toggle button hidden, plant rows visible
