# Landscape Design

> Browser-based landscape design app for homeowners — trace your yard, plan garden zones, pick plants, and estimate project costs.

## Features

- **Yard Canvas** (`yard-canvas`): Address search + satellite view. Trace your yard boundary by clicking corners; get instant area and perimeter calculations. Foundation for all other features.
- **Garden Beds / Planting Zones** (`garden-zones`): Subdivide your yard into zones — garden beds, lawn, patio, paths. Each zone is a freeform polygon with a color-coded category.
- **Image Upload Fallback** (`image-fallback`): When Mapbox is unavailable or you prefer your own photo, upload a yard image and trace on it instead.
- **Plant Palette** (`plant-palette`): Browse 52 plants filtered by zone category. Add plants to zones with quantity calculated from coverage area. See how many plants you need.
- **Cost Estimation** (`cost-estimation`): See inline cost per plant assignment, zone subtotals, and a project-wide total. Override prices to match your local nursery. Costs persist with your design.

## Getting Started

```bash
npm install
npm run dev        # Start dev server
npm test           # Run unit tests
npm run test:e2e   # Run E2E tests (requires dev server)
npm run build      # Production build
npm run typecheck  # TypeScript check
npm run lint       # Lint + format check
```

## Architecture

TypeScript + Vite, no framework. Canvas rendering via Leaflet (satellite tiles from Mapbox). Pure functions for all cost and coverage math (`src/geo/`). State persisted to localStorage as JSON. Tests with Vitest (unit) and Playwright (E2E).

See `docs/superpowers/plans/` for per-feature implementation plans and `docs/superpowers/specs/` for feature design specs.

## Contributing

This project uses a spec-driven workflow. See `.claude/commands/` for available slash commands and `.specify/memory/constitution.md` for project principles.
