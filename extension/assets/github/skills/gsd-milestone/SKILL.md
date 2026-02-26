---
name: gsd-milestone
description: "Milestone lifecycle — audit cross-phase integration, complete and archive, or start new milestone"
---

# /gsd-milestone

Combined skill handling three milestone lifecycle operations: **new**, **audit**, and **complete**.

## Invocation

```
/gsd-new-milestone [milestone name]
/gsd-audit-milestone [version]
/gsd-complete-milestone <version>
```

- `$ARGUMENTS` determines which sub-command to run
- If starts with "audit" → Audit flow
- If starts with "complete" → Complete flow
- If starts with "new" or is a milestone name → New milestone flow
- If ambiguous → ask user which operation

---

## Audit Flow

Verify milestone achieved its definition of done by aggregating phase verifications, checking cross-phase integration, and assessing requirements coverage.

**Reference:** `.github/skills/gsd-milestone/references/audit-milestone-workflow.md`

### Progress Tracking

At the start of the audit, create a todo list with `manage_todo_list` covering steps A1-A6. Mark each step in-progress/completed as you work through them.

### Step A1: Load Milestone Context

```
Call gsd_state_load to get current milestone info.
```

Parse version from arguments or detect current from ROADMAP.md. Identify all phase directories in scope.

### Step A2: Read All Phase Verifications

For each phase in the milestone, read VERIFICATION.md. Extract:
- Status: passed / gaps_found
- Critical gaps (blockers)
- Non-critical gaps (tech debt, deferred items)
- Anti-patterns (TODOs, stubs, placeholders)
- Requirements coverage (which REQ-IDs satisfied/blocked)

Flag any phase missing VERIFICATION.md as "unverified phase" — this is a blocker.

### Step A3: Cross-Reference Requirements (3-Source Verification)

Cross-reference three independent sources for each requirement:

1. **REQUIREMENTS.md traceability table** — REQ-IDs mapped to phases, checked-off state
2. **Phase VERIFICATION.md requirements tables** — requirement status with evidence
3. **SUMMARY.md frontmatter** — `requirements-completed` field from each phase

**Status determination:**

| VERIFICATION | SUMMARY | REQUIREMENTS | → Final Status |
|---|---|---|---|
| passed | listed | `[x]` | **satisfied** |
| passed | listed | `[ ]` | **satisfied** (update checkbox) |
| passed | missing | any | **partial** (verify manually) |
| gaps_found | any | any | **unsatisfied** |
| missing | any | any | **unsatisfied** |

**Orphan detection:** Requirements in traceability table but absent from ALL phase VERIFICATIONs are flagged as orphaned → treated as unsatisfied.

Any unsatisfied requirement forces `gaps_found` status on the audit.

### Step A4: Spawn Integration Checker

Read `.github/agents/gsd-integration-checker.agent.md` and follow its instructions.

Acting as integration checker: verify cross-phase wiring, E2E user flows, and data handoffs between phases. Map each finding to affected REQ-IDs.

### Step A5: Produce Audit Report

Create `.planning/v{version}-MILESTONE-AUDIT.md` with:
- Frontmatter: milestone, audited timestamp, status, scores, structured gaps, tech_debt
- Full markdown report with tables for requirements, phases, integration, tech debt

**Status values:**
- `passed` — all requirements met, no critical gaps
- `gaps_found` — critical blockers exist
- `tech_debt` — no blockers but accumulated deferred items

### Step A6: Present Results and Route

**If passed:** Suggest `/gsd-complete-milestone {version}`
**If gaps_found:** Show unsatisfied requirements, integration issues, broken flows. Suggest `/gsd-plan-milestone-gaps`
**If tech_debt:** Show debt by phase. Offer "Complete milestone (accept debt)" or "Plan cleanup phase"

Commit the audit file via `gsd_commit`.

---

## Complete Flow

Archive completed milestone, create historical record, and prepare for next version.

**Reference:** `.github/skills/gsd-milestone/references/complete-milestone-workflow.md`

### Progress Tracking

At the start of completion, create a todo list with `manage_todo_list` covering steps C1-C11. Mark each step in-progress/completed as you work through them.

### Step C1: Check for Audit

Look for `.planning/v{version}-MILESTONE-AUDIT.md`:
- If **missing**: recommend `/gsd-audit-milestone` first
- If audit status is `gaps_found`: recommend `/gsd-plan-milestone-gaps` first
- If audit status is `passed` or `tech_debt`: proceed

### Step C2: Verify Readiness

Call `gsd_roadmap_analyze` to check all phases have completed plans (SUMMARY.md exists). Also parse REQUIREMENTS.md traceability table for completion status.

Present milestone scope and stats. If requirements incomplete, offer:
1. **Proceed anyway** — accept known gaps
2. **Run audit first** — assess gap severity
3. **Abort** — return to development

Wait for user confirmation.

### Step C3: Gather Stats

Calculate from git and planning files:
- Phase count, plan count, task count
- Files modified, lines of code
- Timeline (start → end dates)
- Git range

### Step C4: Extract Accomplishments

Read all SUMMARY.md files for milestone phases. Extract 4-6 key accomplishments. Present for user approval.

### Step C5: Archive Milestone

