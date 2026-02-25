# Phase 7: Missing Prompt Files, Test Gaps, and Completeness Audit

**Goal:** Fix the critical discoverability gap where 9 skill-based workflows have no `/gsd-*` slash command, add structural validation tests to prevent recurrence, and audit for any other missing pieces.

**Prior phase:** Phase 6 review scored 97/100 and declared the port "release-ready." This phase addresses a blind spot that review didn't catch: skills ≠ commands without prompt files.

---

## Problem Statement

The 9 most complex GSD workflows (map-codebase, new-project, plan-phase, execute-phase, discuss-phase, verify-work, quick, debug, milestone) were ported as `.github/skills/gsd-*/SKILL.md` files but **no corresponding `.github/prompts/gsd-*.prompt.md` files were created.**

In VS Code Copilot, skills provide detailed workflow instructions but are only activated when:
- The skill's `applyTo` pattern matches a file context, or  
- Another prompt/agent references the skill, or  
- The user mentions it by name in chat (unreliable)

Without a `.prompt.md` file, there is **no `/gsd-map-codebase` slash command** in the Copilot UI. Users literally cannot discover or invoke these workflows.

### How did this happen?

The Phase 6 review states: "17 prompts + 9 skills = 26 Copilot entry points covering 28 of 31 source commands." This is technically accurate — skills *are* entry points. But the review didn't validate that those entry points are **user-invocable**. The Phase 1–5 porting work created skills with full SKILL.md content and assumed Copilot would treat them as commands, analogous to how Claude Code's `commands/gsd/*.md` files automatically become slash commands.

**Claude Code model:** `commands/gsd/map-codebase.md` → automatically becomes `/gsd:map-codebase`  
**Copilot model:** `.github/prompts/gsd-map-codebase.prompt.md` → becomes `/gsd-map-codebase`  
**What we have:** `.github/skills/gsd-map-codebase/SKILL.md` → NOT a slash command

### Why didn't tests catch it?

The test suite (391 tests) validates **runtime behavior** of MCP tools and lib modules. There are zero tests that check:
- Whether prompt files exist for commands
- Whether skill directories have matching prompts
- Whether copilot-instructions.md lists all available commands
- Whether the installer produces a complete set of entry points

---

## Part 1: Create Missing Prompt Files

### Prompt file pattern

Every prompt file follows this structure (from existing files like `gsd-progress.prompt.md`):

```yaml
---
mode: agent          # optional — needed for complex multi-step workflows
description: "Brief description shown in Copilot UI"
---

One-line description of what the command does.

**Arguments:** `$ARGUMENTS` (description of expected arguments, if any)

## Steps

1. **Step name**: Description of what to do
   - Call `mcp_tool_name` with params
   - Handle result

2. **Next step**: ...
```

### Files to create

Each prompt file should be a **thin router** that loads state, calls the skill's workflow steps, and handles errors. The skill SKILL.md already contains the full workflow logic — the prompt file just needs to bootstrap it.

#### Step 1.1: `gsd-map-codebase.prompt.md`

**Source skill:** `.github/skills/gsd-map-codebase/SKILL.md` (182 lines)  
**Source command:** `commands/gsd/map-codebase.md`

```yaml
---
mode: agent
description: "Analyze codebase with parallel mapper agents to produce .planning/codebase/ documents"
---
```

Body should:
1. Reference the SKILL.md for full workflow
2. Accept optional `$ARGUMENTS` for focus area
3. Route through the skill's 6 steps: check preconditions → create directory → run 4 mapper focuses → verify → commit

#### Step 1.2: `gsd-new-project.prompt.md`

**Source skill:** `.github/skills/gsd-new-project/SKILL.md` (428 lines)  
**Source command:** `commands/gsd/new-project.md`

```yaml
---
mode: agent
description: "Initialize a new GSD project with questioning, research, requirements, and roadmap"
---
```

Body should:
1. Reference the SKILL.md for full workflow
2. Route through: detect existing → interview user → research → requirements → roadmap → commit

