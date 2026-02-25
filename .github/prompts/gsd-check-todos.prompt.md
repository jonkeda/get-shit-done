---
mode: agent
description: "List pending todos and select one to work on"
---

List all pending todos, allow selection, load full context, and route to appropriate action.

**Arguments:** `$ARGUMENTS` (optional area filter)

## Process

### 1. Initialize

Call `gsd_init_todos` MCP tool.

Extract: `todo_count`, `todos`, `pending_dir`.

If `todo_count` is 0:
```
No pending todos.

Todos are captured during work sessions with `/gsd-add-todo`.

Would you like to:
1. Continue with current phase (`/gsd-progress`)
2. Add a todo now (`/gsd-add-todo`)
```
Exit.

### 2. Parse Filter

- `/gsd-check-todos` → show all
- `/gsd-check-todos api` → filter to area "api" only

### 3. List Todos

Display numbered list from the `todos` array (filtered by area if specified):

```
Pending Todos:

1. Add auth token refresh (api, 2d ago)
2. Fix modal z-index issue (ui, 1d ago)
3. Refactor database connection pool (database, 5h ago)

Reply with a number to view details, or:
- `/gsd-check-todos [area]` to filter by area
- `q` to exit
```

Format age as relative time from created timestamp.

### 4. Handle Selection

Wait for user to reply with a number. If invalid: "Invalid selection. Reply with 1–[N] or `q`."

### 5. Load Context

Read the full todo file. Display:

```
## [title]

**Area:** [area]
**Created:** [date] ([relative time] ago)
**Files:** [list or "None"]

### Problem
[problem section content]

### Solution
[solution section content]
```

If `files` field has entries, briefly summarize each.

### 6. Check Roadmap

If `.planning/ROADMAP.md` exists:
- Check if todo's area matches an upcoming phase
- Check if todo's files overlap with a phase's scope
- Note any match for action options

### 7. Offer Actions

**If todo maps to a roadmap phase:**
- **Work on it now** — move to done, start working
- **Add to phase plan** — include when planning Phase [N]
- **Brainstorm approach** — think through before deciding
- **Put it back** — return to list

**If no roadmap match:**
- **Work on it now** — move to done, start working
- **Create a phase** — `/gsd-add-phase` with this scope
- **Brainstorm approach** — think through before deciding
- **Put it back** — return to list

### 8. Execute Action

**Work on it now:** Move file from `pending/` to `done/`. Update STATE.md todo count. Present context and begin work.

**Add to phase plan:** Note reference in phase planning. Keep in pending.

**Create a phase:** Suggest running `/gsd-add-phase [description from todo]`.

**Brainstorm approach:** Start discussion about problem and approaches.

**Put it back:** Return to list.

### 9. Commit

If todo was moved to done/, use `gsd_commit` MCP tool:
- Message: `docs: start work on todo - [title]`
- Files: `.planning/todos/done/[filename]`, `.planning/STATE.md`
