#!/usr/bin/env bash
# ============================================================================
# audit-log.sh — PostToolUse: Append Every Tool Call to Session Audit Log
# ============================================================================
# Creates a JSONL audit trail of all tool calls for post-session review.
# Log location: ~/.claude/audit/YYYY-MM-DD-<repo-hash>.jsonl
# ============================================================================
set -euo pipefail

INPUT=$(cat)

# Extract tool info
TOOL_NAME=$(printf '%s\n' "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null || echo "unknown")
TOOL_INPUT=$(printf '%s\n' "$INPUT" | jq -c '.tool_input // {}' 2>/dev/null || echo '{}')

# Create a summary of the input (truncate large inputs)
INPUT_SUMMARY=$(printf '%s\n' "$TOOL_INPUT" | head -c 500)

# Session context (for correlation with transcripts)
SESSION_ID=$(printf '%s\n' "$INPUT" | jq -r '.session_id // ""' 2>/dev/null || true)
TRANSCRIPT=$(printf '%s\n' "$INPUT" | jq -r '.transcript_path // ""' 2>/dev/null || true)

# Error info (present on PostToolUseFailure events)
ERROR=$(printf '%s\n' "$INPUT" | jq -r '.error // ""' 2>/dev/null || true)

# Timestamp
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE=$(date +"%Y-%m-%d")

# Repo context
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
REPO_HASH=$(printf '%s' "$REPO_ROOT" | md5 -q 2>/dev/null || printf '%s' "$REPO_ROOT" | md5sum | cut -d' ' -f1)
REPO_NAME=$(basename "$REPO_ROOT")

# Ensure audit directory exists
AUDIT_DIR="$HOME/.claude/audit"
mkdir -p "$AUDIT_DIR"

# Log file per day per repo
LOG_FILE="${AUDIT_DIR}/${DATE}-${REPO_NAME}-${REPO_HASH:0:8}.jsonl"

# Append log entry (use jq for safe JSON construction)
if command -v jq &>/dev/null; then
  ARGS=(--arg ts "$TS" --arg tool "$TOOL_NAME" --arg repo "$REPO_NAME" --arg input "$INPUT_SUMMARY")
  TEMPLATE='{ts: $ts, tool: $tool, repo: $repo, input: $input}'
  [ -n "$SESSION_ID" ] && ARGS+=(--arg sid "$SESSION_ID") && TEMPLATE='{ts: $ts, tool: $tool, repo: $repo, input: $input, session_id: $sid}'
  [ -n "$ERROR" ] && ARGS+=(--arg err "$ERROR") && TEMPLATE="${TEMPLATE%\}}, error: \$err}"
  jq -n -c "${ARGS[@]}" "$TEMPLATE" >> "$LOG_FILE"
else
  # Fallback without jq (best-effort)
  printf '{"ts":"%s","tool":"%s","repo":"%s"}\n' "$TS" "$TOOL_NAME" "$REPO_NAME" >> "$LOG_FILE"
fi

exit 0
