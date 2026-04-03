# Quality Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable confirm dialog, wire it into destructive actions (New Design, zone delete, plant remove), and expand unit + E2E test coverage.

**Architecture:** New `confirm-dialog.ts` component provides `showConfirmDialog()` used at three call sites. `clearDesign()` is added to `local-store.ts`. Unit tests target exported pure functions and DOM rendering via jsdom. E2E tests verify the confirmation flows in a real browser.

**Tech Stack:** TypeScript, Vitest + jsdom (unit), Playwright (E2E), vanilla DOM, Vite

---

## File Map

**New files:**
- `src/components/confirm-dialog.ts` — reusable modal component
- `src/components/confirm-dialog.test.ts` — unit tests
- `e2e/confirm-dialog.spec.ts` — E2E tests for New Design flow

**Modified files:**
- `src/storage/local-store.ts` — add `clearDesign()`
- `src/storage/local-store.test.ts` — add `clearDesign` tests
- `src/components/plant-browser.ts` — export `filterPlants()`, use it internally
- `src/components/plant-browser.test.ts` — expand with `filterPlants` tests
- `src/components/shopping-list-view.test.ts` — add DOM render tests
- `src/components/zone-detail.ts` — wire plant remove to confirm dialog
- `src/components/zone-detail.test.ts` — add DOM render tests
- `src/components/zone-summary.ts` — wire zone delete to confirm dialog
- `src/components/zone-summary.test.ts` — add DOM render tests
- `src/components/yard-summary.ts` — add New Design button
- `vite.config.ts` — remove `zone-summary.ts` from coverage exclusions
- `e2e/zones.spec.ts` — add confirmation dialog tests
- `e2e/plant-palette.spec.ts` — add confirmation dialog tests

---

## Task 1: Branch Cleanup

**Files:** none (git only)

- [ ] **Step 1: Delete 7 merged local branches**

```bash
git branch -d bloom-timeline cost-estimation fix/automation-friction fix/enforcement-gaps fix/validate-cost-on-load garden-zones shopping-list
```

Expected output: each branch deleted with "Deleted branch <name>".

- [ ] **Step 2: Verify remaining branches**

```bash
git branch
```

Expected: only `main` (and `feat/plane-env-gate` if still present remotely).

---

## Task 2: `clearDesign()` Function

