---
mode: agent
description: "Analyze codebase and produce structured documentation in .planning/codebase/"
---

Analyze existing codebase to produce structured documents in `.planning/codebase/`. Runs 4 sequential mapping passes (tech, architecture, quality, concerns) producing 7 documents.

**Arguments:** `$ARGUMENTS` (optional — specific area to focus on, e.g., "Focus on the src/ directory")

**Output:** `.planning/codebase/` folder with 7 structured documents:
- `STACK.md` — Languages, runtime, frameworks, dependencies
- `INTEGRATIONS.md` — External APIs, databases, auth providers
- `ARCHITECTURE.md` — Patterns, layers, data flow, entry points
- `STRUCTURE.md` — Directory layout, key locations, naming conventions
- `CONVENTIONS.md` — Code style, naming, error handling patterns
- `TESTING.md` — Test framework, structure, mocking, coverage
- `CONCERNS.md` — Technical debt, bugs, security, fragile areas

## Process

Read and follow the complete workflow defined in `.github/skills/gsd-map-codebase/SKILL.md`.

The skill defines 6 steps:

1. **Check preconditions** — Check if `.planning/codebase/` exists; offer Refresh/Update/Skip if it does
2. **Create codebase directory** — Create `.planning/codebase/`
3. **Execute 4 mapper focuses** — For each focus (tech, arch, quality, concerns): read the agent definition at `.github/agents/gsd-codebase-mapper.agent.md`, explore the codebase for that focus area, and write the corresponding documents using templates from `.github/skills/gsd-map-codebase/templates/codebase/`
4. **Verify all documents** — Confirm all 7 files exist and are non-empty
5. **Commit** — Use `gsd_commit` MCP tool
6. **Present completion** — Show file summary and suggest next steps

If `$ARGUMENTS` contains a focus area, pass it to each mapper focus so they concentrate on that subsystem.
