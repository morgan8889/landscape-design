#!/usr/bin/env bash
# ============================================================================
# verify-before-commit.sh — Commit Gate Hook
# ============================================================================
# Blocks `git commit` unless ALL checks pass.
# Creates a test-and-fix loop: commit blocked -> error fed to Claude -> fix -> retry
#
# Quick Path: Auto-detects staged files. If no UI files are staged, browser
# tests (E2E + visual regression) are skipped for faster commits.
# Override: FULL_TESTS=1 git commit -m "..." forces all checks.
#
# This is the ONLY reliable enforcement layer. CLAUDE.md is advisory.
# Superpowers skills are advisory. This hook is DETERMINISTIC.
# ============================================================================
set -euo pipefail

# Read the tool input from stdin
INPUT=$(cat)
COMMAND=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)

# Only intercept git commit commands
if [[ "$COMMAND" != *"git commit"* ]]; then
  exit 0
fi

# Project-unique pass file to avoid cross-session collisions
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
PASS_FILE="/tmp/agent-pre-commit-pass-$(printf '%s' "$REPO_ROOT" | md5 -q 2>/dev/null || printf '%s' "$REPO_ROOT" | md5sum | cut -d' ' -f1)"
rm -f "$PASS_FILE"

# -- UI Change Detection --
# Returns 0 if UI files detected (full suite), 1 if no UI files (quick path).
# Populates UI_FILES_DETECTED with matching filenames for display.
UI_FILES_DETECTED=""

