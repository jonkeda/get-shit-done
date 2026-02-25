# Roadmap Workflow Reference

Roadmap creation delegation protocol for `/gsd-new-project`.

## Overview

Transform requirements into a phased roadmap with success criteria, requirement mappings, and progress tracking.

## Inputs

- `.planning/PROJECT.md` — Project context
- `.planning/REQUIREMENTS.md` — v1 requirements with REQ-IDs
- `.planning/research/SUMMARY.md` — Research findings (if exists)
- `.planning/config.json` — Depth and mode settings

## Process

### 1. Load agent role

Read `.github/agents/gsd-roadmapper.agent.md` (if exists) to load the roadmapper's role and methodology. Then, acting as the roadmapper:

### 2. Read all context files

Load PROJECT.md, REQUIREMENTS.md, research SUMMARY.md (if exists), and config.json.

### 3. Derive phases

- Derive phases from requirements — don't impose a predefined structure
- Group related requirements into coherent phases
- Each phase delivers something useful on its own
- Respect dependency order (auth before features that need auth, etc.)

**Phase count by depth setting:**
- Quick: 3-5 phases
- Standard: 5-8 phases
- Comprehensive: 8-12 phases

### 4. Map requirements

- Every v1 requirement maps to exactly one phase
- Validate 100% coverage (no unmapped requirements)
- Note any gaps

### 5. Define success criteria

- 2-5 observable behaviors per phase (from user's perspective)
- Format: "User can [action]" or "[Thing] works/exists"
- Cross-checked against requirements
- These flow downstream to `must_haves` during planning

### 6. Write ROADMAP.md

Use template at `.github/skills/gsd-new-project/templates/roadmap.md`.

Write ROADMAP.md immediately (don't draft — write to file first, then present).

### 7. Present to user

Show roadmap as summary table:

```
## Proposed Roadmap

**{N} phases** | **{X} requirements mapped** | All v1 requirements covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | {Name} | {Goal} | {REQ-IDs} | {count} |
...

### Phase Details

**Phase 1: {Name}**
Goal: {goal}
Requirements: {REQ-IDs}
Success criteria:
1. {criterion}
2. {criterion}
...
```

### 8. Approval gate

**Auto mode:** Skip — auto-approve.

**Interactive mode:**

```
use_tool(vscode_askQuestions, {
  questions: [{
    header: "Roadmap",
    question: "Does this roadmap structure work for you?",
    options: [
      { label: "Approve", description: "Commit and continue" },
      { label: "Adjust phases", description: "Tell me what to change" },
      { label: "Review full file", description: "Show raw ROADMAP.md" }
    ]
  }]
})
```

If "Adjust phases": Get feedback, revise, re-present. Loop until approved.
If "Review full file": Show raw content, then re-ask.

### 9. Commit

```
use_tool(gsd_commit, {
  message: "docs: create roadmap ({N} phases)",
  files: [".planning/ROADMAP.md", ".planning/STATE.md", ".planning/REQUIREMENTS.md"]
})
```

## Phase Detail Format

Each phase in ROADMAP.md follows this structure:

```markdown
### Phase {N}: {Name}
**Goal**: {What this phase delivers}
**Depends on**: {Previous phase or "Nothing"}
**Requirements**: {REQ-IDs}
**Success Criteria** (what must be TRUE):
  1. {Observable behavior}
  2. {Observable behavior}
**Plans**: {count or "TBD"}

Plans:
- [ ] {NN}-01: {Brief description}
- [ ] {NN}-02: {Brief description}
```

## Status Values

- `Not started` — Haven't begun
- `In progress` — Currently working
- `Complete` — Done (add completion date)
- `Deferred` — Pushed to later (with reason)
