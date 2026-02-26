---
reference: complete-milestone-workflow
---

# Milestone Completion Protocol

Archive completed milestone and prepare for next version.

## Sequence

```
Check audit → Verify readiness → Gather stats → Extract accomplishments
  → Archive milestone → Evolve PROJECT.md → Reorganize ROADMAP.md
  → Write retrospective → Handle branches → Git tag → Commit → Done
```

## Pre-flight Check

Look for `.planning/v{version}-MILESTONE-AUDIT.md`:
- **Missing:** Recommend `/gsd-audit-milestone` first
- **Status gaps_found:** Recommend `/gsd-plan-milestone-gaps` first
- **Status passed/tech_debt:** Proceed

## Readiness Verification

Use `gsd_roadmap_analyze` to confirm:
- All phases have SUMMARY.md (plans complete)
- Parse REQUIREMENTS.md traceability for completion status
- Present milestone scope and stats for user confirmation

If requirements incomplete, offer: proceed anyway / run audit / abort.

## Stats Gathering

From git and planning files:
- Phase count, plan count, task count
- Git range (`feat(XX)..feat(YY)`), file changes, LOC
- Timeline from git log (first commit → last commit)

## Archival (via `gsd_milestone_complete`)

The CLI tool handles:
1. Create `.planning/milestones/` directory
2. Archive ROADMAP.md → `milestones/v{version}-ROADMAP.md`
3. Archive REQUIREMENTS.md → `milestones/v{version}-REQUIREMENTS.md` with archive header
4. Move audit file to milestones if exists
5. Create/append MILESTONES.md entry with accomplishments from SUMMARY.md
6. Update STATE.md

**Optional phase archival:** Offer to move phase directories to `milestones/v{version}-phases/`.

## PROJECT.md Evolution

Full review at milestone completion:

| Check | Action |
|---|---|
| "What This Is" | Compare to what was built, update if changed |
| Core Value | Still the right priority? |
| Validated requirements | Move shipped requirements from Active |
| Active requirements | Add new for next milestone |
| Out of Scope | Audit reasoning, still valid? |
| Context | Current codebase state, tech stack |
| Key Decisions | Add decisions with outcomes |
| Constraints | Any changed during development? |

## ROADMAP.md Reorganization

Collapse completed milestone phases:
```markdown
<details>
<summary>✅ v{version} (Phases X-Y) — SHIPPED {date}</summary>
- [x] Phase X: Name (N/N plans) — completed {date}
</details>
```

Delete `.planning/REQUIREMENTS.md` (fresh one for next milestone).

## Retrospective

Append to `.planning/RETROSPECTIVE.md` (create if first milestone):
- What was built (from SUMMARY.md one-liners)
- What worked / what was inefficient
- Patterns established
- Key lessons
- Update cross-milestone trends table

## Git Operations

1. **Branches:** Check strategy, offer merge/delete options
2. **Tag:** `git tag -a v{version} -m "..."` with accomplishments
3. **Push:** Ask about pushing tag to remote
4. **Commit:** All milestone files via `gsd_commit`

## Version Naming

| Version | Meaning |
|---|---|
| v1.0 | Initial MVP |
| v1.1, v1.2 | Minor updates, new features |
| v2.0, v3.0 | Major rewrites, breaking changes |

**Heuristic:** "Is this deployed/usable/shipped?" → milestone. Still in progress? → keep working.
