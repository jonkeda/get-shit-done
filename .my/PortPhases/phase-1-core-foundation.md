# Phase 1: Core Foundation — Minimal Viable Port

**Goal:** Get the basic GSD workflow running in Copilot. A user can run `/gsd-quick` to plan and execute ad-hoc tasks, plus use the simple navigation/utility commands.

**Depends on:** Nothing — this is the starting phase.  
**Validates:** Copilot agent/prompt/MCP/hook primitives can carry the GSD model.

---

## Step 1: Scaffold the Copilot Project Structure

Create the directory layout that all subsequent steps populate:

```
.github/
├── copilot-instructions.md
├── instructions/
├── prompts/
├── agents/
├── skills/
│   └── gsd-quick/
│       ├── references/
│       └── templates/
└── hooks/

.gsd/
├── tools/
├── hooks/
└── references/
```

**Actions:**
1. Create `.github/` directory with all subdirectories
2. Create `.gsd/` directory for runtime tooling
3. Add `.gsd/` to `.gitignore` (runtime, not user-editable)
4. Decide: `.github/` contents are versioned; `.gsd/` is installed

**Output:** Empty scaffold, no functional files yet.

---

## Step 2: Write `copilot-instructions.md` (Always-On Instructions)

Port the top-level GSD conventions that every Copilot interaction should follow.

**Source material:**
- GSD's `CLAUDE.md` equivalent (project-wide rules)
- The STATE.md-first rule: "Always read `.planning/STATE.md` before doing GSD work"

**Content to include:**
1. GSD project detection: "If `.planning/` directory exists, this is a GSD-managed project"
2. STATE.md-first rule: "Read `.planning/STATE.md` at the start of every task to understand project position"
3. File conventions: what `.planning/` files mean, how they relate
4. Commit conventions: conventional commits with `{type}({scope}): {description}`
5. Context fidelity: "Never invent requirements. Work only from ROADMAP.md and PLAN.md"
6. Planning doc format expectations (frontmatter, sections)

**Validation:** Open Copilot chat, ask about the project — it should mention STATE.md and .planning/.

---

## Step 3: Build the MCP Server (gsd-tools core subset)

Port the most-used `gsd-tools.cjs` subcommands as an MCP tool provider. This is the infrastructure everything else depends on.

**Source:** `get-shit-done/bin/gsd-tools.cjs` + `get-shit-done/bin/lib/*.cjs`

### Step 3a: MCP server scaffold

Create `.gsd/tools/gsd-mcp-server.js`:
- stdio-based MCP server (reads JSON-RPC on stdin, writes on stdout)
- Tool registry pattern: each tool = name + JSON schema + handler function
- Error handling wrapper

### Step 3b: Port state management tools

| Tool Name | Source | Input | Output |
|-----------|--------|-------|--------|
| `gsd_state_load` | `lib/state.cjs` → `loadState()` | none | Full STATE.md parsed as JSON |
| `gsd_state_update` | `lib/state.cjs` → `updateState()` | `{section, key, value}` | success/fail |
| `gsd_state_patch` | `lib/state.cjs` → `patchState()` | `{patches: [{path, value}]}` | success/fail |
| `gsd_state_snapshot` | `lib/state.cjs` → `stateSnapshot()` | none | Compact state summary |

### Step 3c: Port config tools

| Tool Name | Source | Input | Output |
|-----------|--------|-------|--------|
| `gsd_config_load` | `lib/config.cjs` | none | Full config.json as JSON |
| `gsd_config_set` | `lib/config.cjs` | `{key, value}` | success/fail |
| `gsd_config_ensure` | `lib/config.cjs` | none | Ensures config.json exists with defaults |

### Step 3d: Port init tools (context loaders)

