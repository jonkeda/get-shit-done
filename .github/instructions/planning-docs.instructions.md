---
applyTo: ".planning/**"
---

These are GSD planning documents. Follow these rules:

## STATE.md-First Rule
Before performing ANY GSD operation, read `.planning/STATE.md` first. It contains current position, blockers, and session context.

## Frontmatter Format
All planning documents use YAML frontmatter delimited by `---`. Never modify frontmatter manually — use `gsd_frontmatter_set` or `gsd_frontmatter_merge` MCP tools.

## File Naming
- `.planning/phases/{NN}-{slug}/` — Phase directories (zero-padded number + kebab-case name)
- `{NN}-CONTEXT.md` — User decisions for phase NN
- `{NN}-RESEARCH.md` — Research findings
- `{NN}-{MM}-PLAN.md` — Execution plan MM in phase NN
- `{NN}-{MM}-SUMMARY.md` — Execution results for plan MM
- `{NN}-VALIDATION.md` — Plan verification results
- `{NN}-VERIFICATION.md` — Post-execution verification
- `{NN}-UAT.md` — User acceptance testing

## Context Fidelity
- Never invent requirements — work only from ROADMAP.md phase goals and PLAN.md tasks.
- Never assume technology choices — check CONTEXT.md and PROJECT.md first.
- Never skip verification — every claim in SUMMARY.md must be verifiable against actual code.

## MCP Tools
Use GSD MCP tools for all state management: `gsd_state_*`, `gsd_roadmap_*`, `gsd_phase_*`, `gsd_frontmatter_*`, `gsd_commit`.
