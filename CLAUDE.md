# Landscape Design — Claude Code Guidelines

## Project Identity

- **What**: Browser-based landscape design app for homeowners
- **Constitution**: `.specify/memory/constitution.md` (v1.0.0, ratified 2026-03-25)
- **Speckit commands**: `.claude/commands/speckit.*.md` drive the spec → plan → implement cycle
- **Tech stack**: Deferred to first feature plan. These guidelines are framework-agnostic.

## Autonomous Development Loop

Run this loop without human input. Only stop to ask for help when stuck (3+ failed attempts), or at PR creation.

### Phase -1: PREFLIGHT (Before Starting Any Work)

Before touching code, run through this checklist:

1. **Enumerate blockers**: What could prevent completion? Missing dependencies, unclear requirements, files that don't exist yet?
2. **Identify destructive operations**: Will this work require deletes, migrations, or force operations? List them explicitly.
3. **Confirm permissions**: Will any operation require human approval? Check for `git push`, `rm`, `npm install` that might prompt. If so, plan around them or flag upfront.
4. **Signal session start**: Create `/tmp/claude-session-active-<repo-hash>` with a summary of what you're working on. This tells the Stop hook not to let you quit mid-task.
5. **Verify dev environment**: Is the dev server running (if needed)? Are dependencies installed? Is the test suite passing on the current branch?

If any blocker is unresolvable, stop and ask the user before proceeding.

### Phase 0: ORIENT

- Read the spec, plan, and tasks for the current feature
- Identify the next task (respect dependency order in tasks.md)
- Check prerequisites — are earlier tasks complete?
- Read all files that will be touched (never edit blind)
- Mark task as `in_progress` via TodoWrite

### Phase 1: RED (Write Failing Test)

- Create test file if it doesn't exist
- Write test(s) that describe the expected behavior for this task
- Run the test suite — confirm NEW tests FAIL (red)
- If tests pass already → investigate (test is wrong or feature exists)
- Commit the failing test: `test: add failing test for [feature]`

### Phase 2: GREEN (Make It Pass)

