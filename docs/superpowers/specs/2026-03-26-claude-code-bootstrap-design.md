# Claude Code Bootstrap — Autonomous Governance Design

**Date**: 2026-03-26
**Status**: Draft
**Goal**: Configure Claude Code for fully autonomous, self-governing development with minimal human input until PR creation.

## Approach

**CLAUDE.md-Heavy**: Comprehensive `CLAUDE.md` as the governance brain. Existing global hooks enforce hard gates (tests, types, lint). Project-level settings add targeted permission overrides. GitHub Actions provide CI as a second-opinion layer.

## Files to Create

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Comprehensive autonomous workflow instructions |
| `.claude/settings.json` | Project-level permissions for max autonomy |
| `.gitignore` | Protect secrets, cache, and build artifacts |
| `.github/workflows/claude-review.yml` | PR review + comment-triggered fixes (`anthropics/claude-code-action@v1`) |
| `.github/workflows/ci.yml` | Test/lint/type-check on push |

---

## 1. CLAUDE.md — Autonomous Workflow Brain

### 1.1 Project Identity

- Project: Landscape design app for homeowners
- Constitution: `.specify/memory/constitution.md` (v1.0.0)
- Tech stack: Deferred to first feature plan; CLAUDE.md provides framework-agnostic rules
- Speckit commands: `.claude/commands/speckit.*.md` drive the spec → plan → implement cycle

### 1.2 Autonomous Development Loop

The following loop runs without human input. Claude only stops to ask for help when stuck, or at PR creation.

```
Phase 0: ORIENT
├── Read the spec, plan, and tasks for the current feature
├── Identify which task to work on next (respect dependency order in tasks.md)
├── Check if task has prerequisites — are earlier tasks complete?
├── Read all files that will be touched (never edit blind)
└── Mark task as in_progress via TodoWrite

Phase 1: RED (Write Failing Test)
├── Create test file if it doesn't exist
├── Write test(s) that describe the expected behavior for this task
├── Run the test suite — confirm NEW tests FAIL (red)
├── If tests pass already → the test is wrong or the feature exists
│   └── Investigate before proceeding
└── Commit the failing test: "test: add failing test for [feature]"

Phase 2: GREEN (Make It Pass)
├── Write the minimum implementation to make tests pass
├── Run the full test suite after each meaningful change
├── If tests fail unexpectedly:
│   ├── Read the error output carefully
│   ├── Diagnose root cause (don't guess-and-retry)
│   └── Fix and re-run
├── Once all tests pass → move to refactor
└── Do NOT add features beyond what the test requires

Phase 3: REFACTOR
├── Review the implementation for clarity, duplication, naming
├── Refactor only if there's a clear improvement
├── Run tests after every refactor change — must stay green
└── Keep refactoring minimal — YAGNI applies

Phase 4: VERIFY
├── Run full test suite (unit + integration)
├── Run type check (if TypeScript)
├── Run linter
├── If UI was changed:
│   ├── Start dev server if not running
│   ├── Use Playwright to navigate to affected page(s)
│   ├── Take screenshot(s)
│   ├── Visually verify rendering matches intent
│   ├── If broken → fix and re-run from Phase 2
│   └── If acceptable → proceed
└── All checks green? → Phase 5

Phase 5: SELF-REVIEW
├── Run git diff to see all staged/unstaged changes
├── Review every changed file as if reviewing someone else's PR:
│   ├── Logic errors or bugs?
│   ├── Security vulnerabilities (OWASP top 10)?
│   ├── Missing edge cases the tests don't cover?
│   ├── Code quality — naming, structure, readability?
│   ├── Constitution compliance — data accuracy, simplicity?
│   └── Unnecessary changes outside task scope?
├── If issues found → fix and re-run from Phase 2
├── Use code-review agent for structured second opinion
└── Only proceed to commit when review passes

Phase 6: COMMIT
├── Stage only files relevant to this task
├── Write clear commit message (what + why)
├── Commit triggers pre-commit hook (tests, types, lint, E2E)
├── If hook fails → fix the issue, create NEW commit (never amend)
├── Mark task as completed via TodoWrite
└── Return to Phase 0 for next task

Phase 7: PR (After All Tasks Complete)
├── Run full test suite one final time
├── Browser verify all UI pages end-to-end
├── Self-review the full branch diff against the spec
├── Use code-review agent on the full diff
├── Create PR with:
│   ├── Summary (what was built and why)
│   ├── Test plan (how to verify)
│   ├── Screenshots (if UI changes)
│   └── Constitution compliance notes
└── Notify user (this is the first human touchpoint)
```

