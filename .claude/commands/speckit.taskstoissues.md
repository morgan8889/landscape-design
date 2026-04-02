---
description: Convert existing tasks into actionable, dependency-ordered issues in GitHub or Plane based on available design artifacts.
tools: ['github/github-mcp-server/issue_write']
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").
1. From the executed script, extract the path to **tasks**.

### Choose target: Plane or GitHub

1. Check if Plane MCP tools are available (e.g. `create_work_item`). If available AND the user passed `--plane` or `plane` in arguments, use **Plane mode**. If unavailable or not requested, fall through to **GitHub mode**.

### Plane mode

1. Read `.claude/skills/plane-dev/references/projects.md` to get the project ID and state UUIDs. If no project exists yet, create one with `create_project()` and populate `references/projects.md`.
2. Create a **parent work item** from the feature name/description with state = Todo.
3. For each task in the list, create a **child work item** under the parent:
   - `create_work_item(project_id, name=<task title>, description_html=<task content>, parent=<parent UUID>, state=<todo UUID>)`
4. If tasks have explicit ordering or dependencies, create `blocked_by` relations.
5. Move parent to **In Progress**.
6. Report: list of created tickets with identifiers.

### GitHub mode

1. Get the Git remote by running:

```bash
git config --get remote.origin.url
```

> [!CAUTION]
> ONLY PROCEED TO NEXT STEPS IF THE REMOTE IS A GITHUB URL

1. For each task in the list, use the GitHub MCP server to create a new issue in the repository that is representative of the Git remote.

> [!CAUTION]
> UNDER NO CIRCUMSTANCES EVER CREATE ISSUES IN REPOSITORIES THAT DO NOT MATCH THE REMOTE URL