- Write the minimum implementation to make tests pass
- Run the full test suite after each meaningful change
- If tests fail unexpectedly:
  - Read the error output carefully
  - Diagnose root cause (don't guess-and-retry)
  - Fix and re-run
- Once all tests pass → move to refactor
- Do NOT add features beyond what the test requires

### Phase 3: REFACTOR

- Review the implementation for clarity, duplication, naming
- Refactor only if there's a clear improvement
- Run tests after every refactor change — must stay green
- Keep refactoring minimal — YAGNI applies

### Phase 4: VERIFY (Screenshot Evidence Required for UI Changes)

- Run full test suite (unit + integration)
- Run type check (if TypeScript)
- Run linter
- If UI was changed (hook-enforced — `verify-before-commit.sh` blocks without screenshots):
  - Use **superpowers-chrome** (real browser with WebGL), not headless Playwright
  - Run `list_tabs` first — verify you're on the correct tab
  - Use `eval` to check computed styles (`offsetHeight`, `getComputedStyle`) — DOM existence alone is NOT verification
  - Take screenshot — **if dark/blank, that IS the bug** — investigate immediately, never explain away
  - Save screenshot to `.reviews/screenshots/` (the commit gate checks for this)
  - For WebGL content: wait for render completion, check canvas dimensions match container
  - For Playwright regression: mask dynamic content (maps, timestamps)
  - Never declare "verified" unless the screenshot visually confirms correct rendering
- All checks green? → Phase 5

**Browser Verification Tools:**

| Tool | Use For | Captures WebGL? |
|------|---------|----------------|
| superpowers-chrome | Novel feature verification, interactive testing | Yes (real browser) |
| Playwright MCP | Headless checks, accessibility snapshots | No WebGL |
| Playwright test runner | Automated regression (toHaveScreenshot) | No WebGL |

### Phase 5: REVIEW (Per-Task, Hook-Enforced)

After implementation, dispatch review subagents. This phase is enforced by hooks:
- `post-commit-review.sh` automatically queues every `feat:/fix:/refactor:` commit for review
- `review-enforcer.sh` BLOCKS the next implementation task if pending reviews exist
- Review artifacts must be written by the review subagents to `.reviews/completed/`

Steps:

1. **Spec compliance review**: Dispatch a spec-reviewer subagent (or `pr-review-toolkit:code-reviewer`). Verify the implementation matches the task requirements — nothing missing, nothing extra. The reviewer MUST write findings to `.reviews/completed/<commit-sha>-spec.md`.
2. **Code quality review**: Only after spec passes. Dispatch `superpowers:code-reviewer` agent. The reviewer MUST write findings to `.reviews/completed/<commit-sha>-quality.md`.
3. **Code simplifier**: Run `code-simplifier` on changed files. Write output to `.reviews/completed/<commit-sha>-simplifier.md`.
4. **Fix loop**: If reviewers find Critical or Important issues, fix them and re-review. Only proceed when all review files contain approval.

Do NOT create review files manually — they must be created by the review subagents.

### Phase 6: COMMIT

- Stage only files relevant to this task
- Write clear commit message (what + why)
- Commit triggers pre-commit hook (tests, types, lint, E2E)
- If hook fails → fix the issue, create NEW commit (never amend)
- Mark task as completed via TodoWrite
- Return to Phase 0 for next task

### Phase 7: PR (After All Tasks Complete, Hook-Enforced)

The `review-gate.sh` hook BLOCKS `gh pr create` unless all review artifacts exist.

- Run full test suite one final time
- Browser verify all UI pages end-to-end
- Run `superpowers:verification-before-completion` → writes `.reviews/verification-pass.md`
- Dispatch `code-review:code-review` on the full branch diff → writes `.reviews/completed/final-review.md`
- Run `code-simplifier` on all changed files → writes `.reviews/completed/final-simplifier.md`
- Run `superpowers:finishing-a-development-branch` for structured completion
- Create PR with:
  - Summary (what was built and why)
  - Test plan (how to verify)
  - Screenshots (if UI changes)
  - Constitution compliance notes
- Remove the session signal file (`/tmp/claude-session-active-<repo-hash>`) to allow clean stop
- Notify user — this is the first human touchpoint

## Error Recovery

- **Stuck for 3+ attempts on same issue**: Stop, explain the blocker, ask for help
- **Unexpected test failures in unrelated code**: Investigate before proceeding, don't ignore
- **Browser verification fails**: Fix the UI, don't skip verification
- **Pre-commit hook fails**: Read the error, fix root cause, new commit (never `--no-verify`)

## Parallelism Rules

### When to use parallel agents

- Tasks marked with `[P]` in tasks.md — dispatch via worktree isolation
- Independent modules with no shared state (separate components, separate endpoints)
- Research/exploration spanning multiple codebase areas
- Code review + browser verification can run in parallel after implementation

### When to stay sequential

- Tasks with dependencies (B needs A's output)
- Database migrations or schema changes
- Tests that share state or fixtures
- Any task modifying shared configuration files

### How to parallelize

- Use `Agent` tool with `isolation: "worktree"` for independent implementation
- Each parallel agent gets its own git worktree — no merge conflicts during work
- After parallel work completes, merge worktrees back sequentially
- Run integration tests after each merge to catch interaction bugs
- Use `subagent_type` agents (Explore, Plan) for parallel research without worktrees

### Decision tree

```
Are tasks independent (no shared files/state)?
├── Yes → Can they be defined by clear boundaries?
│   ├── Yes → Dispatch parallel agents with worktree isolation
│   └── No → Run sequentially to avoid conflicts
└── No → Run sequentially, respect dependency order
```

### Limits

- Max 3 parallel implementation agents at a time
- 1 agent responsible for integration/merge after parallel work
- Never parallelize destructive operations (migrations, deletes)

## TDD Rules (Non-Negotiable)

Matches constitution principle III:

- Red-Green-Refactor cycle is mandatory for every feature and bugfix
- Write the test first, confirm it fails, then implement
- Never skip the "red" step — if the test passes immediately, investigate
- Test file must exist before implementation file
- User acceptance scenarios from the spec must map to automated tests

## Browser Verification Protocol

- After any UI-affecting change, use Playwright MCP to verify
- Navigate to the affected page(s) in the running dev server
- Take screenshots and visually confirm rendering matches the spec/intent
- If something looks wrong, fix it before moving on
- This is NOT optional for UI changes — it is part of Phase 4

## Self-Review Protocol

Before each commit:

- Review own diff thoroughly (every changed line)
- Check for: bugs, security issues, missed edge cases, code quality, constitution compliance
- Use the code-review agent/plugin for a structured second opinion
- Fix all issues before committing — never commit known problems
- Review scope: only changes related to the current task should be in the diff

## Constitution Compliance

All work must comply with `.specify/memory/constitution.md`:

1. **User-Centric Design**: Features validated against real homeowner needs
2. **Data Accuracy**: Plant data referenced, spatial math validated, no silent coercion
3. **Test-First**: Red-Green-Refactor mandatory
4. **Incremental Delivery**: Each feature delivers standalone value with P1 MVP slice
5. **Simplicity**: Simplest solution wins, YAGNI enforced

Quality gates must pass before PR: Spec, Plan, Test, Data, Simplicity.

## Permission & Safety Rules

- Never force push, never skip hooks, never amend published commits
- Ask before destructive operations (delete, reset, drop)
- Follow existing patterns in the codebase
- Never commit secrets, .env files, or credentials
- Small, atomic commits — one logical change per commit
