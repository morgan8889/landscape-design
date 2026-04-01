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
  "mkdir -p"*|"chmod "*|"date"*|"ps "*|"stat "*|"lsof "*) exit 0 ;;
  # Session cleanup (prevent stop-hook deadlocks)
  "rm -f /tmp/claude-session"*|"rm -f /tmp/claude-circuit"*) exit 0 ;;
  # Dev server management (needed for browser verification during review)
  "npx vite"*|"curl -sf"*|"lsof -i"*|"sleep "*|"pkill -f vite"*) exit 0 ;;
  # GitHub CLI (needed to check PR status, push during review)
  "gh "*|"git push"*) exit 0 ;;
esac

# Check if pending reviews have been resolved
COMPLETED_DIR="${REPO_ROOT}/.reviews/completed"
STILL_PENDING=0
PENDING_LIST=""

for pending_file in "$PENDING_DIR"/*.pending; do
  [ ! -f "$pending_file" ] && continue
  sha=$(basename "$pending_file" .pending)

  # Auto-clear stale pending reviews (>2h) — review agent may have crashed
  FILE_AGE_SECS=$(( $(date +%s) - $(stat -f %m "$pending_file" 2>/dev/null || stat -c %Y "$pending_file" 2>/dev/null || echo 0) ))
  if [ "$FILE_AGE_SECS" -gt $((2 * 3600)) ]; then
    echo "WARNING: Stale pending review for ${sha} ($(( FILE_AGE_SECS / 60 ))m old). Auto-clearing — review agent may have crashed. Re-dispatch if needed."
    rm -f "$pending_file"
    continue
  fi

  spec_file="${COMPLETED_DIR}/${sha}-spec.md"
  quality_file="${COMPLETED_DIR}/${sha}-quality.md"
  simplifier_file="${COMPLETED_DIR}/${sha}-simplifier.md"

  # Validate review signatures: files must contain "review-signed: <sha>" AND a reviewer field.
  # Accept both "reviewer-agent:" (preferred) and "reviewer:" (fallback) since subagents
  # don't always emit the exact header name the hook originally required.
  _get_reviewer() {
    local file="$1"
    local val
    val=$(grep -m1 '^reviewer-agent:' "$file" 2>/dev/null | awk '{print $2}' || true)
    if [ -z "$val" ]; then
      val=$(grep -m1 '^reviewer:' "$file" 2>/dev/null | awk '{print $2}' || true)
    fi
    echo "$val"
  }

  spec_signed=false
  quality_signed=false
  if [ -f "$spec_file" ]; then
    signed_sha=$(grep -m1 '^review-signed:' "$spec_file" 2>/dev/null | awk '{print $2}' || true)
    reviewer=$(_get_reviewer "$spec_file")
    [ "$signed_sha" = "$sha" ] && [ "$reviewer" = "spec-compliance" ] && spec_signed=true
  fi
  if [ -f "$quality_file" ]; then
    signed_sha=$(grep -m1 '^review-signed:' "$quality_file" 2>/dev/null | awk '{print $2}' || true)
    reviewer=$(_get_reviewer "$quality_file")
    [ "$signed_sha" = "$sha" ] && [ "$reviewer" = "code-quality" ] && quality_signed=true
  fi
  simplifier_signed=false
  if [ -f "$simplifier_file" ]; then
    signed_sha=$(grep -m1 '^review-signed:' "$simplifier_file" 2>/dev/null | awk '{print $2}' || true)
    reviewer=$(_get_reviewer "$simplifier_file")
    [ "$signed_sha" = "$sha" ] && [ "$reviewer" = "code-simplifier" ] && simplifier_signed=true
  fi

  # Screenshot evidence is checked at PR time (review-gate.sh), not per-commit.
  # Per-commit screenshot gates caused deadlocks and excessive browser verification overhead.

  if [ "$spec_signed" = "true" ] && [ "$quality_signed" = "true" ] && [ "$simplifier_signed" = "true" ]; then
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

This blocker clears automatically when review files exist with valid
"review-signed: <sha>" and "reviewer-agent:" (or "reviewer:") headers.
BLOCK
  exit 2
fi

exit 0
