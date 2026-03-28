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

# Allow read-only and review-related commands through
case "$COMMAND" in
  "git status"*|"git diff"*|"git log"*|"git show"*|"git rev-parse"*) exit 0 ;;
  "npm test"*|"npm run test"*|"npx vitest"*|"npx tsc"*|"npm run typecheck"*|"npm run lint"*) exit 0 ;;
  "ls "*|"cat "*|"head "*|"tail "*|"pwd"|"echo "*|"wc "*|"find "*) exit 0 ;;
  "git commit"*) exit 0 ;;
  "git add"*) exit 0 ;;
  "git push"*) exit 0 ;;
  "git checkout"*|"git switch"*|"git branch"*|"git merge"*|"git rebase"*|"git fetch"*|"git pull"*) exit 0 ;;
  "gh "*) exit 0 ;;
  "mkdir "*) exit 0 ;;
  "chmod "*) exit 0 ;;
  "cp "*) exit 0 ;;
  "rm "*) exit 0 ;;
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

  # Validate review signatures: spec and quality files must contain "review-signed: <sha>"
  spec_signed=false
  quality_signed=false
  if [ -f "$spec_file" ]; then
    signed_sha=$(grep -m1 '^review-signed:' "$spec_file" 2>/dev/null | awk '{print $2}' || true)
    [ "$signed_sha" = "$sha" ] && spec_signed=true
  fi
  if [ -f "$quality_file" ]; then
    signed_sha=$(grep -m1 '^review-signed:' "$quality_file" 2>/dev/null | awk '{print $2}' || true)
    [ "$signed_sha" = "$sha" ] && quality_signed=true
  fi

  if [ "$spec_signed" = "true" ] && [ "$quality_signed" = "true" ] && [ -f "$simplifier_file" ]; then
    # All three review artifacts present and signed — clear pending
    rm -f "$pending_file"
  else
    STILL_PENDING=$((STILL_PENDING + 1))
    MISSING=""
    if [ "$spec_signed" = "false" ]; then
      [ ! -f "$spec_file" ] && MISSING="spec review" || MISSING="spec review (missing review-signed: ${sha} header)"
    fi
    if [ "$quality_signed" = "false" ]; then
      if [ ! -f "$quality_file" ]; then
        MISSING="${MISSING:+$MISSING + }quality review"
      else
        MISSING="${MISSING:+$MISSING + }quality review (missing review-signed: ${sha} header)"
      fi
    fi
    [ ! -f "$simplifier_file" ] && MISSING="${MISSING:+$MISSING + }simplifier"
    PENDING_LIST="${PENDING_LIST}  - ${sha}: needs ${MISSING}\n"
  fi
done

if [ "$STILL_PENDING" -gt 0 ]; then
  cat <<BLOCK
REVIEW ENFORCER: ${STILL_PENDING} commit(s) awaiting review before new work can begin.

Pending reviews:
$(printf "$PENDING_LIST")

Required actions:
1. Dispatch spec compliance reviewer for each pending commit
   → Reviewer writes findings to .reviews/completed/<sha>-spec.md
   → File MUST start with: review-signed: <sha>
2. Dispatch code quality reviewer (after spec passes)
   → Reviewer writes findings to .reviews/completed/<sha>-quality.md
   → File MUST start with: review-signed: <sha>
3. Run code-simplifier on changed files
   → Write output to .reviews/completed/<sha>-simplifier.md
4. Fix any Critical/Important issues found

This blocker clears automatically when both review files exist AND contain
a valid "review-signed: <sha>" header matching the commit being reviewed.
BLOCK
  exit 2
fi

exit 0
