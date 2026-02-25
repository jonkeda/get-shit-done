# Plan Revision Loop

Protocol for iterating between planner and checker to resolve verification issues.

## Revision Flow

```
Planner → Checker → Issues Found? → Planner (revision) → Checker → ...
```

Maximum 3 iterations (initial plan + check = iteration 1).

## Iteration Tracking

- `iteration_count` starts at 1 after initial plan + first check
- Each revision + re-check increments by 1
- At iteration ≥ 3 → stop loop, present remaining issues to user

## Revision Protocol

When checker returns `## ISSUES FOUND`:

### If `iteration_count < 3`:

1. Display: "Sending back to planner for revision... (iteration {N}/3)"
2. Spawn planner with **revision context**:

```
Revision context:
  Phase: {N}
  Mode: revision

Files to read:
  - Existing PLAN.md files
  - CONTEXT.md (user decisions)

Checker issues: {structured_issues_from_checker}

Instructions:
  Make targeted updates to address checker issues.
  Do NOT replan from scratch unless issues are fundamental.
  Return what changed.
```

3. After planner returns → spawn checker again with same verification context
4. Increment `iteration_count`

### If `iteration_count >= 3`:

1. Display: "Max iterations reached. {N} issues remain:"
2. List remaining issues
3. Write VALIDATION.md with remaining issues noted
4. Offer user choices:
   - **Force proceed** — Accept plans with known issues
   - **Provide guidance and retry** — User gives specific direction, reset iteration count
   - **Abandon** — Stop planning, manual intervention needed

## Key Principles

- **Targeted fixes only:** Revisions address specific checker issues, not full re-plans
- **Preserve working parts:** Planner should not modify sections that already passed
- **Escalate if stuck:** If the same issue persists across iterations, it likely needs user input
- **Track what changed:** Planner should note which plans/tasks it modified

## VALIDATION.md Output

After verification completes (pass or max iterations), write VALIDATION.md:

### On Pass
- Status: passed
- All 8 dimensions summary
- Plan count confirmed

### On Max Iterations
- Status: issues_remaining
- Passed dimensions listed
- Remaining issues with severity
- Recommendation for user action