**Files:**
- Modify: `src/storage/local-store.ts`
- Modify: `src/storage/local-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `src/storage/local-store.test.ts`:

```ts
describe("clearDesign", () => {
  it("removes the saved design from localStorage", () => {
    saveDesign(sampleDesign);
    clearDesign();
    expect(loadDesign()).toBeNull();
  });

  it("is a no-op when nothing is saved", () => {
    expect(() => clearDesign()).not.toThrow();
    expect(loadDesign()).toBeNull();
  });
});
```

Update the import at the top of the file:
```ts
import { clearDesign, exportDesignJson, loadDesign, saveDesign } from "./local-store";
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -- src/storage/local-store.test.ts
```

Expected: FAIL — `clearDesign is not exported`

- [ ] **Step 3: Implement `clearDesign`**

Add to the bottom of `src/storage/local-store.ts`:

```ts
export function clearDesign(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- src/storage/local-store.test.ts
```

Expected: 14 tests pass (was 12).

- [ ] **Step 5: Commit**

```bash
git add src/storage/local-store.ts src/storage/local-store.test.ts
git commit -m "feat: add clearDesign() to local-store"
```

---

## Task 3: ConfirmDialog Component

**Files:**
- Create: `src/components/confirm-dialog.ts`
- Create: `src/components/confirm-dialog.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/components/confirm-dialog.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { showConfirmDialog } from "./confirm-dialog";

afterEach(() => {
  document.body.replaceChildren();
});

describe("showConfirmDialog", () => {
  it("renders title and body", () => {
    showConfirmDialog({
      title: "Are you sure?",
      body: "This cannot be undone.",
      actions: [
        { label: "Confirm", variant: "danger", onClick: vi.fn() },
        { label: "Cancel", variant: "ghost", onClick: vi.fn() },
      ],
    });
    expect(
      document.querySelector(".confirm-dialog-title")?.textContent,
    ).toBe("Are you sure?");
    expect(
      document.querySelector(".confirm-dialog-body")?.textContent,
    ).toBe("This cannot be undone.");
  });

  it("renders one button per action", () => {
    showConfirmDialog({
      title: "Delete?",
      body: "Gone forever.",
      actions: [
        { label: "Delete", variant: "danger", onClick: vi.fn() },
        { label: "Cancel", variant: "ghost", onClick: vi.fn() },
      ],
    });
    const buttons = document.querySelectorAll(".confirm-dialog-btn");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe("Delete");
    expect(buttons[1].textContent).toBe("Cancel");
  });

  it("fires action callback and removes dialog when button clicked", () => {
    const onClick = vi.fn();
    showConfirmDialog({
      title: "Test",
      body: "Body",
      actions: [
        { label: "OK", variant: "primary", onClick },
        { label: "Cancel", variant: "ghost", onClick: vi.fn() },
      ],
    });
    (
      document.querySelector(".confirm-dialog-btn") as HTMLButtonElement
    ).click();
    expect(onClick).toHaveBeenCalledOnce();
    expect(document.querySelector(".confirm-dialog-overlay")).toBeNull();
  });

  it("fires ghost action and closes on Escape key", () => {
    const onCancel = vi.fn();
    showConfirmDialog({
      title: "Test",
      body: "Body",
      actions: [
        { label: "OK", variant: "danger", onClick: vi.fn() },
        { label: "Cancel", variant: "ghost", onClick: onCancel },
      ],
    });
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(onCancel).toHaveBeenCalledOnce();
    expect(document.querySelector(".confirm-dialog-overlay")).toBeNull();
  });

  it("fires ghost action and closes on backdrop click", () => {
    const onCancel = vi.fn();
    showConfirmDialog({
      title: "Test",
      body: "Body",
      actions: [
        { label: "OK", variant: "danger", onClick: vi.fn() },
        { label: "Cancel", variant: "ghost", onClick: onCancel },
      ],
    });
    const overlay = document.querySelector(
      ".confirm-dialog-overlay",
    ) as HTMLElement;
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: false }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(document.querySelector(".confirm-dialog-overlay")).toBeNull();
  });

  it("returned cleanup function removes dialog without firing callbacks", () => {
    const onClick = vi.fn();
    const close = showConfirmDialog({
      title: "Test",
      body: "Body",
      actions: [{ label: "OK", variant: "primary", onClick }],
    });
    expect(document.querySelector(".confirm-dialog-overlay")).not.toBeNull();
    close();
    expect(document.querySelector(".confirm-dialog-overlay")).toBeNull();
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -- src/components/confirm-dialog.test.ts
```

Expected: FAIL — `Cannot find module './confirm-dialog'`

- [ ] **Step 3: Implement `confirm-dialog.ts`**

Create `src/components/confirm-dialog.ts`:

```ts
// src/components/confirm-dialog.ts

export interface DialogAction {
  label: string;
  variant: "primary" | "danger" | "ghost";
  onClick: () => void;
}

export function showConfirmDialog(opts: {
  title: string;
  body: string;
  actions: DialogAction[];
}): () => void {
  const overlay = document.createElement("div");
  overlay.className = "confirm-dialog-overlay";

  const dialog = document.createElement("div");
  dialog.className = "confirm-dialog";

  const titleEl = document.createElement("h3");
  titleEl.className = "confirm-dialog-title";
  titleEl.textContent = opts.title;

  const bodyEl = document.createElement("p");
  bodyEl.className = "confirm-dialog-body";
  bodyEl.textContent = opts.body;

  const actionsEl = document.createElement("div");
  actionsEl.className = "confirm-dialog-actions";

  function close(): void {
    overlay.remove();
    document.removeEventListener("keydown", onKeyDown);
  }

  for (const action of opts.actions) {
    const btn = document.createElement("button");
    btn.className = `btn confirm-dialog-btn confirm-dialog-btn-${action.variant}`;
    btn.textContent = action.label;
    btn.addEventListener("click", () => {
      close();
      action.onClick();
    });
    actionsEl.appendChild(btn);
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key !== "Escape") return;
    const ghost = [...opts.actions].reverse().find((a) => a.variant === "ghost");
    close();
    ghost?.onClick();
  }

  overlay.addEventListener("click", (e) => {
    if (e.target !== overlay) return;
    const ghost = [...opts.actions].reverse().find((a) => a.variant === "ghost");
    close();
    ghost?.onClick();
  });

  document.addEventListener("keydown", onKeyDown);

  dialog.append(titleEl, bodyEl, actionsEl);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  return close;
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- src/components/confirm-dialog.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Add CSS for the dialog**

Add to the bottom of `src/style.css`:

```css
/* ── Confirm Dialog ─────────────────────────────── */
.confirm-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-dialog {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.confirm-dialog-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.confirm-dialog-body {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.confirm-dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}

.confirm-dialog-btn-danger {
  background: #c0392b;
  color: #fff;
  border-color: #c0392b;
}

.confirm-dialog-btn-danger:hover {
  background: #a93226;
}

.confirm-dialog-btn-ghost {
  background: transparent;
  border-color: var(--border);
}
```

- [ ] **Step 6: Run full test suite to verify no regressions**

```bash
npm test
```

Expected: 160 tests pass (154 + 6 new).

- [ ] **Step 7: Commit**

```bash
git add src/components/confirm-dialog.ts src/components/confirm-dialog.test.ts src/style.css
git commit -m "feat: add reusable ConfirmDialog component"
```

---

## Task 4: New Design Button

**Files:**
- Modify: `src/components/yard-summary.ts`

- [ ] **Step 1: Update imports in `yard-summary.ts`**

At the top of `src/components/yard-summary.ts`, change the local-store import to:

```ts
import { clearDesign, exportDesignJson, saveDesign } from "../storage/local-store";
```

Add the confirm-dialog import after the local-store import line:

```ts
import { showConfirmDialog } from "./confirm-dialog";
```

- [ ] **Step 2: Add the New Design button element**

In `renderYardSummary`, after the `editBtn` declaration, add:

```ts
  const newDesignBtn = document.createElement("button");
  newDesignBtn.className = "btn btn-secondary new-design-btn";
  newDesignBtn.textContent = "New Design";

  newDesignBtn.addEventListener("click", () => {
    showConfirmDialog({
      title: "Start a new design?",
      body: "Download a backup of your current design before starting over?",
      actions: [
        {
          label: "Download & Start Over",
          variant: "primary",
          onClick: () => {
            const json = exportDesignJson(design);
            triggerJsonDownload(json, `yard-design-${design.id}.json`);
            clearDesign();
            location.reload();
          },
        },
        {
          label: "Start Over",
          variant: "danger",
          onClick: () => {
            clearDesign();
            location.reload();
          },
        },
        { label: "Cancel", variant: "ghost", onClick: () => {} },
      ],
    });
  });
```

- [ ] **Step 3: Add the button to both actionsDiv branches**

Replace both `actionsDiv.append(...)` calls (the if/else block) with:

```ts
  if (onShoppingList && projectCost > 0) {
    const shoppingBtn = document.createElement("button");
    shoppingBtn.className = "btn btn-secondary shopping-list-btn";
    shoppingBtn.textContent = "Shopping List";
    shoppingBtn.addEventListener("click", onShoppingList);
    actionsDiv.append(saveBtn, exportBtn, shoppingBtn, editBtn, newDesignBtn);
  } else {
    actionsDiv.append(saveBtn, exportBtn, editBtn, newDesignBtn);
  }
```

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: 160 tests pass, no regressions.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/yard-summary.ts
git commit -m "feat: add New Design button with backup prompt"
```

---

## Task 5: Zone Delete Confirmation

**Files:**
- Modify: `src/components/zone-summary.ts`

- [ ] **Step 1: Add import to `zone-summary.ts`**

At the top of `src/components/zone-summary.ts`, add:

```ts
import { showConfirmDialog } from "./confirm-dialog";
```

- [ ] **Step 2: Replace the direct delete with a confirmation**

In `renderZoneSummary`, find the line:

```ts
      deleteBtn.addEventListener("click", () => onDelete(zone.id));
```

Replace it with:

```ts
      deleteBtn.addEventListener("click", () => {
        showConfirmDialog({
          title: "Delete zone?",
          body: "This zone and all its plant assignments will be removed.",
          actions: [
            {
              label: "Delete",
              variant: "danger",
              onClick: () => onDelete(zone.id),
            },
            { label: "Cancel", variant: "ghost", onClick: () => {} },
          ],
        });
      });
```

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: 160 tests pass.

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/zone-summary.ts
git commit -m "feat: gate zone deletion behind confirm dialog"
```

---

## Task 6: Plant Remove Confirmation

**Files:**
- Modify: `src/components/zone-detail.ts`

- [ ] **Step 1: Add import to `zone-detail.ts`**

At the top of `src/components/zone-detail.ts`, add:

```ts
import { showConfirmDialog } from "./confirm-dialog";
```

- [ ] **Step 2: Replace the direct remove with a confirmation**

In `renderZoneDetail`, find the line:

```ts
      removeBtn.addEventListener("click", () =>
        onRemovePlant(assignment.plantId),
      );
```

Replace it with:

```ts
      removeBtn.addEventListener("click", () => {
        showConfirmDialog({
          title: "Remove plant?",
          body: `Remove ${info.name} from this zone?`,
          actions: [
            {
              label: "Remove",
              variant: "danger",
              onClick: () => onRemovePlant(assignment.plantId),
            },
            { label: "Cancel", variant: "ghost", onClick: () => {} },
          ],
        });
      });
```

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: 160 tests pass.

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/zone-detail.ts
git commit -m "feat: gate plant removal behind confirm dialog"
```

---

## Task 7: Plant Browser Unit Tests

**Files:**
- Modify: `src/components/plant-browser.ts` — export `filterPlants`
- Modify: `src/components/plant-browser.test.ts` — expand

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `src/components/plant-browser.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import type { PlantInfo } from "../types";
import { filterPlants, resolveCostOverride } from "./plant-browser";

const fullSunLow: PlantInfo = {
  id: "lavender",
  name: "Lavender",
  category: "perennial",
  sunRequirement: "full-sun",
  waterNeed: "low",
  spacingInches: 18,
  matureHeightFt: 2,
  matureWidthFt: 2,
  emoji: "💜",
  tags: ["pollinator", "fragrant"],
  zoneCompatibility: ["garden-bed"],
  costPerUnit: 8.99,
};

const shadeMod: PlantInfo = {
  id: "hosta",
  name: "Hosta",
  category: "perennial",
  sunRequirement: "partial-shade",
  waterNeed: "moderate",
  spacingInches: 24,
  matureHeightFt: 1.5,
  matureWidthFt: 2,
  emoji: "🌿",
  tags: ["shade-tolerant"],
  zoneCompatibility: ["garden-bed"],
  costPerUnit: 12.0,
};

const plants = [fullSunLow, shadeMod];

describe("filterPlants", () => {
  it("returns all plants when filter is empty", () => {
    expect(filterPlants(plants, "")).toEqual(plants);
  });

  it("filters by sunRequirement", () => {
    expect(filterPlants(plants, "full-sun")).toEqual([fullSunLow]);
  });

  it("filters by waterNeed", () => {
    expect(filterPlants(plants, "low")).toEqual([fullSunLow]);
  });

  it("filters by tag", () => {
    expect(filterPlants(plants, "pollinator")).toEqual([fullSunLow]);
  });

  it("returns empty array when no plants match", () => {
    expect(filterPlants(plants, "full-shade")).toEqual([]);
  });

  it("matches partial-shade sunRequirement", () => {
    expect(filterPlants(plants, "partial-shade")).toEqual([shadeMod]);
  });
});

describe("resolveCostOverride", () => {
  it("returns undefined when price was not edited", () => {
    expect(resolveCostOverride(false, 9.99)).toBeUndefined();
  });

  it("returns price when edited with a valid number", () => {
    expect(resolveCostOverride(true, 12.5)).toBe(12.5);
  });

  it("returns undefined when price field was cleared (NaN)", () => {
    expect(resolveCostOverride(true, Number.NaN)).toBeUndefined();
  });

  it("returns 0 when price is explicitly set to zero", () => {
    expect(resolveCostOverride(true, 0)).toBe(0);
  });

  it("returns undefined when price is negative", () => {
    expect(resolveCostOverride(true, -5)).toBeUndefined();
  });

  it("returns undefined when price is Infinity", () => {
    expect(resolveCostOverride(true, Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -- src/components/plant-browser.test.ts
```

Expected: FAIL — `filterPlants is not exported from './plant-browser'`

- [ ] **Step 3: Export `filterPlants` from `plant-browser.ts`**

In `src/components/plant-browser.ts`, add this exported function before `renderPlantBrowser` (after the `toTitleCase` helper):

```ts
export function filterPlants(plants: PlantInfo[], filter: string): PlantInfo[] {
  if (!filter) return plants;
  return plants.filter(
    (p) =>
      p.sunRequirement === filter ||
      p.waterNeed === filter ||
      p.tags.includes(filter),
  );
}
```

Remove the `applyFilters` closure inside `renderPlantBrowser`:

```ts
  // DELETE this entire function:
  function applyFilters(plants: PlantInfo[]): PlantInfo[] {
    if (!activeFilter) return plants;
    return plants.filter(
      (p) =>
        p.sunRequirement === activeFilter ||
        p.waterNeed === activeFilter ||
        p.tags.includes(activeFilter),
    );
  }
```

In `renderList`, change:

```ts
    const results = applyFilters(searchPlants(query, zone.category));
```

to:

```ts
    const results = filterPlants(searchPlants(query, zone.category), activeFilter);
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- src/components/plant-browser.test.ts
```

Expected: 12 tests pass (6 new + 6 existing).

- [ ] **Step 5: Run full test suite for regressions**

```bash
npm test
```

Expected: 166 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/plant-browser.ts src/components/plant-browser.test.ts
git commit -m "test: export filterPlants and expand plant-browser tests"
```

---

## Task 8: Shopping List Unit Tests

**Files:**
- Modify: `src/components/shopping-list-view.test.ts`

- [ ] **Step 1: Write the new DOM render tests**

Replace the full contents of `src/components/shopping-list-view.test.ts` with:

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { Zone, ZoneCategory } from "../types";
import { buildZoneLabels, renderShoppingList } from "./shopping-list-view";

const zone = (id: string, category: ZoneCategory): Zone => ({
  id,
  category,
  vertices: [],
  areaSqFt: 100,
  plants: [],
});

describe("buildZoneLabels", () => {
  it("returns category label for a single zone", () => {
    const labels = buildZoneLabels([zone("z1", "garden-bed")]);
    expect(labels.get("z1")).toBe("Garden Bed");
  });

  it("appends index when multiple zones share a category", () => {
    const labels = buildZoneLabels([
      zone("z1", "garden-bed"),
      zone("z2", "garden-bed"),
    ]);
    expect(labels.get("z1")).toBe("Garden Bed #1");
    expect(labels.get("z2")).toBe("Garden Bed #2");
  });

  it("does not index zones whose category is unique", () => {
    const labels = buildZoneLabels([
      zone("z1", "garden-bed"),
      zone("z2", "lawn"),
      zone("z3", "garden-bed"),
    ]);
    expect(labels.get("z1")).toBe("Garden Bed #1");
    expect(labels.get("z2")).toBe("Lawn");
    expect(labels.get("z3")).toBe("Garden Bed #2");
  });

  it("returns an empty map for an empty zones array", () => {
    expect(buildZoneLabels([])).toEqual(new Map());
  });
});

const DESIGN_BASE = {
  id: "test-id",
  address: "1 Test St",
  center: { lat: 0, lng: 0 },
  boundary: [],
  areaSqFt: 100,
  perimeterFt: 40,
  usdaZone: "8b",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("renderShoppingList", () => {
  it("shows empty state when design has no plants", () => {
    const container = document.createElement("div");
    renderShoppingList(container, { ...DESIGN_BASE, zones: [] }, vi.fn());
    expect(container.querySelector(".shopping-list-empty")).not.toBeNull();
  });

  it("renders a plant row when design has a plant assignment", () => {
    const container = document.createElement("div");
    const design = {
      ...DESIGN_BASE,
      zones: [
        {
          id: "z1",
          category: "garden-bed" as ZoneCategory,
          vertices: [],
          areaSqFt: 320,
          plants: [
            { plantId: "lavender", quantity: 10, calculatedQuantity: 10 },
          ],
        },
      ],
    };
    renderShoppingList(container, design, vi.fn());
    expect(container.querySelector(".shopping-item-name")?.textContent).toBe(
      "Lavender",
    );
    expect(container.querySelector(".shopping-item-qty")?.textContent).toBe(
      "x10",
    );
  });

  it("shows the grand total when plants are present", () => {
    const container = document.createElement("div");
    const design = {
      ...DESIGN_BASE,
      zones: [
        {
          id: "z1",
          category: "garden-bed" as ZoneCategory,
          vertices: [],
          areaSqFt: 320,
          plants: [
            { plantId: "lavender", quantity: 2, calculatedQuantity: 2 },
          ],
        },
      ],
    };
    renderShoppingList(container, design, vi.fn());
    expect(container.querySelector(".shopping-total-amount")).not.toBeNull();
  });

  it("calls onBack when Back to Summary button is clicked", () => {
    const container = document.createElement("div");
    const onBack = vi.fn();
    renderShoppingList(container, { ...DESIGN_BASE, zones: [] }, onBack);
    const backBtn = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".btn"),
    ).find((b) => b.textContent === "Back to Summary");
    backBtn?.click();
    expect(onBack).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- src/components/shopping-list-view.test.ts
```

Expected: 8 tests pass (4 existing + 4 new).

- [ ] **Step 3: Run full suite**

```bash
npm test
```

Expected: 170+ tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/shopping-list-view.test.ts
git commit -m "test: expand shopping-list-view with DOM render tests"
```

---

## Task 9: Zone Detail & Zone Summary Unit Tests

**Files:**
- Modify: `src/components/zone-detail.test.ts`
- Modify: `src/components/zone-summary.test.ts`
- Modify: `vite.config.ts` — remove `zone-summary.ts` from exclusions

- [ ] **Step 1: Write new zone-detail DOM tests**

Replace the full contents of `src/components/zone-detail.test.ts` with:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Zone } from "../types";
import { formatCoverage, formatZoneCost, renderZoneDetail } from "./zone-detail";

afterEach(() => {
  document.body.replaceChildren();
});

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

const emptyZone: Zone = {
  id: "z1",
  category: "garden-bed",
  vertices: [],
  areaSqFt: 320,
};

const zoneWithPlant: Zone = {
  ...emptyZone,
  plants: [{ plantId: "lavender", quantity: 5, calculatedQuantity: 5 }],
};

describe("renderZoneDetail", () => {
  it("shows 'No plants assigned' for an empty zone", () => {
    const container = document.createElement("div");
    renderZoneDetail(container, emptyZone, vi.fn(), vi.fn());
    expect(container.querySelector(".zone-detail-empty")?.textContent).toBe(
      "No plants assigned",
    );
  });

  it("renders area in sq ft", () => {
    const container = document.createElement("div");
    renderZoneDetail(container, emptyZone, vi.fn(), vi.fn());
    expect(container.querySelector(".zone-detail-area")?.textContent).toBe(
      "320 sq ft",
    );
  });

  it("renders plant quantity when plants present", () => {
    const container = document.createElement("div");
    renderZoneDetail(container, zoneWithPlant, vi.fn(), vi.fn());
    const rows = container.querySelectorAll(".zone-plant-row");
    expect(rows).toHaveLength(1);
    expect(container.querySelector(".zone-plant-qty")?.textContent).toBe("×5");
  });

  it("renders coverage percent when plants present", () => {
    const container = document.createElement("div");
    renderZoneDetail(container, zoneWithPlant, vi.fn(), vi.fn());
    expect(container.querySelector(".zone-coverage-percent")).not.toBeNull();
  });

  it("calls onAddPlants when Add Plants button clicked", () => {
    const onAdd = vi.fn();
    const container = document.createElement("div");
    renderZoneDetail(container, emptyZone, onAdd, vi.fn());
    container
      .querySelector<HTMLButtonElement>(".zone-detail-add-btn")
      ?.click();
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it("shows confirm dialog (not callback directly) when remove clicked", () => {
    const onRemove = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    renderZoneDetail(container, zoneWithPlant, vi.fn(), onRemove);
    container
      .querySelector<HTMLButtonElement>(".zone-plant-remove")
      ?.click();
    expect(onRemove).not.toHaveBeenCalled();
    expect(document.querySelector(".confirm-dialog-overlay")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Write new zone-summary DOM tests**

Replace the full contents of `src/components/zone-summary.test.ts` with:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Zone } from "../types";
import {
  formatZoneArea,
  getTotalZoneArea,
  renderZoneSummary,
} from "./zone-summary";

afterEach(() => {
  document.body.replaceChildren();
});

describe("formatZoneArea", () => {
  it("formats area with category label", () => {
    expect(formatZoneArea("garden-bed", 320)).toBe("Garden Bed — 320 sq ft");
  });

  it("rounds to nearest integer", () => {
    expect(formatZoneArea("patio", 150.7)).toBe("Patio — 151 sq ft");
  });
});

describe("getTotalZoneArea", () => {
  it("sums all zone areas", () => {
    const zones: Zone[] = [
      { id: "1", category: "garden-bed", vertices: [], areaSqFt: 100 },
      { id: "2", category: "patio", vertices: [], areaSqFt: 200 },
    ];
    expect(getTotalZoneArea(zones)).toBe(300);
  });

  it("returns 0 for empty array", () => {
    expect(getTotalZoneArea([])).toBe(0);
  });
});

const DESIGN_BASE = {
  id: "test-id",
  address: "1 Test St",
  center: { lat: 0, lng: 0 },
  boundary: [],
  areaSqFt: 100,
  perimeterFt: 40,
  usdaZone: "8b",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("renderZoneSummary", () => {
  it("shows Add Zones button when no zones exist", () => {
    const container = document.createElement("div");
    renderZoneSummary(
      container,
      { ...DESIGN_BASE, zones: [] },
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );
    const btns = container.querySelectorAll<HTMLButtonElement>(".btn");
    const labels = Array.from(btns).map((b) => b.textContent);
    expect(labels).toContain("Add Zones");
  });

  it("shows Edit Zones button when zones exist", () => {
    const container = document.createElement("div");
    const zone: Zone = {
      id: "z1",
      category: "garden-bed",
      vertices: [],
      areaSqFt: 200,
    };
    renderZoneSummary(
      container,
      { ...DESIGN_BASE, zones: [zone] },
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );
    const btns = container.querySelectorAll<HTMLButtonElement>(".btn");
    const labels = Array.from(btns).map((b) => b.textContent);
    expect(labels).toContain("Edit Zones");
  });

  it("calls onAddZones when Add Zones button is clicked", () => {
    const onAddZones = vi.fn();
    const container = document.createElement("div");
    renderZoneSummary(
      container,
      { ...DESIGN_BASE, zones: [] },
      vi.fn(),
      onAddZones,
      vi.fn(),
      vi.fn(),
    );
    const addBtn = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".btn"),
    ).find((b) => b.textContent === "Add Zones");
    addBtn?.click();
    expect(onAddZones).toHaveBeenCalledOnce();
  });

  it("shows a Delete Zone button for each zone", () => {
    const container = document.createElement("div");
    const zones: Zone[] = [
      { id: "z1", category: "garden-bed", vertices: [], areaSqFt: 100 },
      { id: "z2", category: "lawn", vertices: [], areaSqFt: 200 },
    ];
    renderZoneSummary(
      container,
      { ...DESIGN_BASE, zones },
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );
    const deleteBtns = container.querySelectorAll(".zone-delete");
    expect(deleteBtns).toHaveLength(2);
  });

  it("shows confirm dialog (not callback directly) on Delete Zone click", () => {
    const onDelete = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    renderZoneSummary(
      container,
      {
        ...DESIGN_BASE,
        zones: [
          { id: "z1", category: "garden-bed", vertices: [], areaSqFt: 100 },
        ],
      },
      onDelete,
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );
    container.querySelector<HTMLButtonElement>(".zone-delete")?.click();
    expect(onDelete).not.toHaveBeenCalled();
    expect(document.querySelector(".confirm-dialog-overlay")).not.toBeNull();
  });
});
```

- [ ] **Step 3: Remove `zone-summary.ts` from coverage exclusions**

In `vite.config.ts`, remove the `"src/components/zone-summary.ts"` line from the `coverage.exclude` array. The array should become:

```ts
      exclude: [
        "src/test-setup.ts",
        "src/**/*.test.ts",
        "src/components/map-view.ts",
        "src/components/boundary-drawer.ts",
        "src/components/calibration-tool.ts",
        "src/components/image-boundary-drawer.ts",
        "src/components/zone-drawer.ts",
        "src/components/zone-manager.ts",
      ],
```

- [ ] **Step 4: Run all unit tests**

```bash
npm test
```

Expected: 185+ tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/zone-detail.test.ts src/components/zone-summary.test.ts vite.config.ts
git commit -m "test: expand zone-detail and zone-summary DOM tests, remove zone-summary from coverage exclusion"
```

---

## Task 10: E2E — New Design Flow

**Files:**
- Create: `e2e/confirm-dialog.spec.ts`

- [ ] **Step 1: Create the E2E test file**

Create `e2e/confirm-dialog.spec.ts`:

```ts
// e2e/confirm-dialog.spec.ts
import { expect, test } from "@playwright/test";

const FIXTURE_DESIGN = {
  id: "test-confirm-dialog",
  address: "789 New Design Blvd, Austin, TX",
  center: { lat: 30.2672, lng: -97.7431 },
  boundary: [
    { lat: 30.2674, lng: -97.7435 },
    { lat: 30.2674, lng: -97.7427 },
    { lat: 30.267, lng: -97.7427 },
    { lat: 30.267, lng: -97.7435 },
  ],
  areaSqFt: 1500,
  perimeterFt: 160,
  usdaZone: "8b",
  createdAt: "2026-04-03T00:00:00Z",
  updatedAt: "2026-04-03T00:00:00Z",
};

test("New Design button is visible in summary view", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await expect(page.locator(".yard-summary")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /New Design/i }),
  ).toBeVisible();
});

test("New Design button opens confirm dialog", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await page.getByRole("button", { name: /New Design/i }).click();
  await expect(page.locator(".confirm-dialog-overlay")).toBeVisible();
  await expect(page.locator(".confirm-dialog-title")).toContainText(
    "Start a new design?",
  );
});

test("Cancel closes dialog and preserves design", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await page.getByRole("button", { name: /New Design/i }).click();
  await page.getByRole("button", { name: /Cancel/i }).click();

  await expect(page.locator(".confirm-dialog-overlay")).not.toBeVisible();
  await expect(page.locator(".yard-summary")).toBeVisible();

  const stored = await page.evaluate(() =>
    localStorage.getItem("yard-design"),
  );
  expect(stored).not.toBeNull();
});

test("Start Over clears design and shows address search", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, FIXTURE_DESIGN);

  await page.goto("/");
  await page.getByRole("button", { name: /New Design/i }).click();
  await page.getByRole("button", { name: /^Start Over$/i }).click();

  await expect(page.locator(".yard-summary")).not.toBeVisible();
  const stored = await page.evaluate(() =>
    localStorage.getItem("yard-design"),
  );
  expect(stored).toBeNull();
});
```

- [ ] **Step 2: Run the E2E tests**

```bash
npx playwright test e2e/confirm-dialog.spec.ts
```

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/confirm-dialog.spec.ts
git commit -m "test: add E2E tests for New Design confirm dialog flow"
```

---

## Task 11: E2E — Zone Delete Confirmation

**Files:**
- Modify: `e2e/zones.spec.ts`

- [ ] **Step 1: Append confirmation tests to `zones.spec.ts`**

Add to the bottom of `e2e/zones.spec.ts`:

```ts
const DESIGN_WITH_ZONE = {
  id: "test-zones-confirm",
  address: "321 Zone St, Denver, CO",
  center: { lat: 39.7392, lng: -104.9903 },
  boundary: [
    { lat: 39.7394, lng: -104.9907 },
    { lat: 39.7394, lng: -104.9899 },
    { lat: 39.739, lng: -104.9899 },
    { lat: 39.739, lng: -104.9907 },
  ],
  areaSqFt: 1100,
  perimeterFt: 130,
  usdaZone: "5b",
  createdAt: "2026-04-03T00:00:00Z",
  updatedAt: "2026-04-03T00:00:00Z",
  zones: [
    {
      id: "zone-confirm-1",
      category: "garden-bed",
      vertices: [
        { lat: 39.7393, lng: -104.9905 },
        { lat: 39.7393, lng: -104.9901 },
        { lat: 39.7391, lng: -104.9901 },
      ],
      areaSqFt: 200,
    },
  ],
};

test("zone delete button opens confirm dialog", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, DESIGN_WITH_ZONE);

  await page.goto("/");
  await expect(page.locator(".zone-item")).toBeVisible();
  await page.locator(".zone-delete").click();
  await expect(page.locator(".confirm-dialog-overlay")).toBeVisible();
  await expect(page.locator(".confirm-dialog-title")).toContainText(
    "Delete zone?",
  );
});

test("cancel on zone delete dialog preserves zone", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, DESIGN_WITH_ZONE);

  await page.goto("/");
  await page.locator(".zone-delete").click();
  await page.getByRole("button", { name: /Cancel/i }).click();
  await expect(page.locator(".confirm-dialog-overlay")).not.toBeVisible();
  await expect(page.locator(".zone-item")).toBeVisible();
});

test("confirm on zone delete dialog removes the zone", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, DESIGN_WITH_ZONE);

  await page.goto("/");
  await page.locator(".zone-delete").click();
  await page.getByRole("button", { name: /^Delete$/i }).click();
  await expect(page.locator(".confirm-dialog-overlay")).not.toBeVisible();
  await expect(page.locator(".zone-item")).not.toBeVisible();
});
```

- [ ] **Step 2: Run the expanded E2E suite**

```bash
npx playwright test e2e/zones.spec.ts
```

Expected: 5 tests pass (2 existing + 3 new).

- [ ] **Step 3: Commit**

```bash
git add e2e/zones.spec.ts
git commit -m "test: add E2E tests for zone delete confirmation"
```

---

## Task 12: E2E — Plant Remove Confirmation

**Files:**
- Modify: `e2e/plant-palette.spec.ts`

- [ ] **Step 1: Append plant remove confirmation tests**

Add to the bottom of `e2e/plant-palette.spec.ts`:

```ts
const DESIGN_WITH_PLANT = {
  id: "test-plant-remove-confirm",
  address: "555 Plant Rd, Seattle, WA",
  center: { lat: 47.6062, lng: -122.3321 },
  boundary: [
    { lat: 47.6064, lng: -122.3325 },
    { lat: 47.6064, lng: -122.3317 },
    { lat: 47.606, lng: -122.3317 },
    { lat: 47.606, lng: -122.3325 },
  ],
  areaSqFt: 900,
  perimeterFt: 120,
  usdaZone: "8b",
  createdAt: "2026-04-03T00:00:00Z",
  updatedAt: "2026-04-03T00:00:00Z",
  zones: [
    {
      id: "zone-plant-confirm",
      category: "garden-bed",
      vertices: [
        { lat: 47.6063, lng: -122.3323 },
        { lat: 47.6063, lng: -122.3319 },
        { lat: 47.6061, lng: -122.3319 },
      ],
      areaSqFt: 320,
      plants: [
        { plantId: "lavender", quantity: 10, calculatedQuantity: 10 },
      ],
    },
  ],
};

test("plant remove button opens confirm dialog", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, DESIGN_WITH_PLANT);

  await page.goto("/");
  await expect(page.locator(".zone-plant-row")).toBeVisible();
  await page.locator(".zone-plant-remove").click();
  await expect(page.locator(".confirm-dialog-overlay")).toBeVisible();
  await expect(page.locator(".confirm-dialog-title")).toContainText(
    "Remove plant?",
  );
});

test("cancel on plant remove dialog preserves plant", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, DESIGN_WITH_PLANT);

  await page.goto("/");
  await page.locator(".zone-plant-remove").click();
  await page.getByRole("button", { name: /Cancel/i }).click();
  await expect(page.locator(".confirm-dialog-overlay")).not.toBeVisible();
  await expect(page.locator(".zone-plant-row")).toBeVisible();
});

test("confirm on plant remove dialog removes the plant", async ({ page }) => {
  await page.addInitScript((design) => {
    localStorage.setItem("yard-design", JSON.stringify(design));
  }, DESIGN_WITH_PLANT);

  await page.goto("/");
  await page.locator(".zone-plant-remove").click();
  await page.getByRole("button", { name: /^Remove$/i }).click();
  await expect(page.locator(".confirm-dialog-overlay")).not.toBeVisible();
  await expect(page.locator(".zone-plant-row")).not.toBeVisible();
});
```

- [ ] **Step 2: Run the expanded E2E suite**

```bash
npx playwright test e2e/plant-palette.spec.ts
```

Expected: 8 tests pass (5 existing + 3 new).

- [ ] **Step 3: Run all E2E tests for full regression**

```bash
npx playwright test
```

Expected: all suites pass.

- [ ] **Step 4: Commit**

```bash
git add e2e/plant-palette.spec.ts
git commit -m "test: add E2E tests for plant remove confirmation"
```

---

## Self-Review

**Spec coverage check:**
- [x] `showConfirmDialog` renders + fires — Task 3
- [x] New Design button — Task 4
- [x] Zone delete confirmation — Task 5
- [x] Plant remove confirmation — Task 6
- [x] `clearDesign()` — Task 2
- [x] Plant browser `filterPlants` tests — Task 7
- [x] Shopping list DOM tests — Task 8
- [x] Zone detail DOM tests — Task 9
- [x] Zone summary DOM tests + coverage exclusion removal — Task 9
- [x] E2E confirm-dialog.spec.ts — Task 10
- [x] E2E zones.spec.ts expansion — Task 11
- [x] E2E plant-palette.spec.ts expansion — Task 12
- [x] Branch cleanup — Task 1

**Type consistency:**
- `showConfirmDialog` signature consistent across Tasks 3, 4, 5, 6
- `clearDesign()` defined Task 2, called Task 4
- `filterPlants(plants: PlantInfo[], filter: string)` defined + called Task 7
- `DialogAction` interface defined in confirm-dialog.ts, used inline at call sites

**Placeholder scan:** No TBDs, no "implement later", all code blocks complete.