detect_ui_changes() {
  # Force full suite if env var is set
  if [ "${FULL_TESTS:-0}" = "1" ]; then
    return 0
  fi

  local staged_files
  staged_files=$(git diff --cached --name-only 2>/dev/null || true)

  # No staged files -> quick path
  if [ -z "$staged_files" ]; then
    return 1
  fi

  local found_ui=false

  while IFS= read -r file; do
    case "$file" in
      src/components/*)
        found_ui=true
        UI_FILES_DETECTED="${UI_FILES_DETECTED}    ${file}"$'\n'
        ;;
      src/app/*)
        # Only match page.tsx and layout.tsx, NOT route.ts (API routes)
        case "$file" in
          */page.tsx|*/layout.tsx)
            found_ui=true
            UI_FILES_DETECTED="${UI_FILES_DETECTED}    ${file}"$'\n'
            ;;
        esac
        ;;
      *.css|*.scss)
        found_ui=true
        UI_FILES_DETECTED="${UI_FILES_DETECTED}    ${file}"$'\n'
        ;;
      tailwind.config.*|next.config.*)
        found_ui=true
        UI_FILES_DETECTED="${UI_FILES_DETECTED}    ${file}"$'\n'
        ;;
      public/*)
        found_ui=true
        UI_FILES_DETECTED="${UI_FILES_DETECTED}    ${file}"$'\n'
        ;;
      screenshots/*)
        found_ui=true
        UI_FILES_DETECTED="${UI_FILES_DETECTED}    ${file}"$'\n'
        ;;
      tests/e2e/*|tests/visual/*)
        found_ui=true
        UI_FILES_DETECTED="${UI_FILES_DETECTED}    ${file}"$'\n'
        ;;
      playwright.config.*)
        found_ui=true
        UI_FILES_DETECTED="${UI_FILES_DETECTED}    ${file}"$'\n'
        ;;
    esac
  done <<< "$staged_files"

  if [ "$found_ui" = "true" ]; then
    return 0
  else
    return 1
  fi
}

# Determine test path
SKIP_BROWSER_TESTS=false
if detect_ui_changes; then
  SKIP_BROWSER_TESTS=false
else
  SKIP_BROWSER_TESTS=true
fi

echo "Commit gate: Running verification checks..."

# Path feedback
if [ "${FULL_TESTS:-0}" = "1" ]; then
  echo "  FULL_TESTS=1 set -- running all checks including browser tests"
elif [ "$SKIP_BROWSER_TESTS" = "true" ]; then
  echo "  No UI files staged -- skipping browser tests"
else
  echo "  UI files detected -- browser tests will run:"
  printf '%s' "$UI_FILES_DETECTED"
fi
echo ""

# Temp log for subprocess output (keeps hook stdout clean for Claude Code runner)
_LOG="/tmp/agent-commit-gate-$$.log"

# -- Unit Tests --
if [ -f "package.json" ] && grep -q '"test"' package.json 2>/dev/null; then
  echo "  > Running unit tests..."
  if ! npm test > "$_LOG" 2>&1; then
    echo ""
    echo "BLOCKED: Unit tests failed. Fix failing tests before committing."
    echo "  Output: $(tail -5 "$_LOG")"
    rm -f "$_LOG"
    exit 2
  fi
  echo "  Unit tests passed"
fi

# -- TypeScript Type Check --
if [ -f "tsconfig.json" ]; then
  echo "  > Running type check..."
  if npm run typecheck > "$_LOG" 2>&1; then
    echo "  Type check passed"
  else
    echo ""
    echo "BLOCKED: TypeScript errors found. Fix type errors before committing."
    echo "  Output: $(tail -5 "$_LOG")"
    rm -f "$_LOG"
    exit 2
  fi
fi

# -- Linting --
if [ -f "biome.json" ] || [ -f "biome.jsonc" ]; then
  echo "  > Running Biome lint..."
  if ! npx biome check ./src > "$_LOG" 2>&1; then
    echo ""
    echo "BLOCKED: Lint errors found. Run 'npx biome check --write ./src' to fix."
    echo "  Output: $(tail -5 "$_LOG")"
    rm -f "$_LOG"
    exit 2
  fi
  echo "  Lint passed"
elif [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ] || [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ]; then
  echo "  > Running ESLint..."
  if ! npm run lint 2>&1; then
    echo ""
    echo "BLOCKED: Lint errors found. Fix lint issues before committing."
    exit 2
  fi
  echo "  Lint passed"
fi

# -- E2E Tests (skip visual — run separately below) --
# Guard: only run Playwright if a playwright config exists (avoids false triggers
# in Python/non-JS projects that happen to have a tests/e2e/ directory).
_HAS_PLAYWRIGHT_CONFIG=false
for _cfg in playwright.config.ts playwright.config.js playwright.config.mjs playwright.config.cjs; do
  if [ -f "$_cfg" ]; then _HAS_PLAYWRIGHT_CONFIG=true; break; fi
done

if [ "$SKIP_BROWSER_TESTS" = "false" ] && [ "$_HAS_PLAYWRIGHT_CONFIG" = "true" ]; then
  if [ -d "tests/e2e" ] || [ -d "e2e" ] || [ -d "test/e2e" ]; then
    echo "  > Running E2E tests (excluding visual)..."
    if ! npx playwright test --grep-invert @visual > "$_LOG" 2>&1; then
      echo ""
      echo "BLOCKED: E2E tests failed. Fix browser tests before committing."
      echo "  Output: $(tail -10 "$_LOG")"
      rm -f "$_LOG"
      exit 2
    fi
    echo "  E2E tests passed"
  fi
else
  if [ "$_HAS_PLAYWRIGHT_CONFIG" = "false" ]; then
    echo "  E2E tests skipped (no playwright.config found — not a browser test project)"
  else
    echo "  E2E tests skipped (no UI changes)"
  fi
fi

# -- Visual Regression (if baselines exist) --
if [ "$SKIP_BROWSER_TESTS" = "false" ] && [ "$_HAS_PLAYWRIGHT_CONFIG" = "true" ]; then
  if [ -d "screenshots/baseline" ] && [ "$(ls -A screenshots/baseline 2>/dev/null)" ]; then
    echo "  > Running visual regression tests..."
    if ! npx playwright test --grep @visual > "$_LOG" 2>&1; then
      echo ""
      echo "BLOCKED: Visual regression detected. Screenshots don't match baselines."
      echo "  Review screenshots in test-results/ and update baselines if intentional:"
      echo "  npx playwright test --grep @visual --update-snapshots"
      echo "  Output: $(tail -10 "$_LOG")"
      rm -f "$_LOG"
      exit 2
    fi
    echo "  Visual regression passed"
  fi
else
  echo "  Visual regression skipped (no UI changes)"
fi

# -- All checks passed --
rm -f "$_LOG"
touch "$PASS_FILE"
echo ""
echo "All verification checks passed. Commit proceeding."
exit 0
