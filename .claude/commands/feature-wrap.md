---
description: Wrap up a completed feature — mark tasks done, update spec status, and update README
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Finalize documentation after a feature is built. This command:
1. Confirms all tasks are complete (or asks permission to mark them done)
2. Updates `spec.md` status to Complete and appends a Build Summary
3. Generates or updates `README.md` at the repo root with the new feature

Run this after implementation is done and before (or after) creating a PR.

## Outline

### 1. Resolve feature context

Run `.specify/scripts/bash/check-prerequisites.sh --json --include-tasks` from repo root and parse the JSON output to extract `FEATURE_DIR` and `AVAILABLE_DOCS`. All paths must be absolute.

If the script fails or returns no `FEATURE_DIR`, abort with:
> "No active feature found. Run `/speckit.specify` to start a feature first."

Read the following files:
- **REQUIRED**: `FEATURE_DIR/spec.md`
- **REQUIRED**: `FEATURE_DIR/tasks.md`
- **IF EXISTS**: `FEATURE_DIR/plan.md`

### 2. Verify tasks are complete

Count incomplete tasks in `tasks.md` — lines matching `- [ ]`.

- **If 0 incomplete tasks**: proceed automatically to step 3.
- **If any incomplete tasks**: display them in a list, then ask:
  > "The following tasks are still open. Mark all as complete and proceed? (yes/no)"

  - On **yes**: replace all `- [ ]` → `- [X]` in `tasks.md`, then proceed.
  - On **no**: stop and tell the user which tasks remain.

Report: "tasks.md — N tasks marked complete" (or "all tasks already complete").

### 3. Update spec.md status

Edit `spec.md` as follows:

**a. Status line** — find the line matching `**Status**: ...` and replace with:
```
**Status**: Complete
```

**b. Completion date** — immediately after the Status line, add (or update if already present):
```
**Completed**: YYYY-MM-DD
```
Use today's date.

**c. Build Summary section** — append the following to the end of `spec.md` (skip if a `## Build Summary` section already exists):

```markdown
---

## Build Summary

- **Completed**: YYYY-MM-DD
- **Branch**: <branch name from FEATURE_DIR path or git>
- **Key decisions**: <summarize 2–4 key technical decisions from plan.md if available, otherwise write "See plan.md">
- **Deviations from spec**: <describe any features that were descoped, changed, or added during implementation — ask the user if none are obvious from comparing spec.md to git history>
```

If the user provided text in `$ARGUMENTS`, use it as context for the Deviations field.

Report: "spec.md — Status set to Complete, Build Summary added."

### 4. Generate or update README.md

Check if `README.md` exists at the **repo root** (not in FEATURE_DIR).

**Collect feature list**: Scan `.specify/specs/*/spec.md` for all specs whose `**Status**` is `Complete`. For each, extract:
- Feature name (from `# Feature Specification: ...` heading)
- One-line description (first sentence of the Overview/Context section, or the spec's first paragraph)
- Branch name (from the `**Feature Branch**` line)

**If README.md does NOT exist** — create it from scratch:

```markdown
# <Project Name>

> <One-line project description from constitution.md or spec Overview>

## Features

<For each completed spec, add a bullet:>
- **<Feature Name>** (`<branch>`): <one-line description>

## Getting Started

```bash
npm install
npm run dev     # Start dev server
npm test        # Run test suite
npm run build   # Production build
```

## Architecture

<If plan.md exists: summarize the tech stack and main architectural decisions in 2–4 sentences. Otherwise: "See `.specify/specs/<branch>/plan.md` for architectural details.">

## Contributing

This project uses a spec-driven workflow. See `.claude/commands/` for available commands and `.specify/memory/constitution.md` for project principles.
```

**If README.md already exists** — update only the `## Features` section:
- If the current feature's branch is NOT already listed under `## Features`, append a new bullet for it.
- If it IS already listed, update the description in place.
- Do not touch any other sections.

Report: "README.md — created/updated with feature entry for `<branch>`."

### 5. Summary report

Print a completion summary:

```
## Feature Wrap Complete

Feature: <feature name>
Branch:  <branch>

Changes:
  tasks.md  — <N tasks marked complete | all tasks already complete>
  spec.md   — Status: Complete, Build Summary added
  README.md — <created | updated with new feature entry>

Next steps:
  - Create PR: gh pr create (or /speckit.implement handoff)
  - Or merge directly if already reviewed
```
