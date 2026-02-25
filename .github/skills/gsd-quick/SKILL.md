---
name: gsd-quick
description: "Execute a quick task with GSD guarantees (atomic commits, state tracking)"
---

# Quick Task Skill

Execute small, ad-hoc tasks with GSD guarantees (atomic commits, STATE.md tracking) but shorter path than full phase planning.

Quick mode spawns planner (quick mode) + executor, tracks tasks in `.planning/quick/`, and updates STATE.md's "Quick Tasks Completed" table. **Does NOT modify ROADMAP.md.**

**Default:** Skips research, plan-checker, verifier — use when you know exactly what to do.
**`--full` flag:** Enables plan-checking (max 2 iterations) and post-execution verification.

## Steps

### 1. Parse arguments and get task description

Parse `$ARGUMENTS` for:
- `--full` flag → store as `$FULL_MODE` (true/false)
- Remaining text → use as `$DESCRIPTION`

If `$DESCRIPTION` is empty, ask the user:

```
use_tool(vscode_askQuestions, {
  questions: [{
    header: "Quick Task",
    question: "What do you want to do?",
    allowFreeformInput: true
  }]
})
```

Store response as `$DESCRIPTION`. Re-prompt if still empty.

If `$FULL_MODE`, display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► QUICK TASK (FULL MODE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Plan checking + verification enabled
```

Add to progress tracking:

```
use_tool(manage_todo_list, {
  todos: [
    { id: "init", title: "Initialize quick task", status: "in_progress" },
    { id: "plan", title: "Create plan", status: "not_started" },
    { id: "check", title: "Check plan (--full only)", status: "not_started" },
    { id: "execute", title: "Execute plan", status: "not_started" },
    { id: "verify", title: "Verify results (--full only)", status: "not_started" },
    { id: "state", title: "Update STATE.md", status: "not_started" },
    { id: "commit", title: "Final commit", status: "not_started" }
  ]
})
```

### 2. Initialize quick task context

```
use_tool(gsd_init_quick, { description: "$DESCRIPTION" })
```

Parse returned JSON for: `next_num`, `slug`, `date`, `timestamp`, `quick_dir`, `task_dir`, `roadmap_exists`, `planning_exists`.

**If `roadmap_exists` is false:** Error — Quick mode requires an active project with ROADMAP.md. Suggest `/gsd-new-project` first.

Quick tasks can run mid-phase — validation only checks ROADMAP.md exists, not phase status.

### 3. Create task directory

Create `.planning/quick/{next_num}-{slug}/` directory.

Report: `Creating quick task {next_num}: {DESCRIPTION}` with directory path.

Mark init complete:
```
use_tool(manage_todo_list, { todos: [{ id: "init", status: "complete" }] })
```

### 4. Plan the task

Mark plan in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "plan", status: "in_progress" }] })
```

Read `.github/agents/gsd-planner.agent.md` to load the planner's role and methodology. Then, acting as the planner in quick mode:

**Context to read:**
- `.planning/STATE.md` (Project state)
- `.github/copilot-instructions.md` (Project guidelines, if exists)

**Constraints:**
- Create a SINGLE plan with 1-3 focused tasks
- Quick tasks are atomic and self-contained
- No research phase
- If `$FULL_MODE`: target ~40% context usage, generate `must_haves` in frontmatter, each task MUST have `files`, `action`, `verify`, `done` fields
- If NOT `$FULL_MODE`: target ~30% context usage, simple and focused

**Output:** Write plan to `{task_dir}/{next_num}-PLAN.md` using the plan template at `.github/skills/gsd-quick/templates/plan.md`.

Verify the plan file exists. If not, error and stop.

Mark plan complete:
```
use_tool(manage_todo_list, { todos: [{ id: "plan", status: "complete" }] })
```

### 5. Plan-checker loop (only when `$FULL_MODE`)

Skip entirely if NOT `$FULL_MODE`. Mark as skipped.

Mark check in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "check", status: "in_progress" }] })
```

Read `.github/agents/gsd-plan-checker.agent.md` to load the checker's role. Then, acting as the plan-checker:

**Check dimensions (quick scope):**
- Requirement coverage: Does the plan address the task description?
- Task completeness: Do tasks have files, action, verify, done fields?
- Key links: Are referenced files real?
- Scope sanity: Appropriately sized for a quick task (1-3 tasks)?
- must_haves derivation: Are must_haves traceable to the task description?

**Skip:** context compliance (no CONTEXT.md), cross-plan deps (single plan), ROADMAP alignment.

**Handle result:**
- **VERIFICATION PASSED:** Proceed to step 6.
- **ISSUES FOUND:** Enter revision loop (max 2 iterations).

**Revision loop:**
1. Read issues from checker
2. Re-read `.github/agents/gsd-planner.agent.md`, acting as planner in revision mode — make targeted updates to address checker issues (NOT replanning from scratch)
3. Re-check with plan-checker
4. If still issues after 2 iterations: display remaining issues, offer "Force proceed" or "Abort"

Mark check complete:
```
use_tool(manage_todo_list, { todos: [{ id: "check", status: "complete" }] })
```

### 6. Execute the plan

Mark execute in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "execute", status: "in_progress" }] })
```