#### Step 1.3: `gsd-discuss-phase.prompt.md`

**Source skill:** `.github/skills/gsd-discuss-phase/SKILL.md` (110 lines)  
**Source command:** `commands/gsd/discuss-phase.md`

```yaml
---
mode: agent
description: "Interactive discussion to gather user preferences and decisions for a phase"
---
```

Body should:
1. Parse phase number from `$ARGUMENTS`
2. Reference the SKILL.md for the discussion flow
3. Produce CONTEXT.md in the phase directory

#### Step 1.4: `gsd-plan-phase.prompt.md`

**Source skill:** `.github/skills/gsd-plan-phase/SKILL.md` (78 lines)  
**Source command:** `commands/gsd/plan-phase.md`

```yaml
---
mode: agent
description: "Research, plan, and verify a phase — produces RESEARCH.md, PLAN.md files, and VALIDATION.md"
---
```

Body should:
1. Parse phase number from `$ARGUMENTS`
2. Handle `--skip-research` and `--prd <file>` flags
3. Reference the SKILL.md for the planning pipeline
4. Route through: init → research → plan → validate

#### Step 1.5: `gsd-execute-phase.prompt.md`

**Source skill:** `.github/skills/gsd-execute-phase/SKILL.md` (96 lines)  
**Source command:** `commands/gsd/execute-phase.md`

```yaml
---
mode: agent
description: "Execute phase plans in wave order with atomic commits, deviation handling, and verification"
---
```

Body should:
1. Parse phase number from `$ARGUMENTS`
2. Reference the SKILL.md for execution workflow
3. Route through: init → find plans → execute each plan → verify → update state

#### Step 1.6: `gsd-verify-work.prompt.md`

**Source skill:** `.github/skills/gsd-verify-work/SKILL.md` (98 lines)  
**Source command:** `commands/gsd/verify-work.md`

```yaml
---
mode: agent
description: "Interactive UAT verification — walk through deliverables, diagnose failures, create fix plans"
---
```

Body should:
1. Parse phase number from `$ARGUMENTS`
2. Reference the SKILL.md for UAT workflow
3. Walk through verification criteria interactively

#### Step 1.7: `gsd-quick.prompt.md`

**Source skill:** `.github/skills/gsd-quick/SKILL.md` (208 lines)  
**Source command:** `commands/gsd/quick.md`

```yaml
---
mode: agent
description: "Execute a quick task with GSD guarantees (atomic commits, state tracking)"
---
```

Body should:
1. Parse task description from `$ARGUMENTS`
2. Reference the SKILL.md for quick task workflow
3. Route through: scaffold → plan → execute → commit → summarize

#### Step 1.8: `gsd-debug.prompt.md`

**Source skill:** `.github/skills/gsd-debug/SKILL.md` (94 lines)  
**Source command:** `commands/gsd/debug.md`

```yaml
---
mode: agent
description: "Scientific debugging with persistent sessions — hypothesis → experiment → conclusion"
---
```

Body should:
1. Parse bug description from `$ARGUMENTS`
2. Reference the SKILL.md for debug workflow
3. Create or resume debug session

#### Step 1.9: `gsd-audit-milestone.prompt.md`

**Source skill:** `.github/skills/gsd-milestone/SKILL.md` → Audit Flow  
**Source command:** `commands/gsd/audit-milestone.md`

```yaml
---
mode: agent
description: "Audit milestone — verify cross-phase integration and requirement coverage"
---
```

Body should route to gsd-milestone skill's Audit Flow.

#### Step 1.10: `gsd-complete-milestone.prompt.md`

**Source skill:** `.github/skills/gsd-milestone/SKILL.md` → Complete Flow  
**Source command:** `commands/gsd/complete-milestone.md`

```yaml
---
mode: agent
description: "Complete and archive the current milestone"
---
```

Body should route to gsd-milestone skill's Complete Flow.

#### Step 1.11: `gsd-new-milestone.prompt.md`

**Source skill:** `.github/skills/gsd-milestone/SKILL.md` → New Flow  
**Source command:** `commands/gsd/new-milestone.md`

