#!/usr/bin/env bash
# ============================================================================
# ui-edit-reminder.sh — PostToolUse: Remind to Verify After UI File Edits
# ============================================================================
# Fires after Edit/Write/MultiEdit on UI files. Injects context reminding
# Claude to take a screenshot before committing.
# ============================================================================
set -euo pipefail

INPUT=$(cat)

# Extract file path from tool input
FILE=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)

# Also check MultiEdit paths
if [ -z "$FILE" ]; then
  FILE=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.edits[0]?.file_path // empty' 2>/dev/null || true)
fi

[ -z "$FILE" ] && exit 0

case "$FILE" in
  *.css|*/components/*|*/style*|*/app/*|index.html|*/public/*)
    echo '{"additionalContext": "UI file modified. Before committing: (1) open in real browser via superpowers-chrome, (2) check correct tab with list_tabs, (3) take screenshot to .reviews/screenshots/, (4) if screenshot is dark/blank that IS the bug — investigate. The commit gate will block without screenshot evidence."}'
    ;;
esac

exit 0
