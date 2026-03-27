#!/usr/bin/env bash
# ============================================================================
# post-edit-format.sh — Auto-format After Every Edit
# ============================================================================
# Runs after Edit/Write/MultiEdit. Auto-formats the changed file(s) and
# invalidates any existing pre-commit pass (forcing re-verification).
# ============================================================================
set -euo pipefail

INPUT=$(cat)

# Extract file paths — handle both single-file (Edit/Write) and MultiEdit
# Use printf to avoid echo interpreting backslash sequences in JSON
MULTI=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.edits[]?.file_path // empty' 2>/dev/null || true)
if [[ -z "$MULTI" ]]; then
  MULTI=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)
fi

# Skip if no files extracted
[[ -z "$MULTI" ]] && exit 0

# Invalidate pre-commit pass (edits require re-verification)
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
rm -f "/tmp/agent-pre-commit-pass-$(printf '%s' "$REPO_ROOT" | md5 -q 2>/dev/null || printf '%s' "$REPO_ROOT" | md5sum | cut -d' ' -f1)"

# Collect existing files that Biome supports into an array
FILES=()
while IFS= read -r f; do
  if [[ -n "$f" && -f "$f" ]]; then
    case "$f" in
      *.ts|*.tsx|*.js|*.jsx|*.json|*.jsonc|*.css)
        FILES+=("$f")
        ;;
    esac
  fi
done <<< "$MULTI"

# Skip if no formattable files
[[ ${#FILES[@]} -eq 0 ]] && exit 0

# Auto-format with Biome (if configured)
if command -v npx &>/dev/null; then
  if [[ -f "biome.json" || -f "biome.jsonc" ]]; then
    npx biome check --write "${FILES[@]}" 2>/dev/null || true
  fi
fi

echo '{"additionalContext": "Auto-formatted. Pre-commit pass invalidated -- tests must pass again before commit."}'
exit 0
