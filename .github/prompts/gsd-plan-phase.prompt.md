---
mode: agent
description: "Research, plan, and verify a phase — produces RESEARCH.md, PLAN.md files, and VALIDATION.md"
---

Orchestrate the full planning pipeline for a roadmap phase: research the domain, generate executable plans, and verify plan quality through an iterative checker loop.

**Arguments:** `$ARGUMENTS` (phase number — required, plus optional flags)

Flags:
- `--research` — Force re-research even if RESEARCH.md exists
- `--skip-research` — Skip research, go straight to planning
- `--gaps` — Gap closure mode: create fix plans from VERIFICATION.md/UAT.md gaps only
- `--skip-verify` — Skip the plan-checker verification loop
- `--prd <file>` — Use a PRD/spec file instead of discuss-phase for context
- `--auto` — Auto-advance to execute-phase on completion

If no phase number provided:
```
ERROR: Phase number required
Usage: /gsd-plan-phase <phase-number> [flags]
Example: /gsd-plan-phase 3
Example: /gsd-plan-phase 2 --skip-research
Example: /gsd-plan-phase 4 --prd docs/spec.md
```

## Process

Read and follow the complete workflow defined in `.github/skills/gsd-plan-phase/SKILL.md`.

The skill covers:

1. **Parse arguments** — Extract phase number and flags
2. **Preconditions** — Load state, find phase directory, get phase metadata from roadmap
3. **PRD handling** (if `--prd`) — Parse external spec into CONTEXT.md
4. **Research step** — Spawn phase researcher agent (unless `--skip-research` or `--gaps`)
5. **Planning step** — Spawn planner agent to create PLAN.md files with task decomposition, wave assignment, and checkpoints
6. **Verification step** — Spawn plan-checker agent to validate plans (unless `--skip-verify`); iterate up to 2 times on issues
7. **Commit and present** — Commit all planning docs, suggest next steps

**After this command:** Run `/gsd-execute-phase {N}` to implement the plans.
