#!/usr/bin/env bash
# ============================================================================
# session-start.sh — PostToolUse: Auto-Arm Session Signal File
# ============================================================================
# Fires after every Edit/Write/MultiEdit tool call. Creates the session signal
# file on first file write so on-stop.sh can block premature exit.
#
# The session file is cleared by review-gate.sh when the PR gate passes,
# or manually when intentionally stopping mid-session.
# ============================================================================
set -euo pipefail

INPUT=$(cat)
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# Only arm session for edits to files inside this repo — not ~/.claude/ or other paths
FILE_PATH=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null || true)
if [ -z "$FILE_PATH" ] || [[ "$FILE_PATH" != "$REPO_ROOT"* ]]; then
  exit 0
fi

REPO_HASH=$(printf '%s' "$REPO_ROOT" | md5 -q 2>/dev/null || printf '%s' "$REPO_ROOT" | md5sum | cut -d' ' -f1)
SESSION_FILE="/tmp/claude-session-active-${REPO_HASH}"

# Skip if session was intentionally disarmed (on-stop or review-gate removed it)
DISARM_FILE="/tmp/claude-session-disarmed-${REPO_HASH}"
if [ -f "$DISARM_FILE" ]; then
  exit 0
fi

# Only create if it doesn't exist — don't overwrite original task context
if [ ! -f "$SESSION_FILE" ]; then
  # Detect phase from file path: spec/plan files = interactive, src files = implementation
  PHASE="implementation"
  case "$FILE_PATH" in
    */specs/*|*/plans/*|*/brainstorm/*|*.md)
      PHASE="interactive"
      ;;
    */src/*|*/tests/*|*.ts|*.tsx|*.js|*.jsx|*.css)
      PHASE="implementation"
      ;;
  esac
  printf 'phase: %s\ntask: first file write (%s)\nstarted: %s\n' "$PHASE" "$FILE_PATH" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$SESSION_FILE"
fi

exit 0