| Tool Name | Source | Input | Output |
|-----------|--------|-------|--------|
| `gsd_init_quick` | `lib/init.cjs` → `initQuick()` | `{description}` | JSON blob with all quick-task context |
| `gsd_init_progress` | `lib/init.cjs` → `initProgress()` | none | JSON blob with project overview |
| `gsd_init_resume` | `lib/init.cjs` → `initResume()` | none | JSON blob with resume context |
| `gsd_init_todos` | `lib/init.cjs` → `initTodos()` | none | JSON blob with todos context |
| `gsd_init_phase_op` | `lib/init.cjs` → `initPhaseOp()` | `{phase}` | JSON blob with phase context |

### Step 3e: Port roadmap tools

| Tool Name | Source | Input | Output |
|-----------|--------|-------|--------|
| `gsd_roadmap_analyze` | `lib/roadmap.cjs` | none | Phase list with status, plan/summary counts |
| `gsd_roadmap_get_phase` | `lib/roadmap.cjs` | `{phase}` | Single phase details |

### Step 3f: Port phase tools

| Tool Name | Source | Input | Output |
|-----------|--------|-------|--------|
| `gsd_phase_add` | `lib/phase.cjs` | `{description}` | Phase number, directory path |
| `gsd_phase_remove` | `lib/phase.cjs` | `{phase, force?}` | Removal result + renumbering info |
| `gsd_phase_insert` | `lib/phase.cjs` | `{after_phase, description}` | Decimal phase number, directory path |

### Step 3g: Port git tools

| Tool Name | Source | Input | Output |
|-----------|--------|-------|--------|
| `gsd_commit` | `lib/commands.cjs` | `{message, files[]}` | Commit hash |
| `gsd_current_timestamp` | utility | `{format?}` | ISO timestamp |
| `gsd_generate_slug` | utility | `{text}` | URL-safe slug |

### Step 3h: Port utility tools

| Tool Name | Source | Input | Output |
|-----------|--------|-------|--------|
| `gsd_progress_bar` | `lib/commands.cjs` | none | ASCII progress bar |
| `gsd_summary_extract` | `lib/commands.cjs` | `{file}` | One-liner extraction from SUMMARY.md |

### Step 3i: Register MCP server

Create `.vscode/mcp.json`:
```json
{
  "servers": {
    "gsd-tools": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/.gsd/tools/gsd-mcp-server.js"]
    }
  }
}
```

**Validation:** In Copilot chat, call `gsd_state_load` — should return STATE.md content (or error if no `.planning/`).

---

## Step 4: Port Simple Commands as `.prompt.md` Files

Create 12 prompt files for commands that don't require subagent orchestration.

### Step 4a: `gsd-help.prompt.md`

**Source:** `commands/gsd/help.md` + `workflows/help.md`

```yaml
---
mode: agent
description: "Show all GSD commands and usage guide"
---
```

Body: Static help text adapted for Copilot (replace `/gsd:` with `/gsd-`, remove Claude Code-specific references).

### Step 4b: `gsd-progress.prompt.md`

**Source:** `commands/gsd/progress.md` + `workflows/progress.md`

```yaml
---
mode: agent
description: "Check project progress and route to next action"
tools: [read, execute]
---
```

Body: Instructions to call `gsd_init_progress` MCP tool, then `gsd_roadmap_analyze`, format output, and suggest next command based on routing logic (6 routes from the workflow).

### Step 4c: `gsd-pause-work.prompt.md`

**Source:** `commands/gsd/pause-work.md` + `workflows/pause-work.md`

```yaml
---
mode: agent
description: "Save context handoff when pausing work mid-phase"
tools: [read, edit, execute]
---
```

Body: Detect current phase, gather context, write `.continue-here.md`, commit.

### Step 4d: `gsd-resume-work.prompt.md`

**Source:** `commands/gsd/resume-work.md` + `workflows/resume-project.md`

```yaml
---
mode: agent
description: "Resume work from previous session with context restoration"
tools: [read, execute]
---
```

Body: Call `gsd_init_resume`, check for `.continue-here.md`, present status, offer action routing.

### Step 4e: `gsd-settings.prompt.md`

