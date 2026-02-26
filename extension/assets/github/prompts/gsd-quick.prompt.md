---
mode: agent
description: "Execute a quick task with GSD guarantees (atomic commits, state tracking)"
---

Execute small, ad-hoc tasks with GSD guarantees (atomic commits, STATE.md tracking) but a shorter path than full phase planning. Does NOT modify ROADMAP.md.

**Arguments:** `$ARGUMENTS` (task description — recommended)

Flags:
- `--full` — Enable plan-checking and post-execution verification

If no description provided, will prompt interactively.

```
Examples:
  /gsd-quick Fix the navigation bar alignment issue
  /gsd-quick Add null checks to the API client
  /gsd-quick --full Refactor the auth service to use dependency injection
```

## Process

Read and follow the complete workflow defined in `.github/skills/gsd-quick/SKILL.md`.

The skill covers:

1. **Parse arguments** — Extract task description and `--full` flag
2. **Initialize** — Call `gsd_init_quick` to set up quick task directory in `.planning/quick/`
3. **Plan** — Spawn planner agent in quick mode to create a focused PLAN.md
4. **Verify plan** (if `--full`) — Run plan-checker, iterate up to 2 times
5. **Execute** — Spawn executor agent to implement changes with atomic commits
6. **Verify** (if `--full`) — Run verifier agent on completed work
7. **Summarize** — Write SUMMARY.md, update STATE.md quick tasks table
8. **Commit** — Atomic commit of planning docs
