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

# Only create if it doesn't exist — don't overwrite original task context
if [ ! -f "$SESSION_FILE" ]; then
  printf 'Auto-started: first file write in session (%s)\n' "$FILE_PATH" > "$SESSION_FILE"
fi

exit 0
