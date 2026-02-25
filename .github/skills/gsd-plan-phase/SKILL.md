---
name: gsd-plan-phase
description: "Research, plan, and verify a phase — produces RESEARCH.md, PLAN.md files, and VALIDATION.md"
---

# Plan Phase

Orchestrate the full planning pipeline for a roadmap phase: research the domain, generate executable plans, and verify plan quality through an iterative checker loop.

**Default flow:** Research (if needed) → Plan → Verify → Done

## Invocation

```
/gsd-plan-phase [phase] [--auto] [--research] [--skip-research] [--gaps] [--skip-verify] [--prd <file>]
```

## Steps

### 1. Parse Arguments

Extract from user input:
- **Phase number** (required) — integer or decimal like `2.1`. If omitted, auto-detect next unplanned phase from roadmap.
- **Flags:**
  - `--research` — Force re-research even if RESEARCH.md exists
  - `--skip-research` — Skip research, go straight to planning
  - `--gaps` — Gap closure mode: reads VERIFICATION.md/UAT.md for gaps, skips research, planner creates fix plans only
  - `--skip-verify` — Skip the plan-checker verification loop
  - `--prd <file>` — Use a PRD/acceptance criteria file instead of discuss-phase. Parses requirements into CONTEXT.md automatically.
  - `--auto` — Auto-advance to execute-phase on completion

### 2. Preconditions

1. Call `gsd_state_load` — verify `.planning/` exists. If missing → error: run `/gsd-new-project` first.
2. Call `gsd_find_phase` with the phase number to locate the phase directory. If not found, validate phase exists in ROADMAP.md and create the directory.
3. Call `gsd_roadmap_get_phase` to get goal, requirement IDs, and phase metadata.

### 3. PRD Handling (if `--prd`)

If `--prd <file>` provided:
1. Read the PRD file
2. Parse requirements, user stories, acceptance criteria, and constraints
3. Map each to a locked decision in CONTEXT.md format
4. Identify areas the PRD doesn't cover → mark as "Claude's Discretion"
5. Write CONTEXT.md to the phase directory
6. Commit via `gsd_commit`
7. Skip discuss-phase entirely, proceed to research step

### 4. Research Step (unless `--skip-research` or `--gaps`)

Check for existing RESEARCH.md. If exists and no `--research` flag → reuse and skip to planning.

If research needed:
1. Read `.github/agents/gsd-phase-researcher.agent.md` and follow its instructions
2. Acting as phase-researcher:
   - Read ROADMAP.md phase section, CONTEXT.md (if exists), REQUIREMENTS.md, codebase docs
   - Research domain: standard stack, architecture patterns, pitfalls, code examples
3. Produce `{phase_dir}/{phase}-RESEARCH.md` using the [research template](templates/research.md)
4. Handle researcher return:
   - `## RESEARCH COMPLETE` → continue to planning
   - `## RESEARCH BLOCKED` → present blocker, offer: provide context / skip research / abort

See [research-workflow.md](references/research-workflow.md) for full delegation protocol.

### 5. Planning Step

1. Read `.github/agents/gsd-planner.agent.md` and follow its instructions
2. Acting as planner, read all planning context:
   - STATE.md, ROADMAP.md, REQUIREMENTS.md, CONTEXT.md, RESEARCH.md
   - Codebase docs, prior summaries (via `gsd_history_digest`)
3. Produce one or more `{phase_dir}/{phase}-{NN}-PLAN.md` files using the [phase-prompt template](templates/phase-prompt.md)
4. Update ROADMAP.md with plan count

See [planning-workflow.md](references/planning-workflow.md) for full delegation protocol.

### 6. Verification Loop (unless `--skip-verify`)

1. Read `.github/agents/gsd-plan-checker.agent.md` and follow its instructions
2. Acting as plan-checker: evaluate ALL plans across 8 verification dimensions:
   - Requirement coverage, task completeness, dependency correctness, key links planned, scope sanity, verification derivation, context compliance, Nyquist compliance
3. Parse checker output:
   - **`## VERIFICATION PASSED`** → Write VALIDATION.md with pass status → done
   - **`## ISSUES FOUND`** → increment iteration count
     - If iterations ≥ 3 → Write VALIDATION.md with remaining issues, present to user
     - Otherwise → re-invoke planner for **targeted revision** (NOT full re-plan), then re-check

See [plan-checking.md](references/plan-checking.md) and [plan-revision.md](references/plan-revision.md) for protocols.

### 7. Gap Closure Mode (`--gaps`)

When `--gaps` flag is set:
1. Read VERIFICATION.md and/or UAT.md for diagnosed gaps
2. Skip research entirely
3. Planner creates fix plans only — mark `gap_closure: true` in frontmatter
4. Plans target specific gaps with root causes from diagnosis

### 8. Commit and Present

1. Commit all planning docs via `gsd_commit`
2. Present plan summary: plan count, wave structure, key objectives
3. Suggest next command: `/gsd-execute-phase {N}`

### 9. Auto-Advance (if `--auto`)

If `--auto` flag or `workflow.auto_advance` config is true:
- Spawn execute-phase automatically after successful verification
- Pass `--auto --no-transition` to prevent cascading transitions
