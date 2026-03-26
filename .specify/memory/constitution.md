<!--
SYNC IMPACT REPORT
==================
Version change: (uninitialized template) → 1.0.0
Modified principles: N/A — initial creation from template
Added sections:
  - Core Principles (5 principles)
  - Technology Standards
  - Quality Gates
  - Governance
Removed sections: N/A
Templates updated:
  - ✅ .specify/templates/plan-template.md — Constitution Check gates added
  - ✅ .specify/templates/spec-template.md — no structural changes required; principles are compatible
  - ✅ .specify/templates/tasks-template.md — no structural changes required; principles are compatible
Deferred TODOs: None
-->

# Landscape Design Constitution

## Core Principles

### I. User-Centric Design

Every feature MUST be designed around the needs of homeowners and landscape enthusiasts
planning their yards — not around internal technical convenience.

- All UI/UX decisions MUST be validated against a concrete user scenario before
  implementation begins.
- Features that add complexity without clear user value MUST be rejected.
- The app MUST be usable by non-technical users with no landscaping expertise.

**Rationale**: The primary risk for a consumer-facing design tool is building something
that developers find elegant but users find confusing. User value is the north star.

### II. Data Accuracy

Plant information, spatial measurements, and cost estimates are the core data of this
application — they MUST be correct or explicitly flagged as approximate.

- Plant data (species, care requirements, dimensions) MUST reference a validated source
  or be clearly marked as user-supplied estimates.
- Spatial calculations (area, coverage, spacing) MUST use validated formulas with
  appropriate unit handling.
- Cost data MUST display currency, date context, and data source so users can assess
  reliability.
- No silent data coercion: unit mismatches MUST surface as errors, not silently convert.

**Rationale**: Errors in plant sizing or cost estimation translate directly to wasted
money and failed projects for real users. Data quality is non-negotiable.

### III. Test-First (NON-NEGOTIABLE)

Tests MUST be written and confirmed to fail before any implementation code is written.

- Red-Green-Refactor cycle is mandatory for all features.
- User story acceptance scenarios from the spec MUST map to automated tests.
- No implementation task is "done" until its corresponding tests pass.

**Rationale**: This project involves complex domain logic (spatial calculations, plant
compatibility rules, cost aggregation) where silent regressions are costly. Tests
provide the safety net that allows confident iteration.

### IV. Incremental Delivery

Each feature MUST deliver standalone, demonstrable value before the next feature begins.

- Every spec MUST identify a P1 user story that constitutes the MVP slice.
- The P1 story MUST be shippable independently — subsequent stories add to it, not
  complete it.
- Design for incremental extension: data models and APIs MUST accommodate known future
  requirements without over-engineering for unknowns.

**Rationale**: A landscape design tool risks scope creep (plant database + AR + 3D
rendering + cost tracking all at once). Incremental delivery keeps the project
shippable and learnable.

### V. Simplicity

The simplest solution that satisfies the requirement MUST be chosen. Complexity requires
explicit justification.

- YAGNI applies: do not build for hypothetical future requirements.
- Each introduced abstraction, pattern, or dependency MUST justify its cost in the
  Complexity Tracking section of the plan.
- Third-party dependencies MUST be evaluated for: maintenance health, bundle size
  impact, and licensing compatibility.

**Rationale**: Landscape design tools accumulate features (plant pickers, map
integrations, 3D previews) that can overwhelm a codebase. Simplicity keeps the system
maintainable as scope grows.

## Technology Standards

The technology stack for this project is intentionally deferred to the first feature's
plan.md — choices are made feature-by-feature and recorded there. The following
constraints apply regardless of stack:

- The application MUST be web-accessible (browser-based or PWA); native-only delivery
  is not acceptable for v1.
- Data persistence MUST support export (JSON or CSV) so users are never locked in.
- External API integrations (plant databases, mapping) MUST degrade gracefully when
  unavailable — the app MUST remain functional with cached or user-supplied data.
- All third-party services MUST be documented in the feature plan with a fallback
  strategy.

## Quality Gates

The following gates MUST be satisfied before any feature is considered complete:

1. **Spec gate**: A feature spec with at least one independently testable P1 user story
   exists and has been reviewed.
2. **Plan gate**: A plan.md Constitution Check section confirms compliance with all five
   Core Principles.
3. **Test gate**: All acceptance scenarios defined in the spec have corresponding
   automated tests that passed on the final implementation.
4. **Data gate**: Any new plant, spatial, or cost data introduced by the feature is
   sourced, validated, and documented.
5. **Simplicity gate**: The Complexity Tracking table in plan.md is empty, OR every
   entry has a justified rationale.

## Governance

This constitution supersedes all other project conventions. When a conflict arises
between this document and any other guideline, the constitution takes precedence.

**Amendment procedure**:
1. Propose the amendment in a PR with a description of the change and its rationale.
2. The amendment MUST be reflected in the Sync Impact Report (HTML comment at top of
   this file).
3. Version MUST be incremented per semantic versioning rules defined below.
4. Dependent templates (`.specify/templates/`) MUST be checked for alignment and
   updated in the same PR.

**Versioning policy**:
- MAJOR: Removal or redefinition of a Core Principle, or removal of a Quality Gate.
- MINOR: New principle, new quality gate, or new mandatory section added.
- PATCH: Wording clarifications, typo fixes, non-semantic refinements.

**Compliance review**:
- Every plan.md MUST include a Constitution Check section confirming compliance.
- Code review MUST verify that no Quality Gate is bypassed without a documented
  exception in the Complexity Tracking table.

**Version**: 1.0.0 | **Ratified**: 2026-03-25 | **Last Amended**: 2026-03-25