```yaml
---
mode: agent
description: "Start a new milestone with scope definition and roadmap"
---
```

Body should route to gsd-milestone skill's New Milestone Flow.

### Design decision: Prompt as thin router vs. duplicated workflow

The prompt files should NOT duplicate the SKILL.md content. Instead, they should:
1. Provide the YAML frontmatter (mode, description) for Copilot registration
2. State the command purpose in 1-2 sentences
3. Say "Read and follow the workflow in `.github/skills/gsd-{name}/SKILL.md`"
4. Add argument parsing that the skill might not handle standalone

This keeps the SKILL.md as the single source of truth. If both prompt and skill contain workflow steps, they'll drift apart.

---

## Part 2: Update copilot-instructions.md

### Step 2.1: Update the GSD Commands section

The current section lists only 13 commands. Update to list all 26 Copilot entry points, organized by category:

```markdown
## GSD Commands

### Project Lifecycle
- `/gsd-new-project` — Initialize a new GSD project
- `/gsd-map-codebase` — Analyze existing codebase
- `/gsd-progress` — Check project status and route to next action
- `/gsd-new-milestone` — Start a new milestone

### Phase Workflow
- `/gsd-discuss-phase N` — Gather preferences for phase N
- `/gsd-plan-phase N` — Research and plan phase N
- `/gsd-execute-phase N` — Execute phase N plans
- `/gsd-verify-work N` — Verify phase N deliverables
- `/gsd-research-phase N` — Deep research for phase N (standalone)

### Phase Management
- `/gsd-add-phase "description"` — Append phase to roadmap
- `/gsd-remove-phase N` — Remove a future phase
- `/gsd-insert-phase N "description"` — Insert urgent work
- `/gsd-list-phase-assumptions N` — List assumptions for phase N

### Quick Operations
- `/gsd-quick "description"` — Execute a quick task
- `/gsd-debug "description"` — Scientific debugging
- `/gsd-add-todo "description"` — Capture task for later
- `/gsd-check-todos` — List pending todos

### Milestone Completion
- `/gsd-audit-milestone` — Audit milestone completeness
- `/gsd-complete-milestone` — Archive and complete milestone
- `/gsd-plan-milestone-gaps` — Plan fixes for audit gaps

### Session & Config
- `/gsd-pause-work` — Save context for later
- `/gsd-resume-work` — Resume from previous session
- `/gsd-settings` — Configure GSD workflow
- `/gsd-set-profile [quality|balanced|budget]` — Switch model profile
- `/gsd-health` — Check installation health
- `/gsd-cleanup` — Clean stale planning files
- `/gsd-update` — Check for updates
- `/gsd-help` — Show all commands
```

### Step 2.2: Update installer

The installer (`bin/copilot-install.js`) copies `.github/prompts/gsd-*.prompt.md` files. The new files will be picked up automatically since they follow the `gsd-*.prompt.md` naming pattern — no installer code changes needed. Verify this.

---

## Part 3: Structural Validation Tests

### Why this matters

The test suite has 391 tests but zero that validate the **completeness** of the Copilot installation. This is how 9 missing prompt files went undetected through 6 phases of review.

### Step 3.1: Create `tests/copilot-structure.test.cjs`

New test file with structural validation tests:

#### Test group: Prompt file inventory

```
- Every skill directory must have a matching prompt file
  (except skills explicitly marked as non-invocable)
- Every prompt file must have valid YAML frontmatter with 'description'
- Every prompt file with mode: agent must reference MCP tools or a skill
- Prompt files must follow gsd-*.prompt.md naming convention
```

#### Test group: Skill directory structure

```
- Every skill directory must contain SKILL.md
- SKILL.md must have valid YAML frontmatter with 'name' and 'description'
- Skill templates/ directory (if exists) must have non-empty files
```

#### Test group: Agent file validation

```
- Every agent file must have valid YAML frontmatter with 'description'
- Agent files must follow gsd-*.agent.md naming convention
```

#### Test group: copilot-instructions.md completeness

