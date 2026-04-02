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

## Plane Integration (Optional)

Track work items in [Plane](https://plane.so) automatically. Hooks inject context at session start, commit, PR, and stop events.

### Setup

1. **Configure env var** — add to `~/.claude/settings.json`:
   ```json
   {
     "env": {
       "PLANE_ENABLED": "1",
       "PLANE_API_KEY": "<your-api-key>",
       "PLANE_WORKSPACE_SLUG": "<your-workspace>"
     }
   }
   ```
   Or export in your shell profile.

2. **Add the Plane MCP server** — configure in `.mcp.json` or your MCP settings:
   ```json
   {
     "mcpServers": {
       "plane": {
         "command": "python",
         "args": ["-m", "plane_mcp", "stdio"],
         "env": {
           "PLANE_API_KEY": "<your-api-key>",
           "PLANE_WORKSPACE_SLUG": "<your-workspace>"
         }
       }
     }
   }
   ```

3. **Populate project registry** — run `/speckit.specify` on your first feature. The skill auto-creates a Plane project and populates `.claude/skills/plane-dev/references/projects.md`.

### What it does

| Event | Plane Action |
|-------|-------------|
| Session start | Detects ticket from branch name, loads ticket state |
| `feat:` commit | Adds commit comment to ticket, marks child tasks Done |
| PR gate passes | Links PR to parent ticket, moves to In Review |
| PR created | Moves parent ticket to Done |
| `/speckit.specify` | Creates Plane project + parent ticket |
| `/speckit.taskstoissues --plane` | Creates child tickets from tasks.md |

Without `PLANE_ENABLED=1`, all Plane integration is silently skipped.
