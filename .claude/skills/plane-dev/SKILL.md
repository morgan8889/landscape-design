---
name: plane-dev
description: Plane project management integration for the Superpowers development workflow. Hooks into Superpowers lifecycle: brainstorming design doc → create parent ticket; writing-plans plan doc → create child tickets per Task block; subagent-driven-development task complete → mark Done + commit comment; finishing-a-development-branch PR → link PR, move to In Review. Also handles: ingesting Claude native/.specify/generic markdown specs, board snapshot, standup, git log sync, board health check, zero-to-board from rough idea, auto-labelling. Triggers on: Superpowers lifecycle events, "ingest spec", "create tickets", "start working on", "task complete", "mark done", "update plane", "sync plane", "show the board", "standup", "what ticket am I on", "health check", "stale tickets", "build me a", "add labels", "PR opened".
---

# Plane Dev — Superpowers Integration

Plane is the source of truth for all work. Every Superpowers lifecycle event has a corresponding Plane action. No manual tracking.

## Setup

All Plane integration requires `PLANE_ENABLED=1` in the environment. Set it in `~/.claude/settings.json`:

```json
{
  "env": {
    "PLANE_ENABLED": "1"
  }
}
```

Or export it in your shell profile. Without this, all hooks and commands silently skip Plane actions.

You also need the Plane MCP server configured — see the project README for full setup instructions.

## Workspace

> **Setup required:** populate these values from your Plane instance, or run `list_projects()` to discover them.

- **Slug:** `<your-workspace-slug>`
- **User ID:** `<your-user-uuid>`
- **Base URL:** `<your-plane-instance-url>`
- **Style:** Kanban — see `references/projects.md` for project IDs + state UUIDs

---

## Superpowers Lifecycle Hooks

### Hook 1: After `brainstorming` → Create Parent Ticket

Triggered when: brainstorming skill writes its design doc to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`

**Action:**
1. Read the design doc — extract title, goal, and key sections
2. Create parent ticket:
   ```
   create_work_item(project_id, name=<feature title>,
     description_html=<design doc converted to HTML>,
     priority=<inferred>, state=<todo UUID>)
   ```
3. Move to **In Progress**: `update_work_item(state=<started UUID>)`
4. **Announce:** `"Created Plane ticket PROJ-N: <title>"`

---

### Hook 2: After `writing-plans` → Create Child Tickets

Triggered when: writing-plans skill writes `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`

The plan file uses Superpowers task structure — groups of `- [ ]` steps under `### Task N: <name>` headings.

**Action:**
1. Parse the plan file — extract each `### Task N: <Component Name>` block
2. For each Task block, create one child ticket:
   ```
   create_work_item(project_id, name="Task N: <Component Name>",
     description_html=<task block as HTML>,
     parent=<parent ticket UUID>,
     state=<todo UUID>, priority="medium")
   ```
3. If task descriptions mention explicit ordering ("after Task 2", "requires Task 1") — create `blocked_by` relations
4. **Announce:** `"Created N child tickets for PROJ-X. Ready to implement."`

> **Note:** Map Superpowers tasks (2-5 min granular steps) at the `### Task N` level — not individual `- [ ]` step level. Each Task block = one Plane ticket.

---

### Hook 3: During `subagent-driven-development` → Mark Tasks Done

Triggered when: a task is marked complete (`- [x]`) in the plan, or `subagent-driven-development` announces a task is done.

**Action — after each completed task:**
1. Find the matching child ticket by name/number
2. Move to **Done**: `update_work_item(state=<completed UUID>)`
3. Add comment with the commit ref:
   ```
   create_work_item_comment(project_id, work_item_id,
     comment_html="<p><strong>Done</strong> — <code>PROJ-N: commit message</code></p>")
   ```
4. Check if all children are done → if so, prompt to move parent to Done or In Review

---

### Hook 4: `finishing-a-development-branch` → Link PR

Triggered when: finishing-a-development-branch skill creates a PR (Option 2).

**Action:**
1. Get the PR URL from `gh pr create` output
2. Link to parent ticket: `create_work_item_link(project_id, parent_id, url=<PR URL>)`
3. Move parent to **In Review** (started group) if not already Done
4. Add comment: `"<p>PR opened: <a href='...'>link</a></p>"`
5. After merge → move parent to **Done**

---

## Manual Spec Ingestion (Non-Superpowers Specs)

When given a spec that wasn't produced by Superpowers, parse it using `references/spec-formats.md`:
- **Claude native** — `.claude/specs/<feature>/requirements.md + design.md + tasks.md`
- **SpecKit** — `.specify/specs/<NNN>-slug/spec.md + plan.md + tasks.md`
- **Generic markdown** — any file with a task list section

Then follow Hook 1 + Hook 2 logic to create parent + child tickets.

---

## Branch Naming

Always create the Git branch right after Hook 1:
```
git checkout -b feature/PROJ-<n>-<slug>
```
Types: `feature|fix|chore|refactor`. Slug = kebab-case feature title.

Commit format: `PROJ-42: short description` (matches Superpowers TDD commit cadence).

---

## Auto-detect Current Ticket

When no ticket is specified, parse the current branch:
```bash
git branch --show-current  # → "feature/PROJ-42-add-oauth"
```
Extract `PROJ-42` → `retrieve_work_item_by_identifier(project_identifier="PROJ", issue_identifier=42)`

---

## Superpowers — Plane Integration Rules

- **Never block Superpowers flow.** Plane updates happen *after* each Superpowers step completes — never interrupt brainstorming, planning, or implementation.
- **Announce Plane actions briefly.** One line: `"✓ Plane: PROJ-42 → In Progress"`
- **On failure, don't halt.** If a Plane API call fails, log it and continue. Catch up later.
- **Batch when possible.** After a subagent session, update multiple tickets in one pass rather than one call per step.

---

## Hook-Driven Automation

The automation hooks in `.claude/hooks/` inject Plane context at key lifecycle points.
Claude reads these hints and makes the appropriate MCP calls guided by this skill.

| Hook | Event | Plane Context Injected |
|------|-------|----------------------|
| `session-init.sh` | SessionStart | Detects `PROJ-N` from branch, prompts ticket state lookup |
| `post-commit-review.sh` | After feat: commit | Prompts to add commit comment + mark child ticket Done |
| `review-gate.sh` | PR gate passes | Prompts to link PR to parent ticket, move to In Review |
| `on-stop.sh` | PR detected in output | Prompts to move parent ticket to Done |
| `speckit.specify` | Feature spec created | Creates Plane project + parent ticket if MCP available |
| `speckit.taskstoissues --plane` | Tasks generated | Creates child tickets from tasks.md |

These hooks are additive — if Plane MCP is not configured, the hints are ignored.
The hooks never call the Plane API directly; they only inject `additionalContext` JSON.

---

## Superpowers Reference

See `references/superpowers-hooks.md` for the complete hook trigger map, plan file format details, and edge cases.
See `references/projects.md` for project IDs and state UUIDs.
See `references/superpowers.md` for additional power commands (board snapshot, standup, git sync, health check, auto-label, zero-to-board).
