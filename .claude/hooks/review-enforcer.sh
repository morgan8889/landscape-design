#!/usr/bin/env bash
# ============================================================================
# review-enforcer.sh — PreToolUse: Block Implementation Until Reviews Complete
# ============================================================================
# After an implementation commit (feat:/fix:/refactor:), the post-commit-review
# hook creates a pending marker in .reviews/pending/. This hook blocks any NEW
# implementation work until review artifacts exist in .reviews/completed/.
#
# Allowed through: read-only commands, test runs, git operations, review dispatches.
# Blocked: any other Bash command while reviews are pending.
# ============================================================================
set -euo pipefail

INPUT=$(cat)
COMMAND=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)

[[ -z "$COMMAND" ]] && exit 0

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
PENDING_DIR="${REPO_ROOT}/.reviews/pending"

# No pending reviews → allow everything
[ ! -d "$PENDING_DIR" ] && exit 0
PENDING_COUNT=$(find "$PENDING_DIR" -name "*.pending" 2>/dev/null | wc -l | tr -d ' ')
[ "$PENDING_COUNT" -eq 0 ] && exit 0

# Allow ONLY read-only and review-essential commands through
case "$COMMAND" in
  # Read-only git inspection
  "git status"*|"git diff"*|"git log"*|"git show"*|"git rev-parse"*|"git fetch"*|"git branch"*) exit 0 ;;
  # Test/lint (needed to verify review fixes)
  "npm test"*|"npm run test"*|"npx vitest"*|"npx tsc"*|"npm run typecheck"*|"npm run lint"*|"npx biome"*) exit 0 ;;
  # Read-only file inspection
  "ls "*|"cat "*|"head "*|"tail "*|"pwd"|"echo "*|"wc "*|"find "*|"grep "*|"jq "*|"diff "*) exit 0 ;;
  # Git staging and committing (post-commit-review only flags feat/fix/refactor — chore: passes clean)
  "git add"*|"git commit"*) exit 0 ;;
  # Review infrastructure + diagnostics
  "mkdir -p"*|"chmod "*|"date"*|"ps "*|"stat "*) exit 0 ;;
esac

# Check if pending reviews have been resolved
COMPLETED_DIR="${REPO_ROOT}/.reviews/completed"
STILL_PENDING=0
PENDING_LIST=""

for pending_file in "$PENDING_DIR"/*.pending; do
  [ ! -f "$pending_file" ] && continue
  sha=$(basename "$pending_file" .pending)

  spec_file="${COMPLETED_DIR}/${sha}-spec.md"
  quality_file="${COMPLETED_DIR}/${sha}-quality.md"
  simplifier_file="${COMPLETED_DIR}/${sha}-simplifier.md"

  # Validate review signatures: files must contain "review-signed: <sha>" AND correct "reviewer-agent:"
  spec_signed=false
  quality_signed=false
  if [ -f "$spec_file" ]; then
    signed_sha=$(grep -m1 '^review-signed:' "$spec_file" 2>/dev/null | awk '{print $2}' || true)
    reviewer=$(grep -m1 '^reviewer-agent:' "$spec_file" 2>/dev/null | awk '{print $2}' || true)
    [ "$signed_sha" = "$sha" ] && [ "$reviewer" = "spec-compliance" ] && spec_signed=true
  fi
  if [ -f "$quality_file" ]; then
    signed_sha=$(grep -m1 '^review-signed:' "$quality_file" 2>/dev/null | awk '{print $2}' || true)
    reviewer=$(grep -m1 '^reviewer-agent:' "$quality_file" 2>/dev/null | awk '{print $2}' || true)
    [ "$signed_sha" = "$sha" ] && [ "$reviewer" = "code-quality" ] && quality_signed=true
  fi
  simplifier_signed=false
  if [ -f "$simplifier_file" ]; then
    signed_sha=$(grep -m1 '^review-signed:' "$simplifier_file" 2>/dev/null | awk '{print $2}' || true)
    reviewer=$(grep -m1 '^reviewer-agent:' "$simplifier_file" 2>/dev/null | awk '{print $2}' || true)
    [ "$signed_sha" = "$sha" ] && [ "$reviewer" = "code-simplifier" ] && simplifier_signed=true
  fi

  # Check if commit touched UI files — require screenshot evidence
  ui_needs_screenshot=false
  ui_files=$(git diff-tree --no-commit-id --name-only -r "$sha" 2>/dev/null | grep -E '(\.css|\.scss|components/|src/app/|src/main\.ts|public/)' || true)
  if [ -n "$ui_files" ]; then
    screenshots_dir="${REPO_ROOT}/.reviews/screenshots"
    max_age="${SCREENSHOT_MAX_AGE_MINS:-120}"
    recent_screenshot=""
    if [ -d "$screenshots_dir" ]; then
      recent_screenshot=$(find "$screenshots_dir" -name '*.png' -mmin -"$max_age" 2>/dev/null | head -1 || true)
    fi
    [ -z "$recent_screenshot" ] && ui_needs_screenshot=true
  fi

  if [ "$spec_signed" = "true" ] && [ "$quality_signed" = "true" ] && [ "$simplifier_signed" = "true" ] && [ "$ui_needs_screenshot" = "false" ]; then
    # All review artifacts present, signed, and screenshot requirements met — clear pending
    rm -f "$pending_file"
  else
    STILL_PENDING=$((STILL_PENDING + 1))
    MISSING=""
    if [ "$spec_signed" = "false" ]; then
      [ ! -f "$spec_file" ] && MISSING="spec review" || MISSING="spec review (invalid signature or reviewer-agent)"
    fi
    if [ "$quality_signed" = "false" ]; then
      if [ ! -f "$quality_file" ]; then
        MISSING="${MISSING:+$MISSING + }quality review"
      else
        MISSING="${MISSING:+$MISSING + }quality review (invalid signature or reviewer-agent)"
      fi
    fi
    if [ "$simplifier_signed" = "false" ]; then
      if [ ! -f "$simplifier_file" ]; then
        MISSING="${MISSING:+$MISSING + }simplifier"
      else
        MISSING="${MISSING:+$MISSING + }simplifier (invalid signature or reviewer-agent)"
      fi
    fi
    if [ "$ui_needs_screenshot" = "true" ]; then
      MISSING="${MISSING:+$MISSING + }browser screenshot (UI files changed, none in .reviews/screenshots/)"
    fi
    PENDING_LIST="${PENDING_LIST}  - ${sha}: needs ${MISSING}\n"
  fi
done

if [ "$STILL_PENDING" -gt 0 ]; then
  cat <<BLOCK
REVIEW ENFORCER: ${STILL_PENDING} commit(s) awaiting review before new work can begin.

Pending reviews:
$(printf "$PENDING_LIST")

Required actions — dispatch these agents IN PARALLEL (all have background: true):
1. Agent tool with subagent_type=spec-reviewer
2. Agent tool with subagent_type=code-quality-reviewer
3. Agent tool with subagent_type=code-simplifier-reviewer

Each agent reads .reviews/pending/, reviews the commit diff, and writes a signed
artifact to .reviews/completed/. Do NOT write review files manually.
After all three complete, fix any Critical/Important issues found.

4. For commits with UI changes: take a browser screenshot using superpowers-chrome
   and save to .reviews/screenshots/ BEFORE reviews can clear.

This blocker clears automatically when review files exist with valid
"review-signed: <sha>" and "reviewer-agent:" headers, plus screenshots for UI commits.
BLOCK
  exit 2
fi

exit 0
