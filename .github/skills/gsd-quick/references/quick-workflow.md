# Quick Workflow Reference

Detailed workflow for the `/gsd-quick` skill. This reference covers the full quick task lifecycle.

## Overview

Quick tasks follow a compressed GSD workflow:
1. **Init** → `gsd_init_quick` MCP tool returns context JSON
2. **Plan** → Single plan, 1-3 tasks, no research
3. **Check** → (--full only) Plan-checker validates, max 2 revision iterations
4. **Execute** → Executor implements tasks, commits atomically via `gsd_commit`
5. **Verify** → (--full only) Verifier checks must_haves against codebase
6. **State** → Update STATE.md quick tasks table via `gsd_state_update`
7. **Commit** → Commit planning docs via `gsd_commit`

## MCP Tool Mapping

| Operation | MCP Tool |
|-----------|----------|
| Initialize quick task | `gsd_init_quick` with `description` parameter |
| Read project state | `gsd_state_load` |
| Update state | `gsd_state_update` |
| Load config | `gsd_config_load` |
| Atomic commit | `gsd_commit` with message + files |
| Find phase dirs | `gsd_find_phase` |

## Agent Delegation Pattern

Quick tasks use inline agent delegation — the orchestrator reads agent files and acts in that role, rather than spawning separate subagents.

**Pattern:**
1. Read `.github/agents/gsd-{name}.agent.md`
2. Load the agent's role, methodology, and constraints
3. Act as that agent within the current context
4. Produce the expected output artifacts

**Agents used in quick mode:**
- `gsd-planner.agent.md` — Plan creation (quick mode: single plan, 1-3 tasks)
- `gsd-executor.agent.md` — Task execution and commits
- `gsd-plan-checker.agent.md` — (--full only) Plan verification
- `gsd-verifier.agent.md` — (--full only) Post-execution verification

## Argument Parsing

```
$ARGUMENTS format: "[--full] <description>"

Examples:
  "fix the login button styling"         → FULL_MODE=false, DESCRIPTION="fix the login button styling"
  "--full add input validation to forms"  → FULL_MODE=true,  DESCRIPTION="add input validation to forms"
  ""                                      → prompt user for description
```

## Quick vs Full Mode

| Feature | Default | --full |
|---------|---------|--------|
| Planning | Single plan, 1-3 tasks | Single plan, 1-3 tasks (stricter) |
| Plan checking | Skipped | Enabled (max 2 iterations) |
| Execution | Standard | Standard |
| Verification | Skipped | Enabled |
| STATE.md table | No Status column | Status column included |
| Context target | ~30% | ~40% |

## Plan-Checker Scope (--full only)

When checking quick task plans, the checker verifies a reduced set of dimensions:

**Check:**
- Requirement coverage — plan addresses task description
- Task completeness — tasks have files, action, verify, done fields
- Key links — referenced files exist
- Scope sanity — 1-3 tasks, appropriate for quick task
- must_haves — traceable to task description

**Skip:**
- Context compliance (no CONTEXT.md for quick tasks)
- Cross-plan dependencies (single plan)
- ROADMAP alignment (quick tasks are separate)

## STATE.md Update Protocol

Quick tasks add rows to the "Quick Tasks Completed" table in STATE.md.

**Table format differs by mode:**

Default mode:
```markdown
| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
```

Full mode (includes Status column):
```markdown
| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
```

**Important:** If the table already exists, match its existing column format. If adding `--full` to a project with existing quick tasks, add the Status column to header/separator and leave Status empty for previous rows.

## Error Handling

| Error | Resolution |
|-------|------------|
| `roadmap_exists` is false | Quick mode requires active project. Suggest `/gsd-new-project` |
| Plan file not created | Planner failed — stop and report error |
| Summary file not created | Executor failed — stop and report error |
| Checker loops > 2 | Present remaining issues, offer force proceed or abort |
| Verification gaps | Offer re-execute or accept as-is |

## Directory Structure

```
.planning/quick/
├── 001-fix-login-button/
│   ├── 001-PLAN.md
│   ├── 001-SUMMARY.md
│   └── 001-VERIFICATION.md  (--full only)
├── 002-add-validation/
│   ├── 002-PLAN.md
│   └── 002-SUMMARY.md
└── ...
```

Each quick task gets its own numbered directory under `.planning/quick/`.
