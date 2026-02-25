# Wave Logic

How plans are grouped into waves for execution ordering.

## Wave Assignment

Waves are pre-computed at plan time (by the planner) and stored in PLAN.md frontmatter:

```yaml
wave: 1          # This plan runs in wave 1
depends_on: []   # No dependencies
```

```yaml
wave: 2              # This plan runs in wave 2
depends_on: ["01"]   # Depends on plan 01 completing first
```

## Rules

- **Wave 1:** Plans with `depends_on: []` — no dependencies, can all run in parallel
- **Wave 2+:** Plans that depend on earlier-wave plans — `wave = max(dependency waves) + 1`
- **No file conflicts:** Plans in the same wave should not modify the same files
- **Sequential fallback:** If `parallelization` is false in config, plans within a wave execute sequentially

## Wave Execution Order

1. Execute all Wave 1 plans (parallel or sequential per config)
2. Wait for all Wave 1 plans to complete
3. Report Wave 1 results
4. Execute all Wave 2 plans
5. Continue until all waves complete

## Dependency Graph Validation

Before execution, verify:
- All referenced plan IDs in `depends_on` exist
- No circular dependencies (A → B → A)
- Wave numbers are consistent with dependencies
- No plan depends on a higher-wave plan

## Example

```
Wave 1: Plan 01 (auth foundation), Plan 02 (product models)  — parallel
Wave 2: Plan 03 (protected features) depends on Plan 01      — sequential after Wave 1
Wave 3: Plan 04 (dashboard UI) depends on Plans 01, 03       — after Wave 2
```

## Filtering

- **Normal execution:** Skip plans with existing SUMMARY.md (already complete)
- **`--gaps-only` flag:** Also skip plans without `gap_closure: true` in frontmatter
- **If all plans filtered:** "No matching incomplete plans" → exit
