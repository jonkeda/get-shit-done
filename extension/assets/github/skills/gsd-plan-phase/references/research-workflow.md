# Research Workflow

Protocol for delegating domain research to the phase-researcher agent before planning.

## When Research Runs

- **Default:** Research runs unless `--skip-research` or `--gaps` flag is set, or `research_enabled` is false in config.
- **Force refresh:** `--research` flag forces re-research even if RESEARCH.md exists.
- **Reuse existing:** If RESEARCH.md exists and no `--research` flag → skip research, use existing.

## Pre-Research Checks

1. Call `gsd_find_phase` to get `phase_dir`
2. Check for existing `{phase_dir}/{phase}-RESEARCH.md`
3. If exists, offer: reuse / refresh / skip

## Researcher Delegation

Read `.github/agents/gsd-phase-researcher.agent.md` and follow its instructions.

Provide the researcher with:

| Context | Source | Purpose |
|---------|--------|---------|
| Phase description | `gsd_roadmap_get_phase` | What to research |
| Phase requirement IDs | ROADMAP.md | Must-address requirements |
| User decisions | CONTEXT.md (if exists) | Locked constraints |
| Project requirements | REQUIREMENTS.md | Full requirement specs |
| Project state | STATE.md | History and decisions |
| Project instructions | CLAUDE.md (if exists) | Project-specific guidelines |

## Researcher Prompt Structure

```
Objective: Research how to implement Phase {N}: {Name}
Answer: "What do I need to know to PLAN this phase well?"

Files to read:
- CONTEXT.md (user decisions)
- REQUIREMENTS.md (project requirements)
- STATE.md (project state and history)

Additional context:
- Phase description from roadmap
- Phase requirement IDs that MUST be addressed
```

## Handling Returns

| Return Marker | Action |
|---------------|--------|
| `## RESEARCH COMPLETE` | Display confirmation, continue to planning |
| `## RESEARCH BLOCKED` | Display blocker, offer: provide context / skip research / abort |
| `## CHECKPOINT REACHED` | Present to user, collect response, spawn continuation |
| `## RESEARCH INCONCLUSIVE` | Show attempts, offer: add context / try different approach / manual |

## Output

Research produces `{phase_dir}/{phase}-RESEARCH.md` containing:
- User constraints (copied from CONTEXT.md)
- Summary and primary recommendation
- Standard stack (libraries, tools, versions)
- Architecture patterns and anti-patterns
- "Don't hand-roll" guidance
- Common pitfalls
- Verified code examples
- State of the art updates
- Open questions

## Validation Architecture (if Nyquist enabled)

After research completes, check if RESEARCH.md contains a `## Validation Architecture` section. If found and `nyquist_validation` is enabled in config:
1. Write VALIDATION.md using the [validation template](../templates/validation.md)
2. Commit via `gsd_commit`
