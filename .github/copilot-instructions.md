# GSD Project Conventions

## Project Detection
If a `.planning/` directory exists in the workspace root, this is a GSD-managed project. All GSD rules below apply.

## STATE.md First Rule  
**Before performing ANY GSD operation, ALWAYS read `.planning/STATE.md` first.** This file contains:
- Current milestone, phase, and plan position
- Active blockers and decisions
- Session context and progress

## File Conventions
- `.planning/STATE.md` — Current project position and context
- `.planning/PROJECT.md` — Project definition and vision
- `.planning/REQUIREMENTS.md` — Requirement specifications with REQ-IDs
- `.planning/ROADMAP.md` — Phase-based execution roadmap
- `.planning/config.json` — Workflow configuration
- `.planning/phases/{NN}-{name}/` — Phase working directories
  - `{NN}-CONTEXT.md` — User decisions for this phase
  - `{NN}-RESEARCH.md` — Research findings
  - `{NN}-{MM}-PLAN.md` — Execution plans
  - `{NN}-{MM}-SUMMARY.md` — Execution results
  - `{NN}-VALIDATION.md` — Plan verification results
  - `{NN}-VERIFICATION.md` — Post-execution verification
  - `{NN}-UAT.md` — User acceptance testing
- `.planning/quick/` — Quick task directory
- `.planning/codebase/` — Codebase analysis docs
- `.planning/milestones/` — Archived milestones

## Commit Conventions
Use conventional commits: `{type}({scope}): {description}`

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`, `ci`
Scope: derived from the component being changed

For planning docs: `docs(planning): {description}`

## Context Fidelity
- **Never invent requirements.** Work only from ROADMAP.md phase goals and PLAN.md tasks.
- **Never assume technology choices.** Check CONTEXT.md and PROJECT.md first.
- **Never skip verification.** Every claim in SUMMARY.md must be verifiable against actual code.

## Planning Doc Format
All `.planning/` markdown files use YAML frontmatter:
```yaml
---
key: value
---
```
Do not modify frontmatter manually — use `gsd_frontmatter_set` MCP tool.

## MCP Tools
GSD provides MCP tools prefixed with `gsd_`. Use these for all state management, config, roadmap, and phase operations instead of manual file editing. Key tools:
- `gsd_state_load` / `gsd_state_update` — State management
- `gsd_config_load` / `gsd_config_set` — Configuration
- `gsd_roadmap_analyze` / `gsd_roadmap_get_phase` — Roadmap queries
- `gsd_commit` — Atomic commits with planning doc tracking
- `gsd_find_phase` — Phase directory discovery

## GSD Commands
Use `/gsd-{command}` to invoke GSD prompts:

### Project Lifecycle
- `/gsd-new-project` — Initialize a new GSD project
- `/gsd-map-codebase` — Analyze existing codebase into structured docs
- `/gsd-progress` — Check project status and route to next action
- `/gsd-new-milestone` — Start a new milestone

### Phase Workflow
- `/gsd-discuss-phase N` — Gather preferences and decisions for phase N
- `/gsd-plan-phase N` — Research and plan phase N
- `/gsd-execute-phase N` — Execute phase N plans with atomic commits
- `/gsd-verify-work N` — Interactive UAT verification for phase N
- `/gsd-research-phase N` — Deep standalone research for phase N

### Phase Management
- `/gsd-add-phase "description"` — Append phase to roadmap
- `/gsd-remove-phase N` — Remove a future phase
- `/gsd-insert-phase N "description"` — Insert urgent work
- `/gsd-list-phase-assumptions N` — List assumptions for phase N

### Quick Operations
- `/gsd-quick "description"` — Execute a quick task with GSD guarantees
- `/gsd-debug "description"` — Scientific debugging with persistent sessions
- `/gsd-add-todo "description"` — Capture task for later
- `/gsd-check-todos` — List pending todos

### Milestone Completion
- `/gsd-audit-milestone` — Audit milestone completeness and integration
- `/gsd-complete-milestone` — Archive and complete current milestone
- `/gsd-plan-milestone-gaps` — Plan fixes for audit gaps

### Session & Config
- `/gsd-pause-work` — Save context for later
- `/gsd-resume-work` — Resume from previous session
- `/gsd-settings` — Configure GSD workflow
- `/gsd-set-profile [quality|balanced|budget]` — Switch model profile
- `/gsd-health` — Check project health and consistency
- `/gsd-cleanup` — Clean stale planning files
- `/gsd-update` — Check for updates
- `/gsd-help` — Show all commands

## Context Management
If the conversation is getting long, consider using `/gsd-pause-work` to save state and start a fresh session with `/gsd-resume-work`.