**Source:** `commands/gsd/settings.md` + `workflows/settings.md`

```yaml
---
mode: agent
description: "Configure GSD workflow toggles and model profile"
tools: [read, edit, execute]
---
```

Body: Call `gsd_config_load`, present current settings, ask for changes, write updates.

### Step 4f: `gsd-add-todo.prompt.md`

**Source:** `commands/gsd/add-todo.md` + `workflows/add-todo.md`

```yaml
---
mode: agent
description: "Capture idea or task for later"
tools: [read, edit, execute]
---
```

Body: Call `gsd_init_todos`, extract from conversation or args, check duplicates, write todo file, commit.

### Step 4g: `gsd-check-todos.prompt.md`

**Source:** `commands/gsd/check-todos.md` + `workflows/check-todos.md`

```yaml
---
mode: agent
description: "List pending todos and select one to work on"
tools: [read, execute]
---
```

Body: Call `gsd_init_todos`, list, handle selection, cross-reference roadmap, offer actions.

### Step 4h: `gsd-add-phase.prompt.md`

**Source:** `commands/gsd/add-phase.md` + `workflows/add-phase.md`

```yaml
---
mode: agent
description: "Append new phase to roadmap"
tools: [read, edit, execute]
---
```

Body: Parse description, call `gsd_phase_add`, update STATE.md, suggest plan-phase.

### Step 4i: `gsd-remove-phase.prompt.md`

**Source:** `commands/gsd/remove-phase.md` + `workflows/remove-phase.md`

```yaml
---
mode: agent
description: "Remove future phase and renumber subsequent phases"
tools: [read, edit, execute]
---
```

Body: Parse phase number, validate future phase, confirm, call `gsd_phase_remove`, commit.

### Step 4j: `gsd-insert-phase.prompt.md`

**Source:** `commands/gsd/insert-phase.md` + `workflows/insert-phase.md`

```yaml
---
mode: agent
description: "Insert urgent work as decimal phase between existing phases"
tools: [read, edit, execute]
---
```

Body: Parse after-phase + description, call `gsd_phase_insert`, update STATE.md, suggest plan-phase.

### Step 4k: `gsd-set-profile.prompt.md`

**Source:** `commands/gsd/set-profile.md` + `workflows/set-profile.md`

```yaml
---
mode: agent
description: "Quick model profile switch (quality/balanced/budget)"
tools: [read, edit, execute]
---
```

Body: Parse profile name, validate, call `gsd_config_set`, confirm.

### Step 4l: `gsd-update.prompt.md`

**Source:** `commands/gsd/update.md` + `workflows/update.md`

```yaml
---
mode: agent  
description: "Check for GSD updates"
tools: [execute]
---
```

Body: Run version check, compare with installed version, show changelog preview.

**Validation:** In Copilot chat, type `/gsd-help` — should show the command reference. Type `/gsd-progress` — should call MCP and show project status.

---

## Step 5: Port Core Agents as `.agent.md` Files

Create the 4 agents needed for `/gsd-quick` (planner, executor, plan-checker, verifier).

### Step 5a: `gsd-planner.agent.md`

**Source:** `agents/gsd-planner.md` (full prompt engineering content)

```yaml
---
description: "Creates executable phase plans with task breakdown, dependency analysis, and goal-backward verification"
tools: [read, edit, execute, search, web, agent]
model: [claude-sonnet-4, gpt-4.1]
user-invocable: false
---
```

Body: Translate the full `gsd-planner.md` agent instructions. Key adaptations:
- Replace `@~/.claude/` file references with skill-relative paths
- Replace `Bash(node gsd-tools.cjs ...)` instructions with MCP tool calls
- Replace `Task()` references with `runSubagent` pattern
- Keep all prompt engineering (goal-backward, vertical slices, context fidelity, etc.)

### Step 5b: `gsd-executor.agent.md`

**Source:** `agents/gsd-executor.md`

