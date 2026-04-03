# Quality Improvements — Design Doc

**Date:** 2026-04-03  
**Status:** Approved  
**Scope:** Confirm dialog component, New Design flow, stale branch cleanup, unit + E2E test coverage expansion

---

## Goal

Address the top-priority quality gaps identified in the 2026-04-03 app audit:

1. No confirmation before destructive actions (delete zone, remove plant, start over)
2. No "New Design" reset flow
3. Under-tested components (27% unit coverage)
4. Missing E2E coverage for destructive flows

---

## Architecture

### 1. `confirm-dialog.ts` — new reusable component

A single generic confirmation modal. No external dependencies.

```ts
interface DialogAction {
  label: string;
  variant: 'primary' | 'danger' | 'ghost';
  onClick: () => void;
}

function showConfirmDialog(opts: {
  title: string;
  body: string;
  actions: DialogAction[];
}): () => void  // returns cleanup/close fn
```

Behaviour:
- Renders a modal overlay with backdrop
- Escape key triggers the last `ghost` action (cancel)
- Backdrop click closes dialog
- Returns a cleanup function that removes the dialog from the DOM

### 2. Three call sites wired to `showConfirmDialog`

| Location | Trigger | Dialog |
|----------|---------|--------|
| `yard-summary.ts` | "New Design" button (new) | Download & Start Over / Start Over / Cancel |
| `zone-manager.ts` | Zone delete button | Delete / Cancel |
| `zone-detail.ts` | Plant remove button | Remove / Cancel |

### 3. `clearDesign()` added to `local-store.ts`

```ts
function clearDesign(): void {
  localStorage.removeItem('yard-design');
}
```

New Design flow:
- "Download & Start Over" → calls existing `downloadDesign()` → then `clearDesign()` → `location.reload()`
- "Start Over" → `clearDesign()` → `location.reload()`
- "Cancel" / Escape → dialog closes, no state change

### 4. Branch cleanup

Delete 7 merged local branches (no code changes):
- `bloom-timeline`, `cost-estimation`, `fix/automation-friction`, `fix/enforcement-gaps`, `fix/validate-cost-on-load`, `garden-zones`, `shopping-list`

---

## Test Strategy

### Unit tests (Vitest + happy-dom)

**New:**
- `src/components/confirm-dialog.test.ts` — renders title/body/actions, each action fires callback, Escape closes, backdrop click closes

**Expanded:**
- `src/components/plant-browser.test.ts` — `filterPlants()` by search, sun, water, combined; add-plant quantity validation; assignment callback payload (target: 6% → ~50%)
- `src/components/shopping-list-view.test.ts` — zone label formatting, multi-plant aggregation, copy-to-clipboard text format (target: 19% → ~60%)
- `src/components/zone-detail.test.ts` — plant rows render, cost per plant, zone subtotal, coverage %, empty zone state
- `src/components/zone-summary.test.ts` — zone name, area in sq ft, plant count, category colour class

**Target:** Overall statement coverage 65% → ~75%. Component coverage 27% → ~55%.

### E2E tests (Playwright)

**New:**
- `e2e/confirm-dialog.spec.ts` — New Design button shows dialog; Cancel leaves design intact; "Start Over" clears localStorage and reloads; "Download & Start Over" triggers download then clears

**Expanded:**
- `e2e/zones.spec.ts` — zone delete now shows confirmation; Cancel preserves zone; Confirm deletes zone
- `e2e/plant-palette.spec.ts` — plant remove now shows confirmation; Cancel preserves plant; Confirm removes plant

**Excluded from E2E:** File download assertion for "Download & Start Over" (flaky — covered by unit test triggering the download callback).

---

## Out of Scope

- Mobile responsiveness
- Accessibility (aria-* attributes)
- Redo functionality
- Multiple design storage
- PDF export

---

## Success Criteria

- [ ] `showConfirmDialog` renders correctly and all action variants fire
- [ ] New Design button visible in summary view
- [ ] Existing zone/plant delete flows now gated by confirmation
- [ ] No regressions in existing 154 tests
- [ ] Statement coverage ≥ 75%
- [ ] All 3 new/expanded E2E suites pass
- [ ] 7 stale local branches deleted
