---
applyTo: ".planning/STATE.md"
---

This is the GSD project state file. It tracks the current milestone position, active phase, plan number, progress metrics, decisions, blockers, todos, and session continuity context.

**Rules:**
- Update via `gsd_state_update` or `gsd_state_load` MCP tools, not direct editing
- The `position` section tracks: milestone, phase number, plan number
- The `progress` section tracks: completed/total phases, progress bar
- The `decisions` section records locked architectural choices
- The `todos` section tracks pending work items
- The `blockers` section records impediments
- The `session` section provides continuity context for resuming work

**Always read this file first** before performing any GSD operation.
