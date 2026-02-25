---
mode: agent
description: "Initialize a new GSD project with questioning, research, requirements, and roadmap"
---

Initialize a new GSD project. Interviews the user about their project, optionally researches the domain, then generates requirements and a phased roadmap.

**Arguments:** `$ARGUMENTS` (optional flags)
- `--auto @file.md` — Auto-mode using an idea document (skip interview)
- No arguments — interactive interview mode

**Creates:**
- `.planning/PROJECT.md` — Project context and vision
- `.planning/config.json` — Workflow preferences
- `.planning/research/` — Domain research (optional)
- `.planning/REQUIREMENTS.md` — Scoped requirements with REQ-IDs
- `.planning/ROADMAP.md` — Phase structure with goals and success criteria
- `.planning/STATE.md` — Project memory and current position

## Process

Read and follow the complete workflow defined in `.github/skills/gsd-new-project/SKILL.md`.

The skill covers:

1. **Check preconditions** — Error if project already initialized
2. **Configure workflow** — Set model profile and workflow toggles via `gsd_config_set`
3. **Interview user** (or parse idea doc in `--auto` mode) — Gather project vision, constraints, tech stack, scope
4. **Domain research** (optional) — Spawn research agents for ecosystem analysis
5. **Generate requirements** — Create REQUIREMENTS.md with REQ-IDs and traceability
6. **Generate roadmap** — Create ROADMAP.md with phases, goals, and requirement mappings
7. **Create STATE.md** — Initialize project tracking state
8. **Commit** — Atomic commit of all planning docs

**After this command:** Run `/gsd-discuss-phase 1` or `/gsd-plan-phase 1`.