Call `gsd_milestone_complete` MCP tool with version. The tool handles:
- Creating `.planning/milestones/` directory
- Archiving ROADMAP.md → `milestones/v{version}-ROADMAP.md` (using template at `.github/skills/gsd-milestone/templates/milestone-archive.md`)
- Archiving REQUIREMENTS.md → `milestones/v{version}-REQUIREMENTS.md`
- Moving audit file to milestones if it exists
- Creating/appending MILESTONES.md entry
- Updating STATE.md

After archival, offer to archive phase directories:
- **Yes** → move to `milestones/v{version}-phases/`
- **Skip** → keep in place, use `/gsd-cleanup` later

### Step C6: Evolve PROJECT.md

Full PROJECT.md review at milestone completion:
1. Check "What This Is" accuracy against what was built
2. Verify Core Value still correct
3. Move shipped requirements to Validated section
4. Add new requirements to Active for next milestone
5. Audit Out of Scope reasoning
6. Update context with current codebase state
7. Add milestone decisions to Key Decisions table
8. Update "Last updated" footer

### Step C7: Reorganize ROADMAP.md

Group completed milestone phases under a `<details>` collapse:
```markdown
<details>
<summary>✅ v{version} (Phases X-Y) — SHIPPED {date}</summary>
- [x] Phase X: Name (N/N plans) — completed {date}
</details>
```

Delete original REQUIREMENTS.md (fresh one for next milestone).

### Step C8: Write Retrospective

Check for `.planning/RETROSPECTIVE.md`. Append milestone section using template at `.github/skills/gsd-milestone/templates/retrospective.md`. Update cross-milestone trends if section exists.

### Step C9: Handle Branches

Check branching strategy from config. If phase or milestone branches exist, offer:
- Squash merge to main
- Merge with history
- Delete without merging
- Keep branches

### Step C10: Git Tag and Commit

```
Create annotated tag: git tag -a v{version} -m "v{version} {name} ..."
```

Ask about pushing tag to remote.

Commit all milestone completion files via `gsd_commit`.

### Step C11: Suggest Next Steps

```
✅ Milestone v{version} complete

/gsd-new-milestone — start next milestone
```

---

## New Milestone Flow

Start a new milestone cycle: questioning → research (optional) → requirements → roadmap.

**Reference:** `.github/skills/gsd-milestone/references/new-milestone-workflow.md`

### Progress Tracking

At the start of new milestone setup, create a todo list with `manage_todo_list` covering steps N1-N7. Mark each step in-progress/completed as you work through them.

### Step N1: Load Project Context

Read existing PROJECT.md, MILESTONES.md (what shipped previously), and STATE.md. Check for MILESTONE-CONTEXT.md (from prior discussion).

### Step N2: Gather Milestone Goals

**If MILESTONE-CONTEXT.md exists:** Use features and scope from it. Present summary for confirmation.

**If no context file:**
- Present what shipped in last milestone
- Ask: "What do you want to build next?"
- Explore features, priorities, constraints, scope through conversation

### Step N3: Determine Version

Parse last version from MILESTONES.md. Suggest next version (v1.0 → v1.1, or v2.0 for major). Confirm with user.

### Step N4: Update PROJECT.md and STATE.md

Add Current Milestone section to PROJECT.md with goal and target features. Reset STATE.md for new milestone.

Commit via `gsd_commit`.

### Step N5: Research Decision

Ask: "Research the domain ecosystem for new features before defining requirements?"
- **Research first (Recommended)** — spawn parallel research agents for Stack, Features, Architecture, Pitfalls
- **Skip research** — go straight to requirements

Persist choice to config via `gsd_config_set workflow.research {true|false}`.

If researching: spawn 4 parallel `gsd-project-researcher` agents, then synthesize with `gsd-research-synthesizer` agent. Present key findings.

### Step N6: Define Requirements

Present features by category (from research or conversation). Scope each category via multi-select. Identify gaps.

Generate REQUIREMENTS.md with:
- v{version} Requirements grouped by category (checkboxes, REQ-IDs)
- Future Requirements (deferred)
- Out of Scope (explicit exclusions)
- Traceability section (empty, filled by roadmap)

**REQ-ID format:** `[CATEGORY]-[NUMBER]` continuing from existing numbering.

Present full requirements list for user confirmation.

Commit via `gsd_commit`.

### Step N7: Create Roadmap

Read `.github/agents/gsd-roadmapper.agent.md` and delegate roadmap creation.

**Starting phase number:** continues from last milestone (v1.0 ended at phase 5 → v1.1 starts at phase 6).

Roadmapper creates ROADMAP.md, updates STATE.md, updates REQUIREMENTS.md traceability. Present proposed roadmap for user approval.

If adjustments needed, re-delegate with revision context until approved.

Commit via `gsd_commit`.

### Step N8: Done

```
✅ Milestone v{version}: {name} initialized

| Artifact     | Location                   |
|--------------|----------------------------|
| Project      | .planning/PROJECT.md       |
| Research     | .planning/research/        |
| Requirements | .planning/REQUIREMENTS.md  |
| Roadmap      | .planning/ROADMAP.md       |

[N] phases | [X] requirements | Ready to build

▶ Next: /gsd-discuss-phase [first-phase-number]
```

---

## Key Principles

- **Audit before completing.** Always recommend audit if no audit file exists.
- **Archive before deleting.** Create archive files before modifying/deleting originals.
- **Phase numbering continues.** Never restart at 01 across milestones.
- **3-source requirements verification.** VERIFICATION.md + SUMMARY.md frontmatter + REQUIREMENTS.md traceability.
- **Retrospective is a living document.** Append each milestone, update cross-milestone trends.
