---
reference: new-milestone-workflow
---

# New Milestone Creation Protocol

Brownfield equivalent of new-project. Project exists, PROJECT.md has history.

## Sequence

```
Load context → Gather goals → Determine version → Update PROJECT.md/STATE.md
  → Research decision → Define requirements → Create roadmap → Done
```

## Context Loading

Read from `.planning/`:
- `PROJECT.md` — existing project definition, validated requirements, decisions
- `MILESTONES.md` — what shipped previously, last phase number
- `STATE.md` — pending todos, blockers, accumulated context
- `MILESTONE-CONTEXT.md` — from `/gsd-discuss-milestone` if it exists

## Version Conventions

| Pattern | When |
|---|---|
| v1.0 | Initial MVP |
| v1.1, v1.2 | Minor updates, new features, fixes |
| v2.0, v3.0 | Major rewrites, breaking changes |

Names: short 1-2 words (v1.0 MVP, v1.1 Security, v2.0 Redesign).

## Research Phase (Optional)

When enabled, spawn 4 parallel `gsd-project-researcher` agents:

| Dimension | Focus | Output |
|---|---|---|
| Stack | New libraries/tools needed | `.planning/research/STACK.md` |
| Features | Expected behavior, table stakes | `.planning/research/FEATURES.md` |
| Architecture | Integration with existing system | `.planning/research/ARCHITECTURE.md` |
| Pitfalls | Common mistakes when adding these features | `.planning/research/PITFALLS.md` |

After all 4 complete, spawn `gsd-research-synthesizer` → `.planning/research/SUMMARY.md`.

**Milestone-aware:** Each researcher gets existing context from PROJECT.md. Focus on NEW capabilities only — don't re-research validated stack.

## Requirements Definition

- Present features by category (from research or conversation)
- Multi-select scoping per category
- REQ-ID format: `[CATEGORY]-[NUMBER]` continuing from existing
- Quality: specific, testable, user-centric, atomic, independent
- Generate REQUIREMENTS.md with categories, future, out-of-scope, traceability

## Roadmap Creation

Delegate to `gsd-roadmapper` agent:
- Starting phase number from MILESTONES.md (continues from previous)
- Derive phases from THIS MILESTONE's requirements only
- Map every requirement to exactly one phase
- 2-5 success criteria per phase
- Validate 100% coverage
- Write ROADMAP.md, STATE.md, update REQUIREMENTS.md traceability

## Commit Points

1. After PROJECT.md + STATE.md updates
2. After research (if enabled)
3. After requirements definition
4. After roadmap creation and approval