```
- Every prompt file should be mentioned in copilot-instructions.md
- copilot-instructions.md should not reference commands that don't exist as prompts
```

#### Test group: Cross-reference consistency

```
- Commands listed in gsd-help.prompt.md match actual prompt files
- Skills referenced by prompt files exist
- Agents referenced by skills exist
```

### Step 3.2: Create `tests/copilot-installer.test.cjs` (or extend existing)

Test that the installer correctly copies all expected files:

```
- After fresh install, all prompt files exist in target .github/prompts/
- After fresh install, all skill directories exist in target .github/skills/
- After fresh install, all agent files exist in target .github/agents/
- --uninstall removes all prompt, skill, and agent files
```

### Step 3.3: Update existing tests

- Add a test to `copilot-commands.test.cjs` (or the new structure test file) that validates the commands listed in `copilot-instructions.md` actually have prompt files.

---

## Part 4: Other Missing Pieces Audit

### Step 4.1: Verify gsd-help.prompt.md lists all commands

Read the current `gsd-help.prompt.md` and ensure it generates a help listing that includes all 26+ commands. If it reads prompt files dynamically, it should pick up the new ones automatically. If it has a hard-coded list, update it.

### Step 4.2: Check installer post-install verification

The installer has a post-install verification step that checks "4 critical files." Verify this list includes at least one prompt file and one skill directory. Consider expanding verification to check all prompt files exist.

### Step 4.3: Agent frontmatter cleanup (P2 from Phase 6)

Phase 6 flagged 2 agents with Claude-style `tools:` frontmatter:
- `gsd-project-researcher.agent.md` — has `tools: [read, execute, search, web, createFile]`
- `gsd-integration-checker.agent.md` — has `tools: [read, execute, search, createFile]`

These should use Copilot-recognized tool names or remove the `tools:` field if Copilot ignores it.

### Step 4.4: Verify the guide document accuracy

The guide at `.my/docs/gsd-guide-maui-port.md` references `/gsd-map-codebase` as a command. Once prompt files are created, verify the guide's command syntax matches the actual prompt descriptions.

---

## Execution Order

| Step | Description | Depends On | Est. Files |
|------|-------------|------------|-----------|
| 1.1–1.11 | Create 11 prompt files | — | 11 new files |
| 2.1 | Update copilot-instructions.md | 1.* | 1 modified file |
| 2.2 | Verify installer picks up new prompts | 1.* | 0 (verification only) |
| 3.1 | Create copilot-structure.test.cjs | 1.* | 1 new file |
| 3.2 | Create/extend installer tests | 1.* | 1 new or modified file |
| 3.3 | Update existing test cross-refs | 3.1 | 1 modified file |
| 4.1 | Verify gsd-help.prompt.md | 1.* | 0–1 modified file |
| 4.2 | Check installer verification | 2.2 | 0–1 modified file |
| 4.3 | Fix agent frontmatter (P2) | — | 2 modified files |
| 4.4 | Verify guide accuracy | 1.* | 0 (verification only) |

### Wave structure

**Wave 1 (parallel):** Steps 1.1–1.11, 4.3 — all independent file creation/edits  
**Wave 2 (parallel):** Steps 2.1, 2.2, 4.1, 4.4 — depend on prompt files existing  
**Wave 3 (parallel):** Steps 3.1, 3.2 — test creation  
**Wave 4 (sequential):** Step 3.3 — cross-reference update, run full test suite  

---

## Validation Criteria

- [ ] All 11 prompt files exist in `.github/prompts/`
- [ ] Each prompt file has valid YAML frontmatter with `description`  
- [ ] Each prompt file references its corresponding skill or contains workflow steps
- [ ] `/gsd-help` output includes all 26+ commands
- [ ] `copilot-instructions.md` lists all commands by category
- [ ] New structural tests pass (prompt ↔ skill coverage, frontmatter validity)
- [ ] Existing 391 tests still pass
- [ ] Installer copies new prompt files correctly (dry-run test)
- [ ] No prompt file duplicates skill content (thin router pattern only)
