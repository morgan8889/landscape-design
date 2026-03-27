#!/usr/bin/env bash
# ============================================================================
# on-stop.sh — Stop Event Handler: Completion Verifier + Notification
# ============================================================================
# Fires after each Claude response completes. Checks whether there are
# incomplete tasks (via TodoWrite task files) and returns a block decision
# if work remains. Also sends desktop notification.
#
# Returns JSON with "decision": "block" if tasks remain incomplete,
# prompting Claude to continue working rather than stopping.
# ============================================================================
set -euo pipefail

# Guard against recursive invocation
if [ "${CLAUDE_STOP_HOOK_ACTIVE:-}" = "1" ]; then
  exit 0
fi
export CLAUDE_STOP_HOOK_ACTIVE=1

# Read stop reason from stdin
INPUT=$(cat)
STOP_REASON=$(printf '%s\n' "$INPUT" | jq -r '.stop_reason // "end_turn"' 2>/dev/null || echo "end_turn")

# Check for active session signal file
# Claude's autonomous loop should create this file when starting work
# and remove it when all tasks are complete or when intentionally stopping
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
REPO_HASH=$(printf '%s' "$REPO_ROOT" | md5 -q 2>/dev/null || printf '%s' "$REPO_ROOT" | md5sum | cut -d' ' -f1)
SESSION_FILE="/tmp/claude-session-active-${REPO_HASH}"

if [ -f "$SESSION_FILE" ]; then
  TASK_CONTEXT=$(cat "$SESSION_FILE" 2>/dev/null || true)

  # Session is active but Claude is stopping — nudge to continue
  echo '{"decision": "block", "reason": "Autonomous session still active. Tasks remain incomplete. Continue working through the task list, or write DONE to '"$SESSION_FILE"' if finished."}'

  # Still send notification so user knows there was a pause
  if command -v osascript &>/dev/null; then
    osascript -e 'display notification "Session active but Claude paused. Check progress." with title "Claude Code" sound name "Ping"' 2>/dev/null || true
  elif command -v notify-send &>/dev/null; then
    notify-send "Claude Code" "Session active but Claude paused. Check progress." 2>/dev/null || true
  fi
  exit 0
fi

# No active session — normal stop, just notify
if command -v osascript &>/dev/null; then
  osascript -e 'display notification "Response complete. Waiting for input." with title "Claude Code" sound name "Hero"' 2>/dev/null || true
elif command -v notify-send &>/dev/null; then
  notify-send "Claude Code" "Response complete. Waiting for input." 2>/dev/null || true
fi

exit 0
