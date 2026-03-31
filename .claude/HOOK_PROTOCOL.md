# Hook Protocol Reference

Documents the JSON input format, event names, matcher syntax, and output conventions used by hooks in this project. Use this as the reference when upgrading Claude Code or modifying hooks.

## Hook Events

Claude Code supports 25 hook event types. This project uses the events marked with ✓.

### Events Used in This Project

| Event | When | Can Block? | Settings Key | Used? |
|-------|------|-----------|-------------|-------|
| `PreToolUse` | Before a tool executes | Yes (exit 2) | `hooks.PreToolUse` | ✓ |
| `PostToolUse` | After a tool succeeds | No (informational) | `hooks.PostToolUse` | ✓ |
| `PostToolUseFailure` | After a tool fails | No (informational) | `hooks.PostToolUseFailure` | ✓ |
| `SessionStart` | When session starts/resumes | No | `hooks.SessionStart` | ✓ |
| `Stop` | After Claude finishes responding | Yes (exit 2 + JSON) | `hooks.Stop` | ✓ |
| `Notification` | When Claude sends a notification | No | `hooks.Notification` | ✓ |

### Other Available Events (not currently used)

| Event | When | Can Block? |
|-------|------|-----------|
| `UserPromptSubmit` | Before user prompt is processed | Yes |
| `SubagentStart` | When a subagent is dispatched | Yes |
| `SubagentStop` | When a subagent finishes | Yes |
| `TaskCreated` | When a task is created (agent teams) | Yes |
| `TaskCompleted` | When a task is completed (agent teams) | Yes |
| `TeammateIdle` | When a teammate agent is idle (agent teams) | Yes |
| `StopFailure` | When session ends due to API error | No |
| `SessionEnd` | When session terminates | No |
| `PreCompact` | Before context compaction | No |
| `PostCompact` | After context compaction | No |
| `CwdChanged` | When working directory changes | No |
| `ConfigChange` | When settings.json changes in session | Yes |
| `InstructionsLoaded` | When CLAUDE.md files load | No |
| `FileChanged` | When external file changes detected | No |
| `PermissionRequest` | When permission dialog would appear | No |
| `Elicitation` / `ElicitationResult` | Interactive prompts | No |
| `WorktreeCreate` / `WorktreeRemove` | Git worktree lifecycle | No |

### Handler Types

Hooks support 4 handler types (this project uses `command` only):

| Type | Description |
|------|-------------|
| `command` | Shell script execution (used in this project) |
| `http` | HTTP request to a local/remote server |
| `prompt` | Single-turn LLM evaluation |
| `agent` | Spawns a subagent with tools |

## JSON Input (stdin)

All hooks receive JSON on stdin. The structure depends on the event type.

### PreToolUse / PostToolUse (Bash)

```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm run test",
    "description": "Run unit tests"
  }
}
```

### PreToolUse / PostToolUse (Edit/Write)

```json
{
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/absolute/path/to/file.ts",
    "old_string": "...",
    "new_string": "..."
  }
}

{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/absolute/path/to/file.ts",
    "content": "..."
  }
}

{
  "tool_name": "MultiEdit",
  "tool_input": {
    "edits": [
      { "file_path": "/path/file1.ts", "old_string": "...", "new_string": "..." },
      { "file_path": "/path/file2.ts", "old_string": "...", "new_string": "..." }
    ]
  }
}
```

### Stop

```json
{
  "stop_reason": "end_turn",
  "last_assistant_message": "PR created at https://github.com/...",
  "session_id": "...",
  "transcript_path": "..."
}
```

### Notification

```json
{
  "message": "Claude Code needs your attention"
}
```

## JSON Output (stdout)

### PreToolUse Hooks

- **Exit 0**: Allow the tool call to proceed (no output needed)
- **Exit 2**: Block the tool call. Stdout is shown to Claude as the reason.
- Any other exit code: Non-blocking error (logged but tool proceeds)

### PostToolUse Hooks

- **Exit 0**: Success. Optional JSON output:
  ```json
  {"additionalContext": "Message shown to Claude after the tool runs"}
  ```
- Any other exit code: Non-blocking error (logged)

### Stop Hooks

- **Exit 0** with JSON: Can block stopping:
  ```json
  {"decision": "block", "reason": "Tasks remain incomplete"}
  ```
- **Exit 0** without JSON or with other output: Allow stop

## Matcher Syntax

Matchers in `settings.json` determine which tool calls trigger a hook.

```json
{
  "matcher": "Bash",              // Exact tool name match
  "matcher": "Edit|Write|MultiEdit",  // OR pattern (pipe-separated)
  "matcher": "*"                  // Match all tools
}
```

**Known tool names:** `Bash`, `Read`, `Write`, `Edit`, `MultiEdit`, `Glob`, `Grep`, `Agent`, `Skill`, `WebFetch`, `WebSearch`, `TaskCreate`, `TaskUpdate`

## Permission Pattern Syntax

```json
"allow": [
  "Bash(npm run *)",       // Tool(glob pattern)
  "Bash(git push -u origin *)",
  "Read(*)",               // Allow all reads
  "Edit(*)"                // Allow all edits
]
```

- `*` is a wildcard matching any characters
- Pattern is matched against the command string (for Bash) or file path (for Read/Edit/Write)
- More specific patterns take precedence over broader ones
- `deny` rules override `allow` rules

## Our Hooks

| Hook | Event | Matcher | Blocks? | Purpose |
|------|-------|---------|---------|---------|
| `verify-before-commit.sh` | PreToolUse | Bash | Yes | Gate commits on tests/types/lint/E2E |
| `circuit-breaker.sh` | PreToolUse | Bash | Yes | Block retry loops (3+ identical) |
| `review-enforcer.sh` | PreToolUse | Bash | Yes | Block impl work if reviews pending |
| `review-gate.sh` | PreToolUse | Bash | Yes | Block PR without review artifacts |
| `session-start.sh` | PostToolUse | Edit\|Write\|MultiEdit | No | Arm session lock on first project file edit |
| `post-edit-format.sh` | PostToolUse | Edit\|Write\|MultiEdit | No | Auto-format + invalidate cache |
| `ui-edit-reminder.sh` | PostToolUse | Edit\|Write\|MultiEdit | No | Nudge for browser verification on UI edits |
| `post-commit-review.sh` | PostToolUse | Bash | No | Queue impl commits for review |
| `audit-log.sh` | PostToolUse + PostToolUseFailure | * | No | JSONL audit trail with session context |
| `session-init.sh` | SessionStart | — | No | Inject task context on resume/compact |
| `on-stop.sh` | Stop | — | Conditional | Block if session active; auto-disarm on PR |
| `notify.sh` | Notification | — | No | Desktop notification |

## Upgrade Checklist

When upgrading Claude Code, verify:

1. Hook input JSON structure hasn't changed (check `tool_input.command` path)
2. Event names still match (`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `SessionStart`, `Stop`, `Notification`)
3. Matcher syntax still works (pipe `|` for OR, `*` for wildcard)
4. Permission pattern syntax still works (`ToolName(pattern)`)
5. Exit code 2 still means "block" for PreToolUse hooks
6. `additionalContext` JSON key still works for PostToolUse output
7. `decision: "block"` JSON key still works for Stop hooks

## External Dependencies

Hooks require these tools in PATH:

- `jq` — JSON parsing (all hooks)
- `git` — repo operations (most hooks)
- `npx` + `biome` — auto-formatting (post-edit-format.sh)
- `md5` (macOS) or `md5sum` (Linux) — repo hashing (most hooks)
