---
mode: agent
description: "Complete and archive the current milestone"
---

Complete the current milestone: archive all planning artifacts, update milestone history, and reset state for the next milestone.

**Arguments:** `$ARGUMENTS` (milestone version — required)

If no version provided:
```
ERROR: Milestone version required
Usage: /gsd-complete-milestone <version>
Example: /gsd-complete-milestone v1.0
```

## Process

Read and follow the **Complete Flow** defined in `.github/skills/gsd-milestone/SKILL.md`.

The complete flow covers:

1. **Load milestone context** — Call `gsd_state_load`, verify version matches current milestone
2. **Check audit status** — Read audit report; warn if no audit or if gaps were found
3. **Archive artifacts** — Move roadmap, requirements, audit report, and phase directories to `.planning/milestones/v{version}-*/`
4. **Update milestone history** — Create or append to `.planning/MILESTONES.md`
5. **Reset state** — Clear STATE.md for next milestone
6. **Commit** — Atomic commit of all archival changes
7. **Present completion** — Show archived files, suggest `/gsd-new-milestone` for next cycle
