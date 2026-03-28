#!/usr/bin/env bash
# ============================================================================
# review-gate.sh — PreToolUse: Block PR Creation Without Complete Reviews
# ============================================================================
# Blocks `gh pr create` unless ALL conditions are met:
# 1. No pending (unreviewed) implementation commits
# 2. Final branch code review artifact exists
# 3. Final code-simplifier pass artifact exists
# 4. Verification-before-completion artifact exists
# ============================================================================
set -euo pipefail

INPUT=$(cat)
COMMAND=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)

[[ "$COMMAND" != *"gh pr create"* ]] && exit 0

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
REVIEWS_DIR="${REPO_ROOT}/.reviews"
PENDING_DIR="${REVIEWS_DIR}/pending"
COMPLETED_DIR="${REVIEWS_DIR}/completed"

ERRORS=""

# Check for any pending reviews
if [ -d "$PENDING_DIR" ]; then
  PENDING_COUNT=$(find "$PENDING_DIR" -name "*.pending" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$PENDING_COUNT" -gt 0 ]; then
    ERRORS="${ERRORS}\n- ${PENDING_COUNT} commit(s) still pending per-task review"
  fi
fi

# Check for final review artifacts
if [ ! -f "${COMPLETED_DIR}/final-review.md" ]; then
  ERRORS="${ERRORS}\n- Missing final branch code review (.reviews/completed/final-review.md)"
fi

if [ ! -f "${COMPLETED_DIR}/final-simplifier.md" ]; then
  ERRORS="${ERRORS}\n- Missing final code-simplifier pass (.reviews/completed/final-simplifier.md)"
fi

if [ ! -f "${REVIEWS_DIR}/verification-pass.md" ]; then
  ERRORS="${ERRORS}\n- Missing verification-before-completion (.reviews/verification-pass.md)"
fi

# Check for screenshot artifacts when UI files changed
UI_FILES_IN_BRANCH=$(git diff --name-only main...HEAD 2>/dev/null | grep -E '(\.css|components/|src/app/|public/|src/style|src/main\.ts)' || true)
if [ -n "$UI_FILES_IN_BRANCH" ] && [ ! -d "${REVIEWS_DIR}/screenshots" ]; then
  ERRORS="${ERRORS}\n- UI files changed but no browser verification screenshots (.reviews/screenshots/)"
fi

if [ -n "$ERRORS" ]; then
  cat <<BLOCK
BLOCKED: PR creation requires completed reviews.

Missing:
$(printf "$ERRORS")

Required steps before creating PR:
1. Complete all per-task reviews (spec + quality for each impl commit)
2. Run superpowers:verification-before-completion → .reviews/verification-pass.md
3. Dispatch code-review on full branch diff → .reviews/completed/final-review.md
4. Run code-simplifier on all changed files → .reviews/completed/final-simplifier.md
5. Run superpowers:finishing-a-development-branch

Dispatch review subagents to create these artifacts.
BLOCK
  exit 2
fi

# All gate conditions met — remove session lock so on-stop.sh allows clean exit after PR creation
REPO_HASH=$(printf '%s' "$REPO_ROOT" | md5 -q 2>/dev/null || printf '%s' "$REPO_ROOT" | md5sum | cut -d' ' -f1)
SESSION_FILE="/tmp/claude-session-active-${REPO_HASH}"
rm -f "$SESSION_FILE"

exit 0
