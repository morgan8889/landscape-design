#!/usr/bin/env bash
# ============================================================================
# circuit-breaker.sh — PreToolUse: Detect and Break Infinite Retry Loops
# ============================================================================
# Logs every Bash command to a session file. If the same command (or same
# test failure pattern) appears 3+ times in a row, blocks execution and
# tells Claude to stop and ask for help.
#
# Session log: /tmp/claude-circuit-<repo-hash>.log
# Reset: delete the log file or start a new session
# ============================================================================
set -euo pipefail

INPUT=$(cat)
COMMAND=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)

# Only track Bash commands
[[ -z "$COMMAND" ]] && exit 0

# Skip trivial read-only commands (don't pollute the log)
case "$COMMAND" in
  "git status"*|"git diff"*|"git log"*|"git show"*|"git rev-parse"*|"git branch"*)
    exit 0
    ;;
  "git push"*|"git pull"*|"git fetch"*|"git checkout"*|"git switch"*|"git merge"*|"git add"*|"git commit"*)
    exit 0
    ;;
  "ls "*|"cat "*|"pwd"|"echo "*|"which "*|"type "*|"head "*|"tail "*|"wc "*|"find "*)
    exit 0
    ;;
  "rm "*|"mkdir "*|"cp "*|"chmod "*|"mv "*)
    exit 0
    ;;
  "gh "*|"npm run lint"*|"npm run typecheck"*|"npm run format"*)
    exit 0
    ;;
esac

# Session log keyed to repo
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
REPO_HASH=$(printf '%s' "$REPO_ROOT" | md5 -q 2>/dev/null || printf '%s' "$REPO_ROOT" | md5sum | cut -d' ' -f1)
LOG_FILE="/tmp/claude-circuit-${REPO_HASH}.log"

# Prune entries older than 2 hours to prevent cross-session false positives
CUTOFF=$(( $(date +%s) - 7200 ))
if [ -f "$LOG_FILE" ]; then
  PRUNED=$(awk -F'|' -v cutoff="$CUTOFF" '$1 >= cutoff' "$LOG_FILE" 2>/dev/null || true)
  printf '%s' "$PRUNED" > "$LOG_FILE"
fi

# Normalize command for comparison (strip whitespace variations)
NORMALIZED=$(printf '%s' "$COMMAND" | tr -s '[:space:]' ' ' | sed 's/^ //;s/ $//')

# Append to log with unix timestamp prefix: <epoch>|<command>
printf '%s|%s\n' "$(date +%s)" "$NORMALIZED" >> "$LOG_FILE"

# Check for repetition: same command appearing in last N entries
THRESHOLD=3
if [ -f "$LOG_FILE" ]; then
  # Count consecutive identical commands at the tail of the log
  # Strip timestamp prefix (<epoch>|) before comparing
  CONSECUTIVE=0
  while IFS= read -r line; do
    CMD_PART="${line#*|}"
    if [ "$CMD_PART" = "$NORMALIZED" ]; then
      CONSECUTIVE=$((CONSECUTIVE + 1))
    else
      CONSECUTIVE=0
    fi
  done < "$LOG_FILE"

  if [ "$CONSECUTIVE" -ge "$THRESHOLD" ]; then
    # Output block decision
    cat <<BLOCK
CIRCUIT BREAKER TRIPPED: The command below has been attempted $CONSECUTIVE times consecutively:

  $COMMAND

This indicates a retry loop. STOP and take a different approach:
1. Read the error output from the last attempt carefully
2. Identify the ROOT CAUSE (not symptoms)
3. Try a fundamentally different fix
4. If truly stuck after 3 different approaches, ask the user for help

Resetting the circuit breaker log.
BLOCK
    # Reset the log so Claude can try a new approach
    rm -f "$LOG_FILE"
    exit 2
  fi

  # Also check for repeated test runs with same test command
  # (catches: npm test -> fail -> edit -> npm test -> fail -> edit -> npm test)
  TEST_PATTERN=""
  case "$NORMALIZED" in
    *"npm test"*|*"npm run test"*|*"npx vitest"*|*"npx jest"*|*"npx playwright test"*)
      TEST_PATTERN="test-run"
      ;;
  esac

  if [ -n "$TEST_PATTERN" ]; then
    # Count test runs in last 10 entries
    TEST_RUNS=$(tail -10 "$LOG_FILE" | grep -c -E '(npm test|npm run test|npx vitest|npx jest|npx playwright test)' || true)
    if [ "$TEST_RUNS" -ge 5 ]; then
      cat <<BLOCK
CIRCUIT BREAKER TRIPPED: $TEST_RUNS test runs detected in the last 10 commands.

You appear to be in a test-fail-edit-retry loop. STOP and:
1. Re-read the failing test and the implementation together
2. Check if the test expectation is wrong (not just the implementation)
3. Check if you're missing a dependency, import, or setup step
4. If stuck, ask the user for help

Resetting the circuit breaker log.
BLOCK
      rm -f "$LOG_FILE"
      exit 2
    fi
  fi
fi

exit 0
