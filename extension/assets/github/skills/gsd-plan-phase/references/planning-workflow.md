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

---

## Discovery Levels

Discovery is MANDATORY unless you can prove current context exists.

**Level 0 — Skip** (pure internal work, existing patterns only)
- ALL work follows established codebase patterns (grep confirms)
- No new external dependencies
- Examples: Add delete button, add field to model, create CRUD endpoint

**Level 1 — Quick Verification** (2-5 min)
- Single known library, confirming syntax/version
- Action: Quick docs lookup, no RESEARCH.md needed

**Level 2 — Standard Research** (15-30 min)
- Choosing between 2-3 options, new external integration
- Action: Route to research workflow, produces RESEARCH.md

**Level 3 — Deep Dive** (1+ hour)
- Architectural decision with long-term impact, novel problem
- Action: Full research with RESEARCH.md

**Depth indicators:**
- Level 2+: New library not in package.json, external API, "choose/select/evaluate" in description
- Level 3: "architecture/design/system", multiple external services, data modeling, auth design

For niche domains (3D, games, audio, shaders, ML), suggest `/gsd-research-phase` before plan-phase.

---

## Task Sizing

Each task: **15-60 minutes** agent execution time.

| Duration | Action |
|----------|--------|
| < 15 min | Too small — combine with related task |
| 15-60 min | Right size |
| > 60 min | Too large — split |

**Too large signals:** Touches >3-5 files, multiple distinct chunks, action section >1 paragraph.

**Combine signals:** One task sets up for the next, separate tasks touch same file, neither meaningful alone.

---

## Interface-First Task Ordering

When a plan creates new interfaces consumed by subsequent tasks:

1. **First task: Define contracts** — Create type files, interfaces, exports
2. **Middle tasks: Implement** — Build against the defined contracts
3. **Last task: Wire** — Connect implementations to consumers

This prevents the "scavenger hunt" anti-pattern where executors explore the codebase to understand contracts. They receive the contracts in the plan itself.

---

## Specificity Examples

| TOO VAGUE | JUST RIGHT |
|-----------|------------|
| "Add authentication" | "Add JWT auth with refresh rotation using jose library, store in httpOnly cookie, 15min access / 7day refresh" |
| "Create the API" | "Create POST /api/projects endpoint accepting {name, description}, validates name length 3-50 chars, returns 201 with project object" |
| "Style the dashboard" | "Add Tailwind classes to Dashboard.tsx: grid layout (3 cols on lg, 1 on mobile), card shadows, hover states on action buttons" |
| "Handle errors" | "Wrap API calls in try/catch, return {error: string} on 4xx/5xx, show toast via sonner on client" |
| "Set up the database" | "Add User and Project models to schema.prisma with UUID ids, email unique constraint, createdAt/updatedAt timestamps, run prisma db push" |

**Test:** Could a different agent instance execute without asking clarifying questions? If not, add specificity.
