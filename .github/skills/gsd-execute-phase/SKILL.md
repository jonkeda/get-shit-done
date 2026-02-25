---
name: gsd-execute-phase
description: "Execute phase plans in wave order with atomic commits, deviation handling, and verification"
---

# Execute Phase

Execute all plans in a phase using wave-based ordering. Each plan is implemented by the executor agent with atomic commits per task, automatic deviation handling, checkpoint protocols, and post-execution verification.

**Core principle:** Orchestrator coordinates, not executes. Each plan gets fresh context for maximum quality.

## Invocation

```
/gsd-execute-phase <phase-number> [--gaps-only] [--auto]
```

## Steps

### 1. Initialize

1. Call `gsd_state_load` to load project state
2. Call `gsd_find_phase` to locate the phase directory and validate it exists
3. Call `gsd_roadmap_get_phase` for phase metadata (name, goal, requirement IDs)
4. Discover plans: list all `*-PLAN.md` files in the phase directory
5. Check for existing `*-SUMMARY.md` files — skip completed plans

**Error conditions:**
- Phase directory not found → error
- No plans found → error: run `/gsd-plan-phase` first
- `.planning/` missing → error: run `/gsd-new-project` first

### 2. Parse Flags

- `--gaps-only` — Filter for plans with `gap_closure: true` in frontmatter only. Used after verify-work creates fix plans.
- `--auto` — Auto-advance through checkpoints and to next phase on completion.

### 3. Wave Analysis

For each PLAN.md, read frontmatter (`gsd_frontmatter_get`) for:
- `wave` — execution wave number
- `depends_on` — plan dependencies
- `autonomous` — whether plan has checkpoints

Group plans by wave number, sort within waves by plan number.

Display wave structure:
```
## Execution Plan

**Phase {X}: {Name}** — {total} plans across {wave_count} waves

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1 | 01-01, 01-02 | {from plan objectives} |
| 2 | 01-03 | {from plan objectives} |
```

See [wave-logic.md](references/wave-logic.md) for dependency ordering details.

### 4. Execute Waves Sequentially

For each wave, execute plans (parallel if configured, sequential otherwise):

For each plan in the wave:
1. Mark progress via `manage_todo_list`
2. Present: "Executing Plan {N}: {title}" with 2-3 sentence description of what it builds
3. Read `.github/agents/gsd-executor.agent.md` and follow its instructions
4. Acting as executor:
   - Read the PLAN.md, STATE.md, config.json, CLAUDE.md
   - Implement each task, commit atomically via `gsd_commit`
   - Handle deviations per R1-R4 rules (see [deviation-rules.md](references/deviation-rules.md))
   - Handle checkpoints per protocol (see [checkpoint-protocol.md](references/checkpoint-protocol.md))
   - Write SUMMARY.md on completion
5. Spot-check after each plan:
   - Verify SUMMARY.md exists
   - Check git log for plan commits
   - Check for `## Self-Check: FAILED` marker
6. Update ROADMAP progress via `gsd_roadmap_update_plan_progress`

See [execute-plan-workflow.md](references/execute-plan-workflow.md) for full per-plan protocol.

**Wave completion:** Report what was built, what it enables for the next wave.

### 5. Post-Execution Verification

If `workflow.verifier` is enabled in config:
1. Read `.github/agents/gsd-verifier.agent.md` and follow its instructions
2. Acting as verifier:
   - Check `must_haves` from PLAN.md frontmatter against actual codebase
   - Verify SUMMARY.md claims match reality
   - Check requirement coverage
3. Produce VERIFICATION.md using the [verification-report template](templates/verification-report.md)
4. Present results:
   - **PASSED** → Phase complete
   - **GAPS FOUND** → Offer `/gsd-plan-phase {N} --gaps`
   - **HUMAN NEEDED** → List items requiring human verification

### 6. Update State

1. Update STATE.md position via `gsd_state_update`
2. Commit phase completion docs via `gsd_commit`

### 7. Present Summary and Next Steps

Display aggregate results:
```
## Phase {X}: {Name} Execution Complete

**Waves:** {N} | **Plans:** {M}/{total} complete

| Wave | Plans | Status |
|------|-------|--------|
| 1 | plan-01, plan-02 | ✓ Complete |
| 2 | plan-03 | ✓ Complete |
```

Suggest: `/gsd-verify-work {N}` for user acceptance testing.

### 8. Auto-Advance (if `--auto`)

If `--auto` flag or `workflow.auto_advance` config is true, and verification passed with no gaps:
- Run transition workflow to advance to next phase
- Propagate `--auto` flag

## Failure Handling

- **Plan fails mid-execution:** Report which plan failed, ask "Retry?" or "Continue with remaining waves?"
- **Dependency chain breaks:** Wave 1 failure may cascade to Wave 2 dependents
- **Checkpoint unresolvable:** Offer "Skip plan?" or "Abort phase?"
- **Partial completion:** Re-running `/gsd-execute-phase` discovers completed SUMMARYs and resumes from first incomplete plan

## Decimal Phase Handling

For gap-closure phases (e.g., `4.1`): after execution, close parent UAT gaps and resolve referenced debug sessions.