```yaml
---
description: "Executes PLAN.md files atomically — per-task git commits, deviation handling, SUMMARY.md production"
tools: [read, edit, execute, search, todo]
model: [claude-sonnet-4, gpt-4.1]
user-invocable: false
---
```

Body: Translate `gsd-executor.md`. Key adaptations:
- Replace `gsd-tools.cjs commit` calls with `gsd_commit` MCP tool
- Replace `gsd-tools.cjs state update` with `gsd_state_update` MCP tool
- Keep deviation rules (R1-R4), scope boundaries, TDD flow, fix attempt limits
- Keep conventional commit format

### Step 5c: `gsd-plan-checker.agent.md`

**Source:** `agents/gsd-plan-checker.md`

```yaml
---
description: "Verifies plans will achieve phase goals before execution (8-dimensional verification)"
tools: [read, execute, search]
model: [claude-sonnet-4, gpt-4.1]
user-invocable: false
---
```

Body: Translate `gsd-plan-checker.md`. Keep all 8 verification dimensions.

### Step 5d: `gsd-verifier.agent.md`

**Source:** `agents/gsd-verifier.md`

```yaml
---
description: "Goal-backward verification of actual codebase against phase goals"
tools: [read, execute, search]
model: [claude-sonnet-4, gpt-4.1]
user-invocable: false
---
```

Body: Translate `gsd-verifier.md`. Keep "DO NOT trust SUMMARY claims", three-level verification, anti-pattern scanning.

**Validation:** Agents should be visible in Copilot's agent picker but NOT user-invocable.

---

## Step 6: Create the `gsd-quick` Skill

Port the `/gsd:quick` command as a complete skill with orchestration.

### Step 6a: Create `SKILL.md`

**Source:** `commands/gsd/quick.md` + `workflows/quick.md`

```
.github/skills/gsd-quick/
├── SKILL.md
├── references/
│   └── quick-workflow.md      ← detailed orchestration steps
└── templates/
    ├── plan.md                ← PLAN.md template for quick tasks
    └── summary.md             ← SUMMARY.md template
```

**SKILL.md content:**
```yaml
---
description: "Execute a quick task with GSD guarantees (atomic commits, state tracking)"
---
```

Body:
1. Parse user input (description). If empty, ask.
2. Call `gsd_init_quick` MCP tool → get context JSON
3. Create task directory: `.planning/quick/{next_num}-{slug}/`
4. Delegate to `gsd-planner` agent (via `runSubagent`) with quick mode instructions
5. Delegate to `gsd-executor` agent (via `runSubagent`) with the plan
6. Update STATE.md via `gsd_state_update` MCP tool
7. Commit docs via `gsd_commit` MCP tool
8. Present completion summary

### Step 6b: Port quick-mode templates

Copy and adapt:
- `get-shit-done/templates/phase-prompt.md` → simplified for quick mode (no wave, no dependencies)
- `get-shit-done/templates/summary.md` → `templates/summary.md`

### Step 6c: Write quick workflow reference

`references/quick-workflow.md` — detailed step-by-step from `workflows/quick.md`, adapted for Copilot:
- Replace `Task(subagent_type="gsd-planner")` with subagent delegation instructions
- Replace `gsd-tools.cjs` calls with MCP tool names
- Keep the `--full` mode logic (plan-checker + verifier)

**Validation:** In Copilot chat, type `/gsd-quick "Add a health check endpoint"` — should plan, execute, commit, and produce SUMMARY.md.

---

## Step 7: Port Templates

Copy and adapt the essential templates for Phase 1.

| Template | Source | Target |
|----------|--------|--------|
| `config.json` | `templates/config.json` | `.gsd/references/config-default.json` |
| `state.md` | `templates/state.md` | `.gsd/references/state-template.md` |
| `continue-here.md` | `templates/continue-here.md` | `.gsd/references/continue-here-template.md` |

**Adaptations:** Remove Claude Code-specific references, replace `/gsd:` with `/gsd-` in any embedded command references.

