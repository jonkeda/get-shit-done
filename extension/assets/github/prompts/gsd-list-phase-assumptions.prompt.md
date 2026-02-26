---
mode: agent
description: "Surface assumptions about a phase approach before planning"
tools: [read, execute, search]
---

Analyze a phase and present assumptions about technical approach, implementation order, scope boundaries, risk areas, and dependencies. Conversational only — no file creation.

**Arguments:** `$ARGUMENTS` (phase number — required)

## Process

### 1. Validate Phase

If no argument:
```
Error: Phase number required.
Usage: /gsd-list-phase-assumptions [phase-number]
Example: /gsd-list-phase-assumptions 3
```
Exit.

Read `.planning/ROADMAP.md` and verify the phase exists. If not found, list available phases and exit.

Parse: phase number, name, description/goal, scope details.

### 2. Gather Context

Read:
- `.planning/ROADMAP.md` — phase description and dependencies
- `.planning/STATE.md` — project decisions and history
- `.planning/PROJECT.md` — project vision and constraints

### 3. Analyze and Surface Assumptions

Present assumptions across five areas with confidence levels:

```
## My Assumptions for Phase {N}: {Phase Name}

### Technical Approach
[What libraries, frameworks, patterns would be used and why]
- Fairly confident: [clear from roadmap]
- Assuming: [reasonable inference]
- Unclear: [could go multiple ways]

### Implementation Order
[What to build first, second, third and why]

### Scope Boundaries
**In scope:** [what's included]
**Out of scope:** [what's excluded]
**Ambiguous:** [could go either way]

### Risk Areas
[Anticipated challenges and complexity]

### Dependencies
**From prior phases:** [what's needed]
**External:** [third-party needs]
**Feeds into:** [what future phases need from this]

---

**What do you think?**

Are these assumptions accurate? Let me know:
- What I got right
- What I got wrong
- What I'm missing
```

### 4. Gather Feedback

If user provides corrections, acknowledge and summarize new understanding.
If user confirms, note assumptions validated.

### 5. Offer Next Steps

```
What's next?
1. Discuss context (`/gsd-discuss-phase {N}`) — build comprehensive context
2. Plan this phase (`/gsd-plan-phase {N}`) — create execution plans
3. Re-examine assumptions — analyze again with corrections
4. Done for now
```
