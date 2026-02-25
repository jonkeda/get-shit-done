# Planning Workflow

Protocol for delegating plan creation to the planner agent.

## Planner Delegation

Read `.github/agents/gsd-planner.agent.md` and follow its instructions.

## Context to Provide

The planner needs all available planning context:

| Context | Source | Purpose |
|---------|--------|---------|
| Project state | STATE.md | Position, decisions, blockers |
| Roadmap | ROADMAP.md | Phase goals, requirement mapping |
| Requirements | REQUIREMENTS.md | Full requirement specifications |
| User decisions | CONTEXT.md | Locked decisions from discuss-phase |
| Research | RESEARCH.md | Domain research findings |
| Prior work | `gsd_history_digest` | Summaries from completed phases |
| Verification gaps | VERIFICATION.md | Gap details (if `--gaps` mode) |
| UAT gaps | UAT.md | Diagnosed failures (if `--gaps` mode) |

## Planning Modes

### Standard Mode
- Planner reads all context and creates plans from scratch
- Each plan addresses specific requirement IDs from ROADMAP

### Gap Closure Mode (`--gaps`)
- Planner reads VERIFICATION.md or UAT.md for specific gaps
- Creates targeted fix plans only — mark `gap_closure: true` in frontmatter
- Plans are smaller, focused on specific fixes

## Planner Prompt Structure

```
Planning context:
  Phase: {N}
  Mode: {standard | gap_closure}

Files to read:
  - STATE.md (project state)
  - ROADMAP.md (roadmap)
  - REQUIREMENTS.md (requirements)
  - CONTEXT.md (user decisions)
  - RESEARCH.md (technical research)
  - VERIFICATION.md / UAT.md (if --gaps)

Phase requirement IDs: {IDs that MUST appear in plan requirements fields}
```

## Output Format

Plans are written to `{phase_dir}/{phase}-{NN}-PLAN.md` with:

- **Frontmatter:** phase, plan number, type, wave, depends_on, files_modified, autonomous, requirements, must_haves
- **Objective:** What the plan accomplishes
- **Tasks:** XML-formatted task list with type, name, files, action, verify, done
- **Verification:** Pre-completion checks
- **Success criteria:** What must be true when done

## Wave Assignment

Plans are assigned to execution waves at plan time:
- Wave 1: Plans with no dependencies (`depends_on: []`)
- Wave 2+: Plans that depend on earlier waves
- Wave number = max(dependency waves) + 1
- Plans in the same wave can execute in parallel if no file conflicts

## Handling Returns

| Return Marker | Action |
|---------------|--------|
| `## PLANNING COMPLETE` | Display plan count, continue to verification |
| `## CHECKPOINT REACHED` | Present to user, collect response, spawn continuation |
| `## PLANNING INCONCLUSIVE` | Show attempts, offer: add context / retry / manual |

## Quality Gate

Before proceeding to verification, confirm:
- [ ] PLAN.md files created in phase directory
- [ ] Each plan has valid frontmatter (wave, depends_on, files_modified, autonomous, requirements)
- [ ] Tasks are specific and actionable with Files + Action + Verify + Done
- [ ] Dependencies correctly identified with no cycles
- [ ] Waves assigned for parallel execution
- [ ] `must_haves` derived from phase goal (truths, artifacts, key_links)
- [ ] Every phase requirement ID appears in at least one plan's `requirements` field
