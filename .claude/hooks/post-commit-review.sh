#!/usr/bin/env bash
# ============================================================================
# post-commit-review.sh — PostToolUse: Queue Implementation Commits for Review
# ============================================================================
# After a successful git commit with feat:/fix:/refactor: prefix, creates a
# pending review marker in .reviews/pending/<sha>.pending. The review-enforcer
# hook will then block new implementation work until reviews are completed.
# ============================================================================
set -euo pipefail

INPUT=$(cat)
COMMAND=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)

# Only fire after git commit
[[ "$COMMAND" != *"git commit"* ]] && exit 0

# Only for implementation commits (not review fixes, docs, chores, tests)
if ! echo "$COMMAND" | grep -qE '(feat:|fix:|refactor:)'; then
  exit 0
fi

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# Skip infra-only commits (hooks, CI, config changes don't need code review)
CHANGED_FILES=$(git -C "$REPO_ROOT" diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null || true)
INFRA_ONLY=true
while IFS= read -r file; do
  case "$file" in
    .claude/*|.github/*|biome.json|package.json|package-lock.json|*.config.*|.gitignore|.nvmrc|.env.example|CLAUDE.md|.specify/*) ;;
    *) INFRA_ONLY=false; break ;;
  esac
done <<< "$CHANGED_FILES"

if [ "$INFRA_ONLY" = "true" ]; then
  exit 0
fi
PENDING_DIR="${REPO_ROOT}/.reviews/pending"
COMPLETED_DIR="${REPO_ROOT}/.reviews/completed"
mkdir -p "$PENDING_DIR" "$COMPLETED_DIR"

# Belt-and-suspenders: ensure session lock is active for any implementation commit
REPO_HASH=$(printf '%s' "$REPO_ROOT" | md5 -q 2>/dev/null || printf '%s' "$REPO_ROOT" | md5sum | cut -d' ' -f1)
SESSION_FILE="/tmp/claude-session-active-${REPO_HASH}"
if [ ! -f "$SESSION_FILE" ]; then
  printf 'Auto-started: implementation commit (post-commit-review.sh)\n' > "$SESSION_FILE"
fi

# Get the SHA of the commit that just happened
COMMIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null | head -c 12)

if [ -n "$COMMIT_SHA" ]; then
  # Record commit as pending review
  git -C "$REPO_ROOT" log -1 --format="%H %s" > "${PENDING_DIR}/${COMMIT_SHA}.pending"

  echo "{\"additionalContext\": \"REVIEW REQUIRED: Commit ${COMMIT_SHA} queued for review. The review-enforcer hook will BLOCK your next implementation action until reviews are complete. Each review file MUST begin with 'review-signed: ${COMMIT_SHA}' on its own line — the enforcer validates this signature and will reject files without it. Dispatch: (1) spec compliance reviewer → .reviews/completed/${COMMIT_SHA}-spec.md (first line: 'review-signed: ${COMMIT_SHA}'), (2) code quality reviewer → .reviews/completed/${COMMIT_SHA}-quality.md (first line: 'review-signed: ${COMMIT_SHA}'), (3) code-simplifier → .reviews/completed/${COMMIT_SHA}-simplifier.md\"}"
fi

exit 0