---

## Step 8: Port References

Copy the shared knowledge docs needed by Phase 1 agents.

| Reference | Source | Target | Used By |
|-----------|--------|--------|---------|
| `ui-brand.md` | `references/ui-brand.md` | `.gsd/references/ui-brand.md` | All agents (output formatting) |
| `git-integration.md` | `references/git-integration.md` | `.gsd/references/git-integration.md` | Executor |
| `verification-patterns.md` | `references/verification-patterns.md` | `.gsd/references/verification-patterns.md` | Verifier, Plan-checker |
| `model-profiles.md` | `references/model-profiles.md` | `.gsd/references/model-profiles.md` | Reference only |

**Adaptations:** Replace `gsd-tools.cjs commit` references with `gsd_commit` MCP tool. Remove Claude Code hook references.

---

## Step 9: Write File Instructions

Create `.instructions.md` files for context-aware behavior.

### Step 9a: `planning-docs.instructions.md`

```yaml
---
applyTo: ".planning/**"
---
```

Content: "These are GSD planning documents. Respect their frontmatter format. Don't modify manually unless instructed. Use GSD commands to update state."

### Step 9b: `gsd-plans.instructions.md`

```yaml
---
applyTo: ".planning/phases/**/*-PLAN.md"
---
```

Content: "This is a GSD execution plan. Tasks are ordered by dependency. Each task has `files`, `action`, `verify`, `done` fields. Execute via `/gsd-execute-phase`."

---

## Step 10: Create Context Monitor Hook

Port the context monitoring as a PostToolUse hook.

### Step 10a: Create hook script

`.gsd/hooks/context-monitor.js`:
- Read stdin JSON for session/context data
- If context metrics available: compute remaining percentage
- Output `systemMessage` with WARNING (≤35% remaining) or CRITICAL (≤25% remaining)
- Debounce: track call count, warn every 5 calls (severity escalation bypasses)

### Step 10b: Register hook

`.github/hooks/context-monitor.json`:
```json
{
  "event": "PostToolUse",
  "command": "node ${workspaceFolder}/.gsd/hooks/context-monitor.js",
  "systemMessage": "{{stdout}}"
}
```

**Validation:** Manually test hook by executing many tool calls in a long session.

---

## Step 11: End-to-End Integration Test

Run through the complete Phase 1 workflow to validate everything works together:

1. **Setup test:** Create a fresh project directory, copy `.github/` and `.gsd/`
2. **Init test:** Create `.planning/` manually with STATE.md, ROADMAP.md, config.json
3. **Help test:** `/gsd-help` → should display command reference
4. **Progress test:** `/gsd-progress` → should call MCP, show project status
5. **Quick test:** `/gsd-quick "Add a hello world endpoint"` → should:
   - Call `gsd_init_quick` MCP tool
   - Spawn planner subagent → produce PLAN.md
   - Spawn executor subagent → implement, commit per task, produce SUMMARY.md
   - Update STATE.md
   - Commit planning docs
6. **Todo test:** `/gsd-add-todo "Add rate limiting"` → should create todo file
7. **Pause test:** `/gsd-pause-work` → should create `.continue-here.md`
8. **Resume test:** `/gsd-resume-work` → should detect and restore context
9. **Phase management test:** `/gsd-add-phase "Add authentication"` → should update ROADMAP.md
10. **Settings test:** `/gsd-settings` → should show/update config.json

---

## Phase 1 Deliverables

| Component | Count | Status |
|-----------|-------|--------|
| `copilot-instructions.md` | 1 | |
| `.instructions.md` files | 2 | |
| `.prompt.md` files | 12 | |
| `.agent.md` files | 4 | |
| Skills (`SKILL.md`) | 1 (gsd-quick) | |
| MCP server | 1 (~20 tools) | |
| Hook scripts | 1 (context monitor) | |
| Templates | 3 | |
| References | 4 | |
| **Total files** | **~28** | |
