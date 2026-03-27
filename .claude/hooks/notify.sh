#!/usr/bin/env bash
# ============================================================================
# notify.sh — Desktop Notification When Claude Needs Attention
# ============================================================================
set -euo pipefail

# Read notification message from stdin JSON per Claude Code docs
INPUT=$(cat)
MESSAGE=$(printf '%s\n' "$INPUT" | jq -r '.message // empty' 2>/dev/null || true)
MESSAGE="${MESSAGE:-Claude Code needs your attention}"

# macOS
if command -v osascript &>/dev/null; then
  osascript -e "display notification \"$MESSAGE\" with title \"Claude Code\" sound name \"Glass\"" 2>/dev/null || true
# Linux
elif command -v notify-send &>/dev/null; then
  notify-send "Claude Code" "$MESSAGE" 2>/dev/null || true
fi

exit 0
