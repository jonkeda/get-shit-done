# Research Template

Template for `.planning/phases/XX-name/{phase_num}-RESEARCH.md`.

**Purpose:** Document what needs to be known to implement a phase well — standard approaches, pitfalls, and verified patterns.

---

```markdown
# Phase [X]: [Name] - Research

**Researched:** [date]
**Domain:** [primary technology/problem domain]
**Confidence:** [HIGH/MEDIUM/LOW]

<user_constraints>
## User Constraints (from CONTEXT.md)

**CRITICAL:** If CONTEXT.md exists, copy locked decisions here verbatim. These MUST be honored by the planner.

### Locked Decisions
[Copy from CONTEXT.md `## Decisions` section — NON-NEGOTIABLE]
- [Decision 1]
- [Decision 2]

### Claude's Discretion
[Copy from CONTEXT.md — areas where researcher/planner can choose]
- [Area 1]

### Deferred Ideas (OUT OF SCOPE)
[Copy from CONTEXT.md — do NOT research or plan these]
- [Deferred 1]

**If no CONTEXT.md exists:** Write "No user constraints — all decisions at Claude's discretion"
</user_constraints>

<research_summary>
## Summary

[2-3 paragraph executive summary]
- What was researched
- What the standard approach is
- Key recommendations

**Primary recommendation:** [one-liner actionable guidance]
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| [name] | [ver] | [what it does] | [why experts use it] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| [name] | [ver] | [what it does] | [use case] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| [standard] | [alternative] | [when alternative makes sense] |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
src/
├── [folder]/        # [purpose]
└── [folder]/        # [purpose]
```

### Pattern 1: [Pattern Name]
**What:** [description]
**When to use:** [conditions]
**Example:**
```typescript
// [code example from official docs]
```

### Anti-Patterns to Avoid
- **[Anti-pattern]:** [why bad, what to do instead]
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| [problem] | [what you'd build] | [library] | [edge cases, complexity] |
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: [Name]
**What goes wrong:** [description]
**Why it happens:** [root cause]
**How to avoid:** [prevention strategy]
</common_pitfalls>

<code_examples>
## Code Examples

### [Common Operation 1]
```typescript
// Source: [official docs]
[code]
```
</code_examples>

<sota_updates>
## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| [old] | [new] | [date/version] | [what it means] |
</sota_updates>

<open_questions>
## Open Questions

1. **[Question]**
   - What we know: [partial info]
   - Recommendation: [how to handle during planning]
</open_questions>
```

---

## Completion Markers

End research with one of:
- `## RESEARCH COMPLETE` — Sufficient information gathered
- `## RESEARCH BLOCKED` — Cannot proceed without user input
- `## RESEARCH INCONCLUSIVE` — Partial information, needs different approach
