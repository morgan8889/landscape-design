# Garden Beds / Planting Zones — Feature Design

**Date**: 2026-03-27
**Status**: Approved
**Depends on**: Yard Canvas P1 (merged)

## Purpose

After tracing their yard boundary, homeowners can subdivide the yard into zones — garden beds, lawn, patio, paths, etc. Each zone is a freeform polygon drawn on the satellite map with a predefined category and color. This is the foundation for future plant placement and cost estimation.

## User Scenario

**Persona**: Sam has already traced their yard boundary and sees the summary with area/perimeter.

**Flow**:
1. Sam clicks "Add Zones" in the yard summary.
2. The satellite map reappears with the yard boundary shown as a fixed overlay (not editable).
3. A zone toolbar appears at the bottom with a category dropdown and drawing instructions.
4. Sam selects "Garden Bed" from the dropdown, then clicks corners of the front garden area.
5. Sam double-clicks (or clicks the first vertex) to close the zone polygon.
6. The zone fills with semi-transparent green. A label shows "Garden Bed — 320 sq ft".
7. Sam selects "Patio" and draws another zone for the back patio area.
8. Sam clicks "Done" to return to the summary.
9. The summary now shows a "Zones" section listing each zone with its category, area, and a delete button.
10. Sam saves the design — zones are persisted with the yard design in localStorage and included in JSON export.

## Data Model

```typescript
type ZoneCategory = "garden-bed" | "lawn" | "patio" | "path" | "deck" | "pool";

interface Zone {
  id: string;
  category: ZoneCategory;
  vertices: LatLng[];
  areaSqFt: number;
}
```

Add to `YardDesign`:
```typescript
zones?: Zone[];
```

## Category Colors

| Category | Label | Color | Fill Opacity |
|----------|-------|-------|-------------|
| garden-bed | Garden Bed | #22c55e | 30% |
| lawn | Lawn | #86efac | 20% |
| patio | Patio | #a78bfa | 30% |
| path | Path | #fbbf24 | 30% |
| deck | Deck | #f97316 | 30% |
| pool | Pool | #38bdf8 | 40% |

## Components

### ZoneDrawer
Reuses the boundary-drawer pattern:
- GeoJSON source + fill layer (category color) + line layer (dashed outline)
- Click-to-place vertices with markers
- Double-click or click first vertex to close
- Undo last point / Clear buttons
- On close: calculates area using existing Shoelace formula, calls `onZoneClosed(zone)` callback

Differs from boundary-drawer:
- Fill color comes from the selected category
- Label overlay shows "Category — X sq ft" after closing
- No interaction with the Mapbox map click events for pan/zoom while drawing (same as boundary)

### ZoneManager
Toolbar UI that sits above the map:
- Category dropdown (6 options with color indicators)
- "Add Zone" / "Done" buttons
- Zone count display ("3 zones")
- Instructions text that updates based on state
- Manages the lifecycle: select category → draw → close → repeat or done
- Keeps all completed zones rendered on the map as filled polygons
- Passes completed zones back to the caller

### ZoneSummary
Added to the existing yard-summary component:
- Section header "Zones" with zone count
- List of zone cards, each showing:
  - Color dot + category label
  - Area in sq ft
  - Delete button (removes zone from the list)
- Total zone area vs yard area comparison (optional, nice-to-have)
- "Add Zones" button to return to zone drawing mode

## Integration with Existing Code

### main.ts
- `renderSummary` passes an `onAddZones` callback to `renderYardSummary`
- `onAddZones` calls a new `renderZoneEditor(design)` function
- `renderZoneEditor` opens the map with boundary overlay + ZoneManager
- When done, updates `design.zones` and calls `renderSummary(updatedDesign)`

### renderYardSummary
- Add "Add Zones" button to the actions section
- Add ZoneSummary section if `design.zones` exists and has entries
- "Delete" on a zone updates the design and re-renders summary

### saveDesign / loadDesign / exportDesignJson
- Work as-is — `zones` is just an optional array in the YardDesign object
- JSON export includes zones with all data

### Area Calculation
- Reuse `calculateAreaSqFt` from `src/geo/area.ts` for each zone's vertices
- Same Shoelace formula on projected coordinates

## What's NOT in P1
- Editing a zone after it's drawn (delete and redraw instead)
- Zone overlap detection or prevention
- Drag-to-move or resize zones
- Zone-specific plant recommendations
- Image-mode zone drawing (map-only for P1)
- Zone perimeter calculation (just area)
- Snapping zones to boundary edges

## Success Criteria

1. User can add zones to a completed yard design via "Add Zones" button
2. Zone drawing uses same click-to-place polygon interaction as boundary
3. Each zone has a predefined category with a distinct color
4. Zone area is calculated and displayed correctly
5. Multiple zones can be drawn in a single session
6. Zones persist in localStorage and are included in JSON export
7. Zones can be deleted from the summary view
8. Returning to zone editor shows existing zones on the map
9. All acceptance scenarios have passing automated tests
