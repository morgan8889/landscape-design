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

# Branch discipline: warn if feat: commit lands on a non-main branch
CURRENT_BRANCH=$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || true)
if echo "$COMMAND" | grep -qE 'feat:' && [ -n "$CURRENT_BRANCH" ] && [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
  BRANCH_WARNING="WARNING: New feature commit on branch '${CURRENT_BRANCH}'. If this is a separate feature from the branch scope, create a dedicated branch. New feature = new branch keeps PRs focused."
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

  REVIEW_MSG="REVIEW REQUIRED: Commit ${COMMIT_SHA} queued for review. The review-enforcer hook will BLOCK your next implementation action until reviews are complete. Dispatch these three agents IN PARALLEL (all have background: true): (1) Agent tool with subagent_type=spec-reviewer, (2) Agent tool with subagent_type=code-quality-reviewer, (3) Agent tool with subagent_type=code-simplifier-reviewer. Each agent reads .reviews/pending/, reviews the diff, and writes a signed artifact to .reviews/completed/. Do NOT write review files manually — the agents handle it."
  if [ -n "${BRANCH_WARNING:-}" ]; then
    REVIEW_MSG="${REVIEW_MSG} ${BRANCH_WARNING}"
  fi
  echo "{\"additionalContext\": \"${REVIEW_MSG}\"}"
fi

exit 0