Read `.github/agents/gsd-executor.agent.md` to load the executor's role and methodology. Then, acting as the executor:

**Context to read:**
- `{task_dir}/{next_num}-PLAN.md` (Plan)
- `.planning/STATE.md` (Project state)
- `.github/copilot-instructions.md` (Project instructions, if exists)

**Constraints:**
- Execute all tasks in the plan
- Commit each task atomically via `gsd_commit`
- Create summary at `{task_dir}/{next_num}-SUMMARY.md` using the summary template at `.github/skills/gsd-quick/templates/summary.md`
- Do NOT update ROADMAP.md (quick tasks are separate)

Verify summary exists. If not, error and stop.

Mark execute complete:
```
use_tool(manage_todo_list, { todos: [{ id: "execute", status: "complete" }] })
```

### 7. Verification (only when `$FULL_MODE`)

Skip entirely if NOT `$FULL_MODE`. Mark as skipped.

Mark verify in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "verify", status: "in_progress" }] })
```

Read `.github/agents/gsd-verifier.agent.md` to load the verifier's role. Then, acting as the verifier:

- Check must_haves against actual codebase
- Create `{task_dir}/{next_num}-VERIFICATION.md`

**Handle verification status:**

| Status | Action |
|--------|--------|
| `passed` | Store `$VERIFICATION_STATUS = "Verified"`, continue |
| `human_needed` | Display items needing manual check, store `$VERIFICATION_STATUS = "Needs Review"` |
| `gaps_found` | Display gaps, offer: 1) Re-run executor to fix, 2) Accept as-is. Store `$VERIFICATION_STATUS = "Gaps"` |

Mark verify complete:
```
use_tool(manage_todo_list, { todos: [{ id: "verify", status: "complete" }] })
```

### 8. Update STATE.md

Mark state in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "state", status: "in_progress" }] })
```

Update STATE.md via `gsd_state_update`:

**8a.** Check if "Quick Tasks Completed" section exists in STATE.md.

**8b.** If section doesn't exist, add it after `### Blockers/Concerns`:

If `$FULL_MODE`:
```markdown
### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
```

If NOT `$FULL_MODE`:
```markdown
### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
```

**8c.** Append new row to the table with task details.

**8d.** Update "Last activity" line:
```
Last activity: {date} - Completed quick task {next_num}: {DESCRIPTION}
```

Mark state complete:
```
use_tool(manage_todo_list, { todos: [{ id: "state", status: "complete" }] })
```

### 9. Final commit and completion

Mark commit in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "commit", status: "in_progress" }] })
```

Commit all planning artifacts via `gsd_commit`:
- `{task_dir}/{next_num}-PLAN.md`
- `{task_dir}/{next_num}-SUMMARY.md`
- `.planning/STATE.md`
- If `$FULL_MODE`: `{task_dir}/{next_num}-VERIFICATION.md`

Message: `docs(quick-{next_num}): {DESCRIPTION}`

Mark commit complete:
```
use_tool(manage_todo_list, { todos: [{ id: "commit", status: "complete" }] })
```

### 10. Present completion

Display completion summary:

If `$FULL_MODE`:
```
GSD ► QUICK TASK COMPLETE (FULL MODE)

Quick Task {next_num}: {DESCRIPTION}

Summary: {task_dir}/{next_num}-SUMMARY.md
Verification: {task_dir}/{next_num}-VERIFICATION.md ({VERIFICATION_STATUS})
Commit: {commit_hash}

Ready for next task: /gsd-quick
```

If NOT `$FULL_MODE`:
```
GSD ► QUICK TASK COMPLETE

Quick Task {next_num}: {DESCRIPTION}

Summary: {task_dir}/{next_num}-SUMMARY.md
Commit: {commit_hash}

Ready for next task: /gsd-quick
```
