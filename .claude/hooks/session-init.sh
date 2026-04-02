#!/usr/bin/env bash
# ============================================================================
# session-init.sh — SessionStart: Restore Task Context on Session Start
# ============================================================================
# Fires when a Claude Code session starts (startup, resume, clear, compact).
# Reads the current spec/tasks to inject task context, so Claude doesn't lose
# its place after a crash, context compaction, or manual restart.
#
# Also checks for pending reviews that need to be dispatched.
# ============================================================================
set -euo pipefail

INPUT=$(cat)
SOURCE=$(printf '%s' "$INPUT" | jq -r '.source // "startup"' 2>/dev/null || echo "startup")

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# Clear disarm sentinel from previous session so fresh sessions can arm normally
REPO_HASH=$(printf '%s' "$REPO_ROOT" | md5 -q 2>/dev/null || printf '%s' "$REPO_ROOT" | md5sum | cut -d' ' -f1)
rm -f "/tmp/claude-session-disarmed-${REPO_HASH}"

# Find the most recent spec directory with a tasks.md
CURRENT_SPEC=""
for spec_dir in "$REPO_ROOT"/.specify/specs/[0-9]* ; do
  [ -d "$spec_dir" ] && [ -f "$spec_dir/tasks.md" ] && CURRENT_SPEC="$spec_dir"
done

CONTEXT_PARTS=""

# Check for in-progress or pending tasks
if [ -n "$CURRENT_SPEC" ]; then
  TASK=$(grep -m1 -E '\[[ x]\].*in_progress|\[ \]' "$CURRENT_SPEC/tasks.md" 2>/dev/null || true)
  if [ -n "$TASK" ]; then
    SPEC_NAME=$(basename "$CURRENT_SPEC")
    CONTEXT_PARTS="Current spec: ${SPEC_NAME}. Next task: ${TASK}."
  fi
fi

# Check for pending reviews
PENDING_DIR="${REPO_ROOT}/.reviews/pending"
if [ -d "$PENDING_DIR" ]; then
  PENDING=$(find "$PENDING_DIR" -name "*.pending" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$PENDING" -gt 0 ]; then
    CONTEXT_PARTS="${CONTEXT_PARTS:+$CONTEXT_PARTS }${PENDING} pending review(s) — dispatch spec-reviewer, code-quality-reviewer, code-simplifier-reviewer agents before continuing implementation."
  fi
fi

# Detect Plane ticket from branch name (requires PLANE_ENABLED=1)
if [ "${PLANE_ENABLED:-}" = "1" ]; then
  CURRENT_BRANCH=$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || true)
  PLANE_TICKET=$(echo "$CURRENT_BRANCH" | grep -oE '[A-Z]+-[0-9]+' | head -1 || true)
  if [ -n "$PLANE_TICKET" ]; then
    PROJ_ID=$(echo "$PLANE_TICKET" | grep -oE '^[A-Z]+')
    ISSUE_NUM=$(echo "$PLANE_TICKET" | grep -oE '[0-9]+$')
    CONTEXT_PARTS="${CONTEXT_PARTS:+$CONTEXT_PARTS }Plane ticket ${PLANE_TICKET} detected from branch. If Plane MCP is available, run retrieve_work_item_by_identifier(project_identifier=\"${PROJ_ID}\", issue_identifier=${ISSUE_NUM}) to load current ticket state."
  fi
fi

# Output context if we found anything useful
if [ -n "$CONTEXT_PARTS" ]; then
  # Escape for JSON
  CONTEXT_PARTS=$(printf '%s' "$CONTEXT_PARTS" | sed 's/"/\\"/g' | tr '\n' ' ')
  echo "{\"additionalContext\": \"Session ${SOURCE}. ${CONTEXT_PARTS} Resume the autonomous development loop from CLAUDE.md Phase 0.\"}"
fi

exit 0
