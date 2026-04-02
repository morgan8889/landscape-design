# Superpowers Reference

Advanced capabilities beyond the core workflow. Load this file when a superpower is invoked.

---

## Current Branch → Ticket Lookup

Auto-find the Plane ticket for whatever branch you're on:

```bash
git branch --show-current
# e.g. "feature/PROJ-42-add-oauth"
# Extract: PROJ-42
```

Parse the branch name with regex `[A-Z]+-[0-9]+` to get the identifier, then:
```
retrieve_work_item_by_identifier(project_identifier="PROJ", issue_identifier=42)
```

Use this automatically at the start of any "update the ticket", "mark done", or "add a comment" request when no ticket is specified — check the branch first.

---

## Board Snapshot

Render a live kanban view across all projects:

1. `list_projects()` → get all project IDs
2. For each project: `list_work_items(project_id)` + `list_states(project_id)`
3. Group items by state group, render as:

```
PROJECT NAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Backlog (3)    Todo (2)    In Progress (1)    Done (8)
 • PROJ-1 ...   • PROJ-5    • PROJ-7 ★          • PROJ-2
 • PROJ-3 ...   • PROJ-6    (assigned)          • PROJ-4
 • PROJ-9 ...                                   ...
```

Mark items assigned to you with ★. Flag items In Progress with no recent activity (check `updated_at`).

---

## Git Log → Batch Sync

When Plane is behind after a coding session — scan git and auto-sync:

```bash
git log --oneline -30
```

Parse each commit message for ticket references (`[A-Z]+-[0-9]+`). For each unique ticket found:
1. `retrieve_work_item_by_identifier(...)` — get current state
2. If state is not Done: move to Done, add comment with the commit SHA/message
3. Report what was synced

Invoke automatically when user says "sync plane", "I've been coding", or "catch plane up".

---

## Standup Generator

Generate a standup from Plane activity:

```
Done yesterday/today:
- PROJ-12: Implemented JWT refresh logic (commit abc123)
- PROJ-13: Fixed pagination bug

In Progress:
- PROJ-14: Auth middleware (started 2 days ago)

Blocked:
- PROJ-15: Waiting on API design decision

Up Next:
- PROJ-16: Rate limiting
- PROJ-17: Error handling middleware
```

Steps:
1. `list_work_items(project_id)` — get all items
2. Filter by state group: `completed` (Done), `started` (In Progress)
3. Check `updated_at` for recently completed items (last 24h)
4. Scan for any comments mentioning "blocked" or `list_work_item_activities` for blockers
5. List Todo items ordered by priority as "Up Next"

---

## Dependency Chains

When ingesting a spec, detect sequential tasks and create `blocked_by` relations:

Look for signals in the task list:
- "after X", "once X is done", "requires X", "depends on" → explicit dependency
- Sequential numbered lists where order matters (e.g. "1. Setup DB → 2. Create schema → 3. Write migrations")
- Phase structure (Phase 1 tasks block Phase 2 tasks)

```
create_work_item_relation(project_id, work_item_id=task_b,
                          relation_type="blocked_by", issues=[task_a])
```

Only create dependencies when they're clearly sequential — don't over-connect parallel tasks.

---

## Auto-Label

Create and apply labels to keep the board filterable:

**Standard label set** (create once per project, reuse):
| Label | Color | When to apply |
|-------|-------|---------------|
| `frontend` | `#6366f1` | UI, components, styles |
| `backend` | `#10b981` | API, DB, services |
| `infra` | `#f59e0b` | CI/CD, deployment, config |
| `tests` | `#3b82f6` | Test-only tasks |
| `docs` | `#8b5cf6` | Documentation |
| `bug` | `#ef4444` | Bug fixes |
| `dx` | `#ec4899` | Developer experience |

Steps:
1. `list_labels(project_id)` — check what exists
2. `create_label(project_id, name, color)` — create missing ones
3. Infer labels from task content (keywords: "test", "deploy", "fix", "doc", "UI", "API", etc.)
4. `update_work_item(labels=[...])` — apply

---

## Idea → Spec → Tickets (Zero-to-Board)

Given a rough idea or brief description, go from nothing to a full Plane board in one shot:

1. **Generate the spec inline** — write requirements, acceptance criteria, and task breakdown based on the idea
2. **Confirm with user** — show the spec summary and task count before creating anything
3. **Ingest** — follow the standard spec ingestion flow (parent ticket + child tasks)
4. **Set up labels** — auto-create labels for the project
5. **Create branch** — `git checkout -b feature/PROJ-N-slug`

Trigger: "build me a...", "I want to add...", "let's spec out...", "create a board for..."

---

## Ticket Health Check

Spot problems on the board:

- **Stale In Progress** — items in `started` state with `updated_at` > 3 days ago → flag for review
- **Orphaned tasks** — child tickets whose parent is Done but they aren't
- **No description** — tickets with empty description (can't be worked without a spec)
- **Unlinked PRs** — tickets in Done with no links (missing PR reference)

Run: `list_work_items(project_id, expand="state")` then audit each item's metadata.
Report as a bulleted health summary. Offer to fix each issue.

---

## Quick Commands Summary

| Phrase | Superpower invoked |
|--------|-------------------|
| "what ticket am I on?" | Branch → Ticket Lookup |
| "show the board" / "board snapshot" | Board Snapshot |
| "sync plane" / "catch plane up" | Git Log → Batch Sync |
| "standup" / "what did I do today?" | Standup Generator |
| "build me a..." / "spec this out" | Idea → Spec → Tickets |
| "health check" / "any stale tickets?" | Ticket Health Check |
| "add labels" / "label the project" | Auto-Label |
