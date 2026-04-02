# Superpowers Hooks — Detailed Reference

## Superpowers Workflow → Plane Action Map

```
Superpowers Step                          Plane Action
─────────────────────────────────────────────────────────────────
brainstorming → writes design doc    →   create_work_item (parent, Todo→In Progress)
writing-plans → writes plan doc      →   create_work_item x N (children, Todo)
                                         create_work_item_relation (blocked_by if sequential)
subagent task complete               →   update_work_item (Done) + comment with commit
all tasks complete                   →   prompt: move parent to In Review?
finishing-a-development-branch PR    →   create_work_item_link (PR URL) + parent → In Review
merge to main                        →   parent → Done
```

---

## File Paths to Watch

| Superpowers artifact | Path pattern |
|---|---|
| Design doc (brainstorming) | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` |
| Implementation plan (writing-plans) | `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md` |
| Plan location override | User may set a custom path — check for it |

---

## Plan File Format (writing-plans output)

The plan file structure to parse for Hook 2:

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: ...

**Goal:** One sentence.
**Architecture:** 2-3 sentences.
**Tech Stack:** ...

---

### Task 1: Component Name

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**
  ...
- [ ] **Step 2: Run test to verify it fails**
  ...
- [ ] **Step 3: Write minimal implementation**
  ...
- [ ] **Step 4: Run test to verify it passes**
  ...
- [ ] **Step 5: Commit**
  ...

### Task 2: Another Component
  ...
```

**Parsing rules:**
- Split on `### Task N:` headings — each heading = one Plane child ticket
- Include all content of the task block (files, steps) in the ticket description
- The `- [ ]` steps within a task are Superpowers TDD micro-steps — do NOT create individual Plane tickets for them
- Task N count = number of `### Task` headings in the plan

---

## Design Doc Format (brainstorming output)

```markdown
# [Feature Name] Design

**Date:** YYYY-MM-DD
**Goal:** One sentence.

## Overview
...

## Approach
...

## Acceptance Criteria
- [ ] criterion
- [ ] criterion

## Architecture
...

## Trade-offs considered
...
```

**Parsing for parent ticket:**
- Title: `# [Feature Name] Design` → strip " Design" suffix
- Description: full document as `description_html`
- Priority: look for `critical|blocker|P0` → urgent; `important|P1` → high; default → medium
- State: Todo (unstarted group UUID)

---

## Subagent Completion Detection

`subagent-driven-development` marks tasks done using TodoWrite. The signal that a task is complete:

1. The plan file gets `- [x]` checkboxes checked for all steps in a Task block
2. OR: the subagent-driven-development skill announces "Task N complete" / "marking task complete"

When detected, look up the child ticket by matching task name/number against what was created in Hook 2.

---

## Edge Cases

### Multiple projects in workspace
If `list_projects()` returns multiple projects, infer the correct one from:
1. Current git repo name matching a project name/identifier
2. Most recent project (last active)
3. Ask user if ambiguous

### Plan written before parent ticket exists
If `writing-plans` fires but no parent ticket was created (brainstorming was skipped), create the parent ticket from the plan's header (Goal + Architecture fields) first.

### Superpowers skips brainstorming
If writing-plans runs without a prior design doc, synthesize the parent ticket from the plan header:
- Name: plan filename slug, humanised
- Description: Goal + Architecture from plan header

### Task names conflict
If two tasks have the same name (unlikely but possible), append ` (N)` suffix.

### No project exists yet
Create it first:
```
create_project(name=<inferred from repo>, identifier=<3-5 char caps acronym>)
list_states(project_id)  # capture UUIDs → update references/projects.md
```

### Plane API failure during implementation
Log the failure in a local `.plane-sync-pending.json` file at the project root:
```json
{
  "pending": [
    {"action": "mark_done", "ticket": "PROJ-42", "commit": "abc123", "timestamp": "..."}
  ]
}
```
Catch up on next "sync plane" invocation.

---

## Commit Message Format

Superpowers TDD commits happen at Step 5 of each task block:
```bash
git commit -m "feat: add specific feature"
```

The plane-dev skill should encourage prefixing with the ticket identifier when Plane is active:
```bash
git commit -m "PROJ-42: feat: add specific feature"
```

This makes `git log → batch sync` reliable since ticket refs are parseable.
