---
mode: agent
description: "Start a new milestone with scope definition and roadmap"
---

Start a new milestone after completing (or as) the first one. Defines milestone scope, creates a fresh roadmap, and initializes state.

**Arguments:** `$ARGUMENTS` (optional — milestone name or version)

## Process

Read and follow the **New Milestone Flow** defined in `.github/skills/gsd-milestone/SKILL.md`.

The new milestone flow covers:

1. **Check preconditions** — Verify current milestone is complete (or this is the first). Warn if prior milestone has unarchived work.
2. **Define milestone scope** — Interview user about goals, key deliverables, and definition of done for this milestone
3. **Create milestone structure** — Set up new ROADMAP.md, update config.json with milestone version
4. **Initialize state** — Create or reset STATE.md with new milestone context
5. **Commit** — Atomic commit of new milestone planning docs
6. **Present next steps** — Suggest `/gsd-discuss-phase 1` or `/gsd-plan-phase 1`
