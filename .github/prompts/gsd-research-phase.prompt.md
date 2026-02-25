---
mode: agent
description: "Deep ecosystem research for a phase (standalone)"
tools: [read, search, web, execute, agent]
---

Research how to implement a phase. Standalone research command — for most workflows, use `/gsd-plan-phase` which integrates research automatically.

**Use when:**
- You want to research without planning yet
- You want to re-research after planning
- You need to investigate feasibility before committing

**Arguments:** `$ARGUMENTS` (phase number — required)

## Process

### 1. Initialize

Call `gsd_init_phase_op` MCP tool with the phase number from arguments.

Extract: `phase_dir`, `phase_number`, `phase_name`, `phase_found`, `commit_docs`, `has_research`, `state_path`, `requirements_path`, `context_path`, `research_path`.

If no argument provided:
```
ERROR: Phase number required
Usage: /gsd-research-phase [phase]
Example: /gsd-research-phase 3
```
Exit.

### 2. Validate Phase

Call `gsd_roadmap_get_phase` MCP tool with the phase number.

If `found` is false: error and exit.
If `found` is true: extract `phase_number`, `phase_name`, `goal`.

### 3. Check Existing Research

Check if RESEARCH.md exists in the phase directory.

If exists, offer:
1. **Update research** — re-run with fresh data
2. **View existing** — display current research
3. **Skip** — exit

### 4. Conduct Research

Read the agent instructions from `.github/agents/gsd-phase-researcher.agent.md`.

Acting as the phase researcher, investigate:

- **What's the established architecture pattern?** for this type of work
- **What libraries form the standard stack?** including current best choices
- **What problems do people commonly hit?** gotchas and pitfalls
- **What's state-of-the-art?** vs what might be outdated knowledge
- **What should NOT be hand-rolled?** use established solutions

Use available search and web tools to gather current ecosystem knowledge.

Context files to reference:
- `{context_path}` — user decisions from `/gsd-discuss-phase`
- `{requirements_path}` — project requirements
- `{state_path}` — project decisions and history

### 5. Write Research

Write findings to `.planning/phases/{phase_dir}/{padded}-RESEARCH.md` following the research template structure:
- Executive summary
- Ecosystem landscape
- Recommended approach
- Key risks and mitigations
- Decision points for planning

### 6. Commit

Use `gsd_commit` MCP tool:
- Message: `docs(planning): phase {N} research complete`
- Files: the research file path

### 7. Present Results

Display research summary and offer next steps:
- `/gsd-plan-phase {N}` — create execution plan using research
- **Dig deeper** — research a specific area further
- **Review** — walk through findings
- **Done** — exit
