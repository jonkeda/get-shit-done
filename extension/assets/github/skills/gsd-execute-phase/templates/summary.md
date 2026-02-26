# Summary Template

Template for `.planning/phases/XX-name/{phase}-{plan}-SUMMARY.md` — phase plan completion documentation.

---

```markdown
---
phase: XX-name
plan: YY
subsystem: [primary category: auth, payments, ui, api, database, infra, testing, etc.]
tags: [searchable tech: jwt, stripe, react, postgres, prisma]

requires:
  - phase: [prior phase this depends on]
    provides: [what that phase built that this uses]
provides:
  - [what this plan built/delivered]
affects: [phase names or keywords that will need this context]

tech-stack:
  added: [libraries/tools added]
  patterns: [architectural patterns established]

key-files:
  created: [important files created]
  modified: [important files modified]

key-decisions:
  - "Decision 1"
  - "Decision 2"

patterns-established:
  - "Pattern 1: description"

requirements-completed: []  # Copy ALL requirement IDs from this plan's `requirements` frontmatter

duration: Xmin
completed: YYYY-MM-DD
---

# Phase [X]: [Name] Summary

**[Substantive one-liner — NOT "phase complete" or "implementation finished"]**

## Performance

- **Duration:** [time]
- **Started:** [ISO timestamp]
- **Completed:** [ISO timestamp]
- **Tasks:** [count completed]
- **Files modified:** [count]

## Accomplishments
- [Most important outcome]
- [Second key accomplishment]
- [Third if applicable]

## Task Commits

1. **Task 1: [name]** — `abc123f` (feat/fix/test/refactor)
2. **Task 2: [name]** — `def456g` (feat/fix/test/refactor)

## Files Created/Modified
- `path/to/file.ts` — What it does
- `path/to/another.ts` — What it does

## Decisions Made
[Key decisions with brief rationale, or "None — followed plan as specified"]

## Deviations from Plan
[If none: "None — plan executed exactly as written"]

[If deviations:]
**1. [Rule N - Category] Brief description**
- **Found during:** Task [N]
- **Issue / Fix / Files / Verification / Commit**

**Total deviations:** [N] auto-fixed ([breakdown])
**Impact on plan:** [assessment]

## Issues Encountered
[Problems and resolutions, or "None"]

## Next Phase Readiness
[What's ready for next phase]
[Any blockers or concerns]

---
*Phase: XX-name*
*Completed: [date]*
```

---

## One-Liner Rules

The summary one-liner MUST be substantive:

**Good:** "JWT auth with refresh rotation using jose library"
**Bad:** "Phase complete" or "Authentication implemented"
