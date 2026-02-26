---
template: retrospective
output: ".planning/RETROSPECTIVE.md"
---

# Retrospective Template

A living document updated after each milestone. Lessons feed forward into future planning.

---

## Template (New File)

```markdown
# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v{version} — {name}

**Shipped:** {date}
**Phases:** {phase_count} | **Plans:** {plan_count}

### What Was Built
- {Key deliverable 1 — from SUMMARY.md one-liners}
- {Key deliverable 2}
- {Key deliverable 3}

### What Worked
- {Efficiency win or successful pattern}
- {What went smoothly}

### What Was Inefficient
- {Missed opportunity}
- {What took longer than expected}

### Patterns Established
- {New pattern or convention that should persist}

### Key Lessons
1. {Specific, actionable lesson}
2. {Another lesson}

### Cost Observations
- Model mix: {X}% opus, {Y}% sonnet, {Z}% haiku
- Sessions: {count}
- Notable: {efficiency observation}

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v{X} | {N} | {M} | {What changed in process} |

### Cumulative Quality

| Milestone | Tests | Coverage | Key Metric |
|-----------|-------|----------|------------|
| v{X} | {N} | {Y}% | {notable metric} |

### Top Lessons (Verified Across Milestones)

1. {Lesson verified by multiple milestones}
2. {Another cross-validated lesson}
```

## Template (Append to Existing)

When RETROSPECTIVE.md already exists, insert the new milestone section **before** the "## Cross-Milestone Trends" section, then update the trends tables with new data.

```markdown
## Milestone: v{version} — {name}

**Shipped:** {date}
**Phases:** {phase_count} | **Plans:** {plan_count}

### What Was Built
- {Key deliverable from SUMMARY.md}

### What Worked
- {Pattern that led to smooth execution}

### What Was Inefficient
- {Bottleneck or rework}

### Patterns Established
- {New convention}

### Key Lessons
1. {Actionable takeaway}

### Cost Observations
- Model mix: {percentages}
- Sessions: {count}
```

## Data Sources

| Section | Source |
|---|---|
| What Was Built | SUMMARY.md one-liners for each phase |
| What Worked | Reflect on execution — smooth phases, good patterns |
| What Was Inefficient | Rework, context resets, missed opportunities |
| Patterns Established | New conventions discovered during milestone |
| Key Lessons | Specific, actionable takeaways |
| Cost Observations | Session count, model usage patterns |
| Cross-Milestone Trends | Accumulated from all milestone sections |
