---
mode: agent
description: "Interactive discussion to gather user preferences and decisions for a phase"
---

Gather implementation decisions through adaptive questioning before planning a phase. Produces a CONTEXT.md file that downstream agents (researcher, planner) use to know what to investigate and what choices are locked.

**Arguments:** `$ARGUMENTS` (phase number — required)

If no argument provided:
```
ERROR: Phase number required
Usage: /gsd-discuss-phase <phase-number>
Example: /gsd-discuss-phase 1
```

## Process

Read and follow the complete workflow defined in `.github/skills/gsd-discuss-phase/SKILL.md`.

The skill covers:

1. **Parse arguments** — Extract phase number from `$ARGUMENTS`
2. **Validate phase** — Call `gsd_find_phase` to locate the phase directory
3. **Check existing context** — If CONTEXT.md exists, offer Update/View/Skip
4. **Gather decisions** — Interactive questioning about implementation preferences, technology choices, constraints, and trade-offs for this phase
5. **Write CONTEXT.md** — Record all decisions in the phase directory
6. **Commit** — Use `gsd_commit` MCP tool

**After this command:** Run `/gsd-plan-phase {N}` to create execution plans.
