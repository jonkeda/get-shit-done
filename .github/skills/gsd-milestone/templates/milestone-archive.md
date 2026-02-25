---
template: milestone-archive
output: ".planning/milestones/v{version}-ROADMAP.md"
---

# Milestone Archive Template

Used by the complete-milestone flow to create archive files in `.planning/milestones/`.

---

## Template

```markdown
# Milestone v{VERSION}: {MILESTONE_NAME}

**Status:** SHIPPED {DATE}
**Phases:** {PHASE_START}-{PHASE_END}
**Total Plans:** {TOTAL_PLANS}

## Overview

{MILESTONE_DESCRIPTION}

## Phases

{For each phase in this milestone:}

### Phase {PHASE_NUM}: {PHASE_NAME}

**Goal:** {PHASE_GOAL}
**Depends on:** {DEPENDS_ON}
**Plans:** {PLAN_COUNT} plans

Plans:
- [x] {PHASE}-01: {PLAN_DESCRIPTION}
- [x] {PHASE}-02: {PLAN_DESCRIPTION}

**Details:**
{PHASE_DETAILS_FROM_ROADMAP}

{For decimal phases, include (INSERTED) marker:}

### Phase {N}.1: {NAME} (INSERTED)

**Goal:** {GOAL}
**Depends on:** Phase {N}
**Plans:** {PLAN_COUNT} plan(s)

Plans:
- [x] {PHASE}-01: {PLAN_DESCRIPTION}

**Details:**
{PHASE_DETAILS_FROM_ROADMAP}

---

## Milestone Summary

**Decimal Phases:**
{List any inserted phases with rationale}

**Key Decisions:**
{Decisions from PROJECT.md and SUMMARY files with rationale}

**Issues Resolved:**
{Issues resolved during this milestone}

**Issues Deferred:**
{Issues deferred to future milestones}

**Technical Debt Incurred:**
{Shortcuts taken that need future work}

---

_For current project status, see .planning/ROADMAP.md_
```

## Field Reference

| Placeholder | Source |
|---|---|
| `{VERSION}` | From user argument (e.g., "1.0") |
| `{MILESTONE_NAME}` | From ROADMAP.md milestone header |
| `{DATE}` | Current date |
| `{PHASE_START}`, `{PHASE_END}` | First and last phase numbers |
| `{TOTAL_PLANS}` | Sum of all phase plan counts |
| `{MILESTONE_DESCRIPTION}` | From ROADMAP.md or PROJECT.md |
| `{PHASE_*}` | From ROADMAP.md phase sections |
| `{DEPENDS_ON}` | From ROADMAP.md phase dependencies |
| `{PLAN_DESCRIPTION}` | From plan file names/headers |

## Archive Location

Save to `.planning/milestones/v{VERSION}-ROADMAP.md`

Examples:
- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.1-ROADMAP.md`
