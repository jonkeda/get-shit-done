---
template: context
output: "{phase_dir}/{padded_phase}-CONTEXT.md"
---

# Phase Context Template

Captures implementation decisions for a phase. Categories emerge from what was actually discussed — not predefined.

**Downstream consumers:**
- `gsd-phase-researcher` — Reads decisions to focus research (e.g., "card layout" → research card component patterns)
- `gsd-planner` — Reads decisions to create specific tasks (e.g., "infinite scroll" → task includes virtualization)

---

## Template

```markdown
---
phase: {phase_number}
gathered: {date}
status: ready-for-planning
---

# Phase {phase_number}: {phase_name} - Context

**Gathered:** {date}
**Status:** Ready for planning

<domain>
## Phase Boundary

{Clear statement of what this phase delivers — the scope anchor. Comes from ROADMAP.md and is fixed. Discussion clarified implementation within this boundary.}

</domain>

<decisions>
## Implementation Decisions

### {Area 1 that was discussed}
- {Specific decision made}
- {Another decision if applicable}

### {Area 2 that was discussed}
- {Specific decision made}

### {Area 3 that was discussed}
- {Specific decision made}

### Claude's Discretion
{Areas where user explicitly said "you decide" — Claude has flexibility here during planning/implementation.}

</decisions>

<specifics>
## Specific Ideas

{Any particular references, examples, or "I want it like X" moments from discussion. Product references, specific behaviors, interaction patterns.}

{If none: "No specific requirements — open to standard approaches"}

</specifics>

<deferred>
## Deferred Ideas

{Ideas that came up during discussion but belong in other phases. Captured here so they're not lost, but explicitly out of scope for this phase.}

{If none: "None — discussion stayed within phase scope"}

</deferred>

---

*Phase: {padded_phase}-{phase_slug}*
*Context gathered: {date}*
```

## Field Reference

| Placeholder | Source | Example |
|---|---|---|
| `{phase_number}` | From `$ARGUMENTS` | `3` |
| `{phase_name}` | From `gsd_roadmap_get_phase` | `Post Feed` |
| `{padded_phase}` | From `gsd_find_phase` | `03` |
| `{phase_slug}` | From `gsd_find_phase` | `post-feed` |
| `{date}` | Current date | `2026-02-24` |

## Section Rules

- **Phase Boundary:** Copied from ROADMAP.md. Never modified by discussion.
- **Implementation Decisions:** One subsection per gray area discussed. Decisions are specific and actionable — "Card-based layout with shadows" not "some layout."
- **Claude's Discretion:** Only areas the user explicitly deferred. Not a dumping ground.
- **Specific Ideas:** Verbatim references and preferences. "I like how Twitter shows new posts indicator" is valuable context.
- **Deferred Ideas:** Scope creep captured during discussion. Note which future phase it belongs to if known.