### 1.3 Error Recovery

- **Stuck for 3+ attempts on same issue** → Stop, explain the blocker, ask for help
- **Unexpected test failures in unrelated code** → Investigate before proceeding, don't ignore
- **Browser verification fails** → Fix the UI, don't skip verification
- **Pre-commit hook fails** → Read the error, fix root cause, new commit

### 1.4 Parallelism Rules

**When to use parallel agents:**
- Tasks marked with `[P]` in tasks.md can run concurrently via worktree isolation
- Independent modules with no shared state (e.g., separate components, separate API endpoints)
- Research/exploration that spans multiple areas of the codebase
- Code review + browser verification can run in parallel after implementation

**When to stay sequential:**
- Tasks with dependencies (task B needs task A's output)
- Database migrations or schema changes (must be ordered)
- Tests that share state or fixtures
- Any task that modifies shared configuration files

**How to parallelize:**
- Use `Agent` tool with `isolation: "worktree"` for independent implementation tasks
- Each parallel agent gets its own git worktree — no merge conflicts during work
- After parallel work completes, merge worktrees back sequentially
- Run integration tests after each merge to catch interaction bugs
- Use `subagent_type` agents (Explore, Plan) for parallel research without worktrees

**Decision tree:**
```
Are tasks independent (no shared files/state)?
├── Yes → Can they be defined by clear boundaries?
│   ├── Yes → Dispatch parallel agents with worktree isolation
│   └── No → Run sequentially to avoid conflicts
└── No → Run sequentially, respect dependency order
```

**Limits:**
- Max 3 parallel implementation agents at a time
- Always have 1 agent responsible for integration/merge after parallel work
- Never parallelize destructive operations (migrations, deletes)

### 1.5 TDD Rules (Non-Negotiable)

Matches constitution principle III:
- Red-Green-Refactor cycle is mandatory for every feature and bugfix
- Write the test first, confirm it fails, then implement
- Never skip the "red" step — if the test passes immediately, investigate
- Test file must exist before implementation file
- User acceptance scenarios from the spec must map to automated tests

### 1.6 Browser Verification Protocol

- After any UI-affecting change, use Playwright MCP to verify
- Navigate to the affected page(s) in the running dev server
- Take screenshots and visually confirm rendering matches the spec/intent
- If something looks wrong, fix it before moving on
- This is NOT optional for UI changes — it is part of Phase 4

### 1.7 Self-Review Protocol

Before each commit, Claude must:
- Review its own diff thoroughly (every changed line)
- Check for: bugs, security issues, missed edge cases, code quality, constitution compliance
- Use the code-review agent/plugin for a structured second opinion
- Fix all issues before committing — never commit known problems
- Review scope: only changes related to the current task should be in the diff

### 1.8 Constitution Compliance

All work must comply with the project constitution (`.specify/memory/constitution.md`):
- **User-Centric Design**: Features validated against real homeowner needs
- **Data Accuracy**: Plant data referenced, spatial math validated, no silent coercion
- **Test-First**: Red-Green-Refactor mandatory
- **Incremental Delivery**: Each feature delivers standalone value with P1 MVP slice
- **Simplicity**: Simplest solution wins, YAGNI enforced

Quality gates (Spec, Plan, Test, Data, Simplicity) must pass before PR.

### 1.9 Permission & Safety Rules

- Never force push, never skip hooks, never amend published commits
- Ask before destructive operations (delete, reset, drop)
- Follow existing patterns in the codebase
- Never commit secrets, .env files, or credentials
- Small, atomic commits — one logical change per commit

---

## 2. Project Settings (`.claude/settings.json`)

Project-level overrides for maximum autonomy:

```json
{
  "permissions": {
    "allow": [
      "npx playwright",
      "npm run test",
      "npm run build",
      "npm run dev",
      "npm run lint",
      "npm run format",
      "npx tsc --noEmit",
      "npx biome"
    ]
  }
}
```

These commands run frequently during the autonomous loop and should never prompt. All other permissions inherit from global settings (which already allow git operations, file operations, etc. and deny secrets/force-push).

---

## 2.5 `.gitignore`

The project has no `.gitignore`. Create one with:

```
# Dependencies
node_modules/

# Environment & secrets
.env
.env.local
.env.*.local

# Build output
dist/
build/
.next/
out/

# Claude Code ephemeral files
.claude/cache/
.claude/data/
.claude/tasks/
.claude/plans/

# OS files
.DS_Store
Thumbs.db

# Test coverage
coverage/

# Playwright
test-results/
playwright-report/
```

---

## 3. GitHub Actions CI

### 3.1 `claude-review.yml` — PR Review + Comment-Triggered Fixes

Uses `anthropics/claude-code-action@v1` (GA since 2025-08-26).

**Required secrets:** `ANTHROPIC_API_KEY` (from console.anthropic.com)

**Exact workflow:**

```yaml
name: Claude Code Review + Fixes

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  pull_request_review:
    types: [submitted]

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  claude:
    # Only run on @claude mentions (not every comment)
    if: |
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review' && contains(github.event.review.body, '@claude'))
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          trigger_phrase: "@claude"
          claude_args: |
            --max-turns 10
            --model claude-sonnet-4-6
            --append-system-prompt "Follow CLAUDE.md guidelines. All fixes must pass tests before pushing."
```

**Behavior:**
- Comment `@claude fix this` or `@claude review for security issues` on a PR
- Claude reads the comment, analyzes the code, makes fixes, and pushes commits
- Inline review comments with `@claude` trigger targeted fixes on that specific code
- By the time this runs, local hooks should have already caught test/lint/type issues
- CI review is a **second opinion** on code quality, not the first line of defense

### 3.2 `ci.yml` — Test/Lint/Type-Check on Push

Standard CI pipeline. Skeleton structure — exact commands will be filled in when tech stack is chosen:

```yaml
name: CI

on:
  push:
    branches: ['*', '!main']  # Feature branches only
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'

      - run: npm ci

      # Exact lint/type/test commands TBD when stack is chosen
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      # E2E runs only on PRs to main (expensive)
      - run: npm run test:e2e
        if: github.event_name == 'pull_request'
```

**Key principle:** This should almost never fail if the local autonomous loop worked correctly. If CI catches something local didn't, that's a signal to improve the local hooks/CLAUDE.md.

---

## 4. What This Does NOT Cover

- **Tech stack selection** — Deferred to first feature spec. CLAUDE.md is framework-agnostic.
- **Application code** — This bootstrap creates zero application code.
- **Feature specifications** — Use the Speckit workflow after bootstrap.
- **Database or infrastructure** — Deferred to when needed.

## 5. Success Criteria

- [ ] `CLAUDE.md` exists at project root with full autonomous workflow
- [ ] `.claude/settings.json` exists with project-level permission overrides
- [ ] `.gitignore` exists protecting secrets, cache, and build artifacts
- [ ] `.github/workflows/claude-review.yml` exists with `anthropics/claude-code-action@v1`
- [ ] `.github/workflows/ci.yml` exists with test/lint/type-check pipeline (skeleton, stack TBD)
- [ ] First commit contains all bootstrap files
- [ ] Claude can run the autonomous loop end-to-end on the next feature without human intervention until PR

## 6. Verified Against Official Docs

- **Hooks**: 9 types available (PreToolUse, PostToolUse, UserPromptSubmit, Stop, SubagentStop, SessionStart, SessionEnd, PreCompact, Notification). Current global config uses 4 (PreToolUse, PostToolUse, Notification, Stop). No additional project-level hooks needed — CLAUDE.md handles workflow guidance, global hooks handle enforcement.
- **GitHub Action**: `anthropics/claude-code-action@v1` (GA 2025-08-26). Supports `trigger_phrase`, `claude_args`, comment-triggered fixes natively. YAML verified against official docs.
- **Settings schema**: `https://json.schemastore.org/claude-code-settings.json`. Project settings merge with (not replace) global settings.
- **Existing global hooks**: Pre-commit (tests/types/lint/E2E), post-edit (Biome formatting), notification, on-stop. All well-configured with appropriate timeouts.
