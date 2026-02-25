# Phase 2 Supplementary Specs

These specs fill the gaps identified in the Phase 2 plan. Read these alongside `phase-2-full-orchestration.md` and `phase-1-supplementary-specs.md`.

---

## Supplement A: Skill Architecture Patterns

Phase 1 had one skill (`gsd-quick`). Phase 2 introduces 7 skills with varying complexity and interaction patterns. This supplement defines reusable patterns to keep them consistent.

### A1: Skill Structure Convention

Every skill follows this structure:

```
.github/skills/{skill-name}/
├── SKILL.md              ← Orchestration logic (the "main" file)
├── references/           ← Detailed workflow docs read during execution
│   └── *.md
└── templates/            ← File templates filled during execution
    └── *.md
```

**SKILL.md anatomy:**

```markdown
---
description: "One-line purpose — shown in command palette"
---

# {Skill Name}

## Preconditions
<!-- Validate before doing anything -->

## Flags & Arguments
<!-- Parse user input -->

## Step N: {Action}
<!-- Each step is a numbered orchestration phase -->
```

### A2: Flag Parsing Convention

Skills that accept flags must parse `$ARGUMENTS` (the user's input text after the command name).

**Standard flag vocabulary** (consistent across all skills):

| Flag | Skills | Meaning |
|---|---|---|
| `--auto` | new-project, plan-phase, execute-phase | Skip interactive prompts, auto-approve |
| `--skip-research` | plan-phase | Skip research agent delegation |
| `--research` | plan-phase | Force research even if RESEARCH.md exists |
| `--gaps` | plan-phase | Gap-closure mode — create fix plans from VERIFICATION.md |
| `--skip-verify` | plan-phase | Skip plan-checker loop |
| `--gaps-only` | execute-phase | Execute only `gap_closure: true` plans |
| `--prd <filepath>` | plan-phase | Express path — read PRD instead of discuss-phase |
| `--full` | quick (from Phase 1) | Enable plan-checker + verifier |

**Parsing approach in SKILL.md:**

```markdown
## Parse Arguments

Extract the phase number and flags from user input.

- Phase number: first positional argument (e.g., `1`, `2A`, `1.5`)
- Flags: any `--flag` tokens in the input
- If phase number is missing, ask the user.
- Normalize the phase number using `gsd_find_phase` MCP tool.
```

### A3: Precondition Checking Convention

Every skill starts with precondition checks. Common preconditions:

| Precondition | Skills | Check |
|---|---|---|
| `.planning/` exists | All | `gsd_state_load` succeeds |
| Phase directory exists | execute, verify, discuss | `gsd_find_phase` returns valid path |
| ROADMAP.md has phase entry | plan, execute, discuss | `gsd_roadmap_get_phase` succeeds |
| PLAN.md files exist | execute, verify | `gsd_find_phase` returns plan count > 0 |
| PROJECT.md does NOT exist | new-project | File check — abort if exists (already initialized) |

**Error messages must suggest the corrective command:**

```markdown
If `.planning/` does not exist:
  "No GSD project found. Run `/gsd-new-project` first."

If no plans exist for the phase:
  "Phase {N} has no plans. Run `/gsd-plan-phase {N}` first."
```

### A4: Completion & Routing Convention

Every skill ends by suggesting the next logical command. This creates a discoverable workflow chain.

**Standard routing table:**

| Completing Skill | Suggest Next |
|---|---|
| `gsd-new-project` | `/gsd-discuss-phase 1` or `/gsd-plan-phase 1` |
| `gsd-map-codebase` | `/gsd-new-project` |
| `gsd-discuss-phase N` | `/gsd-research-phase N` or `/gsd-plan-phase N` |
| `gsd-plan-phase N` | `/gsd-execute-phase N` |
| `gsd-execute-phase N` | `/gsd-verify-work N` |
| `gsd-verify-work N` (all pass) | Next phase or `/gsd-audit-milestone` |
| `gsd-verify-work N` (failures) | `/gsd-execute-phase N --gaps-only` |
| `gsd-audit-milestone` | `/gsd-complete-milestone` |
| `gsd-complete-milestone vX` | `/gsd-new-milestone` |
| `gsd-debug` (fix found) | `/gsd-quick "fix: ..."` or manual |

### A5: Progress Feedback Convention

Skills that take multiple steps should use `manage_todo_list` to surface progress:

```markdown
After each major step completes:
1. Mark the current todo as completed
2. Mark the next todo as in-progress
3. Brief status message to the user

Example for plan-phase:
  ☑ Research phase (RESEARCH.md written)
  ☐ Create plans (in progress...)
  ☐ Verify plans
  ☐ Commit
```

---

## Supplement B: Agent Delegation Protocol

Phase 1 Supplement B defined the "inline agent instructions" pattern for the single-conversation model. Phase 2 extends this for complex multi-agent orchestration.

### B1: Single Agent Delegation (Simple)

Used when one skill delegates to one agent, once.

```markdown
## Step N: {Action}

Read the file `.github/agents/gsd-{agent}.agent.md` to load the {agent}'s
role, constraints, and methodology.

Then, acting as the {agent}:
- Context: {what to read and use}
- Constraints: {mode, scope limits}
- Output: Write result to `{output file path}`
```

**Example** — discuss-phase delegating to no agent (self-orchestrated):

The discuss-phase skill does NOT delegate to a sub-agent. The skill itself drives the questioning flow. This is the simplest pattern.

### B2: Sequential Multi-Agent Delegation

Used when a skill invokes agents one after another, each building on the previous output.

**Pattern (plan-phase):**

```markdown
## Step 3: Research

Read `.github/agents/gsd-phase-researcher.agent.md`.
Acting as the phase-researcher:
- Read: ROADMAP.md phase section, CONTEXT.md, codebase docs
- Produce: `{phase_dir}/{phase}-RESEARCH.md`

## Step 4: Plan

Read `.github/agents/gsd-planner.agent.md`.
Acting as the planner:
- Read: STATE.md, ROADMAP.md, REQUIREMENTS.md, CONTEXT.md, RESEARCH.md (from Step 3)
- Produce: one or more `{phase_dir}/{phase}-{NN}-PLAN.md` files

## Step 5: Verify

Read `.github/agents/gsd-plan-checker.agent.md`.
Acting as the plan-checker:
- Read: All PLANs from Step 4, ROADMAP.md, CONTEXT.md, RESEARCH.md
- Produce: VALIDATION.md or approval
```

**Key constraint:** Each agent's output files serve as the "return value" for the next agent. The skill does NOT pass agent output via variables — it references file paths.

### B3: Revision Loop Delegation

Used when plan-phase runs a planner → checker → revision cycle.

**Protocol:**

```markdown
## Step 5: Verify Plans (Revision Loop)

Set iteration_count = 0.

LOOP:
  1. Read `.github/agents/gsd-plan-checker.agent.md`.
     Acting as the plan-checker, evaluate ALL plans against:
     - ROADMAP.md phase goals and success criteria
     - CONTEXT.md decisions
     - RESEARCH.md findings
     - REQUIREMENTS.md coverage

  2. If checker output contains "## VERIFICATION PASSED":
     → Write VALIDATION.md with pass status
     → EXIT LOOP

  3. If checker output contains "## ISSUES FOUND":
     → Increment iteration_count
     → If iteration_count >= 3:
         → Write VALIDATION.md with remaining issues
         → Present issues to user with options:
           a) Accept plans as-is
           b) Manually adjust and re-verify
         → EXIT LOOP
     → Otherwise:
         → Read `.github/agents/gsd-planner.agent.md` again
         → Acting as the planner, revise plans to address ONLY the issues listed
         → Do NOT re-plan from scratch — targeted fixes only
         → CONTINUE LOOP
```

**Critical rules:**
- Maximum 3 iterations — prevents infinite loops
- Revision is targeted, not full re-planning
- Each iteration produces NEW plan files (overwrite, don't append)
- The checker must produce structured output with clear PASSED/ISSUES markers

### B4: Parallel-to-Sequential Adaptation

Claude Code runs agents in parallel via `run_in_background=true`. Copilot executes sequentially. This affects:

| Workflow | Claude Code | Copilot |
|---|---|---|
| `new-project` research | 4 parallel researcher agents | 4 sequential calls, same output |
| `map-codebase` mapping | 4 parallel mapper agents | 4 sequential calls, same output |
| `execute-phase` within wave | Parallel plan execution | Sequential plan execution |

**Adaptation rule:** The skill's SKILL.md runs agents sequentially with progress updates between each. The output files are identical — only wall-clock time differs.

```markdown
## Step 4: Research (Sequential)

For each focus area [stack, features, architecture, pitfalls]:
  1. Mark progress: "Researching {focus}..."
  2. Read `.github/agents/gsd-project-researcher.agent.md`
  3. Acting as the project-researcher with focus={focus}:
     - Produce: `.planning/research/{FOCUS}.md`
  4. Verify output file exists
```

### B5: Checkpoint Handling

Used in execute-phase when a plan contains checkpoint tasks (human verification, decision points).

**Protocol:**

```markdown
When encountering a task with `type: checkpoint`:

1. Read the checkpoint type from task XML:
   - `human-verify`: User must confirm something works
   - `decision`: User must choose between options
   - `human-action`: User must do something outside the IDE

2. Present the checkpoint:
   ╔══════════════════════════════════════════╗
   ║  CHECKPOINT: {checkpoint title}          ║
   ╠══════════════════════════════════════════╣
   ║  Type: {human-verify|decision|action}    ║
   ║  {checkpoint description}                ║
   ║                                          ║
   ║  Please respond when ready to continue.  ║
   ╚══════════════════════════════════════════╝

3. Wait for user response.

4. Record the response in the plan's SUMMARY.md under `## Checkpoints`.

5. Continue execution with the user's input as context.
```

**Auto-mode bypass:** If `--auto` flag is set AND the checkpoint type is `human-verify` → auto-pass. For `decision` and `human-action` → still pause (cannot be automated).

### B6: Agent Handoff Configuration

Phase 2 Step 15 adds `handoffs:` to agent YAML frontmatter.

**How handoffs work in Copilot:**

Copilot's agent handoff is a suggestion, not an automatic transfer. When an agent completes its work, if it lists handoff targets, the skill's SKILL.md can present them as "next step" options.

**In practice, handoffs are handled by the skill, not the agent.** The agent `.md` file's `handoffs:` field is informational — the skill's completion/routing step (Supplement A4) is what actually routes.

**Where `handoffs:` adds value:** When an agent is `user-invocable: true` (only `gsd-debugger`), the agent itself can suggest the next step at the end of its output:

```markdown
# In gsd-debugger.agent.md, at the end:

## Completion

When root cause is found:
- If fix is straightforward: Suggest "@gsd-executor to implement the fix"
- If fix needs planning: Suggest "/gsd-plan-phase {N} --gaps"
```

---

## Supplement C: Phase 2 MCP Tools — Detailed Schemas

Phase 2 adds ~15 MCP tools. This supplement provides concrete JSON schemas and handler mappings for each.

### C1: Verification Tools (from verify.cjs)

#### `gsd_verify_plan_structure`

```json
{
  "name": "gsd_verify_plan_structure",
  "description": "Validate PLAN.md structure — checks required frontmatter fields and task XML elements",
  "inputSchema": {
    "type": "object",
    "properties": {
      "plan_file": {
        "type": "string",
        "description": "Relative path to the PLAN.md file (from workspace root)"
      }
    },
    "required": ["plan_file"]
  }
}
```

**Handler:** Calls `cmdVerifyPlanStructure(cwd, planFile, true)` from verify.cjs.

**Return schema:**
```json
{
  "valid": true|false,
  "errors": ["Missing frontmatter field: wave", "Task 3 missing <verify> element"],
  "warnings": ["Frontmatter field 'files_modified' is empty"],
  "task_count": 5,
  "frontmatter": { "phase": "01", "plan": "01", "type": "standard", "wave": 1 }
}
```

#### `gsd_verify_summary`

```json
{
  "name": "gsd_verify_summary",
  "description": "Spot-check SUMMARY.md — verify mentioned files exist, commit hashes valid, self-check status",
  "inputSchema": {
    "type": "object",
    "properties": {
      "summary_file": {
        "type": "string",
        "description": "Relative path to the SUMMARY.md file"
      },
      "check_file_count": {
        "type": "boolean",
        "description": "Whether to count and verify file existence (default: true)"
      }
    },
    "required": ["summary_file"]
  }
}
```

**Handler:** Calls `cmdVerifySummary(cwd, summaryFile, checkFileCount, true)`.

**Return schema:**
```json
{
  "valid": true|false,
  "file_checks": { "total": 5, "found": 4, "missing": ["src/auth.ts"] },
  "commit_checks": { "total": 3, "valid": 3, "invalid": [] },
  "self_check_status": "passed|failed|missing"
}
```

#### `gsd_verify_artifacts`

```json
{
  "name": "gsd_verify_artifacts",
  "description": "Verify expected phase artifacts exist (PLANs, SUMMARYs, RESEARCH, etc.)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "phase": { "type": "string", "description": "Phase number or name" }
    },
    "required": ["phase"]
  }
}
```

**Handler:** Finds phase directory via `findPhaseInternal`, checks for expected files.

**Return schema:**
```json
{
  "phase": "01",
  "phase_dir": ".planning/phases/01-init",
  "artifacts": {
    "plans": { "expected": 3, "found": ["01-01-PLAN.md", "01-02-PLAN.md", "01-03-PLAN.md"] },
    "summaries": { "expected": 3, "found": ["01-01-SUMMARY.md"], "missing": ["01-02-SUMMARY.md", "01-03-SUMMARY.md"] },
    "research": { "exists": true },
    "context": { "exists": true },
    "validation": { "exists": false },
    "uat": { "exists": false }
  }
}
```

#### `gsd_verify_commits`

```json
{
  "name": "gsd_verify_commits",
  "description": "Verify git commits exist for a phase — cross-references SUMMARY commit hashes",
  "inputSchema": {
    "type": "object",
    "properties": {
      "phase": { "type": "string", "description": "Phase number" }
    },
    "required": ["phase"]
  }
}
```

**Handler:** Finds all SUMMARY.md files for the phase, extracts commit hashes, verifies each via `execGit(cwd, ['cat-file', '-t', hash])`.

**Return schema:**
```json
{
  "phase": "01",
  "commit_summary": { "total_referenced": 8, "valid": 7, "invalid": 1 },
  "invalid_hashes": [{ "hash": "abc123", "source": "01-02-SUMMARY.md" }]
}
```

### C2: Frontmatter Tools (from frontmatter.cjs)

#### `gsd_frontmatter_get`

```json
{
  "name": "gsd_frontmatter_get",
  "description": "Parse YAML frontmatter from a markdown file. Returns all fields or a specific key.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "file": { "type": "string", "description": "Relative path to the markdown file" },
      "key": { "type": "string", "description": "Optional specific frontmatter key to extract" }
    },
    "required": ["file"]
  }
}
```

**Handler:** Calls `extractFrontmatter(content)`. If `key` provided, returns just that field.

#### `gsd_frontmatter_set`

```json
{
  "name": "gsd_frontmatter_set",
  "description": "Set a single frontmatter field in a markdown file",
  "inputSchema": {
    "type": "object",
    "properties": {
      "file": { "type": "string", "description": "Relative path to the markdown file" },
      "key": { "type": "string", "description": "Frontmatter field name" },
      "value": { "type": "string", "description": "New value (will be YAML-encoded)" }
    },
    "required": ["file", "key", "value"]
  }
}
```

**Handler:** Extracts frontmatter, sets field, calls `spliceFrontmatter(content, updated)`, writes file.

#### `gsd_frontmatter_validate`

```json
{
  "name": "gsd_frontmatter_validate",
  "description": "Validate frontmatter against a schema (e.g., required fields for PLAN.md)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "file": { "type": "string", "description": "Relative path to the markdown file" },
      "schema": {
        "type": "string",
        "enum": ["plan", "summary", "state", "uat", "verification"],
        "description": "Schema name to validate against"
      }
    },
    "required": ["file", "schema"]
  }
}
```

**Handler:** Extracts frontmatter, checks against known schemas.

**Known schemas:**

| Schema | Required Fields |
|---|---|
| `plan` | `phase`, `plan`, `type`, `wave`, `depends_on`, `files_modified`, `autonomous`, `must_haves` |
| `summary` | `phase`, `plan`, `status`, `completed` |
| `state` | `milestone`, `phase`, `plan`, `status` |
| `uat` | `status`, `phase`, `source` |
| `verification` | `phase`, `status`, `score` |

### C3: Template Tools (from template.cjs)

#### `gsd_template_fill`

```json
{
  "name": "gsd_template_fill",
  "description": "Generate a pre-filled template file (summary, plan, or verification) with frontmatter + body",
  "inputSchema": {
    "type": "object",
    "properties": {
      "template": {
        "type": "string",
        "enum": ["summary", "plan", "verification"],
        "description": "Template type to generate"
      },
      "phase": { "type": "string", "description": "Phase number" },
      "plan": { "type": "string", "description": "Plan number (for summary/plan templates)" },
      "title": { "type": "string", "description": "Title for the plan (plan template only)" }
    },
    "required": ["template", "phase"]
  }
}
```

**Handler:** Calls `cmdTemplateFill(cwd, templateType, options, true)`. Resolves phase directory, generates frontmatter, writes file.

**Important:** This tool writes the file directly. It returns the file path, not the content.

#### `gsd_template_select`

```json
{
  "name": "gsd_template_select",
  "description": "Auto-select summary template complexity based on plan analysis",
  "inputSchema": {
    "type": "object",
    "properties": {
      "plan_file": { "type": "string", "description": "Relative path to the PLAN.md file" }
    },
    "required": ["plan_file"]
  }
}
```

**Handler:** Calls `cmdTemplateSelect(cwd, planPath, true)`.

**Return schema:**
```json
{
  "selected": "minimal|standard|complex",
  "reason": "≤2 tasks, ≤3 files → minimal",
  "task_count": 2,
  "file_count": 3,
  "has_decisions": false
}
```

#### `gsd_scaffold_phase_dir`

```json
{
  "name": "gsd_scaffold_phase_dir",
  "description": "Create the directory for a phase if it doesn't exist",
  "inputSchema": {
    "type": "object",
    "properties": {
      "phase": { "type": "string", "description": "Phase number" },
      "name": { "type": "string", "description": "Phase slug name (e.g., 'authentication')" }
    },
    "required": ["phase", "name"]
  }
}
```

**Handler:** Create `.planning/phases/{phase}-{name}/` directory. No-op if already exists.

#### `gsd_scaffold_context`

```json
{
  "name": "gsd_scaffold_context",
  "description": "Create a CONTEXT.md file from template for a phase",
  "inputSchema": {
    "type": "object",
    "properties": {
      "phase": { "type": "string", "description": "Phase number" }
    },
    "required": ["phase"]
  }
}
```

**Handler:** Find phase directory, create `{phase}-CONTEXT.md` from template.

### C4: Advanced Roadmap Tools (from roadmap.cjs)

#### `gsd_roadmap_update_plan_progress`

```json
{
  "name": "gsd_roadmap_update_plan_progress",
  "description": "Update plan completion status in ROADMAP.md progress table for a phase",
  "inputSchema": {
    "type": "object",
    "properties": {
      "phase": { "type": "string", "description": "Phase number" },
      "plan": { "type": "string", "description": "Plan number" },
      "status": {
        "type": "string",
        "enum": ["pending", "in_progress", "completed", "skipped"],
        "description": "New plan status"
      }
    },
    "required": ["phase", "plan", "status"]
  }
}
```

**Handler:** Parses ROADMAP.md, finds the progress table for the given phase, updates the specific plan row.

#### `gsd_roadmap_update_phase_status`

```json
{
  "name": "gsd_roadmap_update_phase_status",
  "description": "Update overall phase status in ROADMAP.md (from phase checklist)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "phase": { "type": "string", "description": "Phase number" },
      "status": {
        "type": "string",
        "enum": ["not_started", "researched", "planned", "in_progress", "completed", "verified"],
        "description": "New phase status"
      }
    },
    "required": ["phase", "status"]
  }
}
```

### C5: History and Discovery Tools (from commands.cjs + init.cjs)

#### `gsd_history_digest`

```json
{
  "name": "gsd_history_digest",
  "description": "Generate digest of relevant prior summaries for context seeding",
  "inputSchema": {
    "type": "object",
    "properties": {
      "phase": {
        "type": "string",
        "description": "Phase number — if provided, returns summaries from prior phases only"
      }
    }
  }
}
```

**Handler:** Reads all SUMMARY.md files from completed phases (before the given phase, or all if none specified). Extracts `one-liner` from each frontmatter. Returns array of `{ phase, plan, one_liner, file }` objects sorted by phase/plan.

#### `gsd_summary_extract`

```json
{
  "name": "gsd_summary_extract",
  "description": "Extract structured data from a single SUMMARY.md (one-liner, status, files changed)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "file": { "type": "string", "description": "Relative path to the SUMMARY.md" }
    },
    "required": ["file"]
  }
}
```

**Handler:** Calls `cmdSummaryExtract(cwd, file, true)`.

#### `gsd_find_phase`

```json
{
  "name": "gsd_find_phase",
  "description": "Find the directory and metadata for a phase number",
  "inputSchema": {
    "type": "object",
    "properties": {
      "phase": { "type": "string", "description": "Phase number (e.g., '1', '2A', '1.5')" }
    },
    "required": ["phase"]
  }
}
```

**Handler:** Calls `findPhaseInternal(cwd, phase)`.

**Return schema:**
```json
{
  "phase": "01",
  "normalized": "01",
  "dir": ".planning/phases/01-init",
  "plans": ["01-01-PLAN.md", "01-02-PLAN.md"],
  "summaries": ["01-01-SUMMARY.md"],
  "has_research": true,
  "has_context": true,
  "exists": true
}
```

### C6: Milestone Tools (from milestone.cjs)

#### `gsd_milestone_archive`

```json
{
  "name": "gsd_milestone_archive",
  "description": "Archive current milestone files to .planning/milestones/{version}/",
  "inputSchema": {
    "type": "object",
    "properties": {
      "version": { "type": "string", "description": "Milestone version (e.g., 'v1.0')" }
    },
    "required": ["version"]
  }
}
```

**Handler:** Calls `cmdMilestoneComplete(cwd, version, {}, true)`.

**Return schema:**
```json
{
  "version": "v1.0",
  "archive_dir": ".planning/milestones/v1.0",
  "archived_files": ["ROADMAP.md", "REQUIREMENTS.md", "MILESTONE-AUDIT.md"],
  "stats": {
    "phase_count": 5,
    "plan_count": 12,
    "task_count": 47,
    "accomplishments": ["Authentication system", "REST API", "Dashboard UI"]
  }
}
```

#### `gsd_milestone_stats`

```json
{
  "name": "gsd_milestone_stats",
  "description": "Get statistics for current or specified milestone",
  "inputSchema": {
    "type": "object",
    "properties": {
      "version": { "type": "string", "description": "Milestone version (optional — defaults to current)" }
    }
  }
}
```

**Handler:** If version provided, reads from archive directory. Otherwise reads current `.planning/` state.

#### `gsd_requirements_mark_complete`

```json
{
  "name": "gsd_requirements_mark_complete",
  "description": "Mark requirement IDs as complete in REQUIREMENTS.md (checkboxes + traceability table)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "req_ids": {
        "type": "string",
        "description": "Comma-separated REQ-IDs (e.g., 'AUTH-01, AUTH-02, API-03')"
      }
    },
    "required": ["req_ids"]
  }
}
```

**Handler:** Calls `cmdRequirementsMarkComplete(cwd, reqIds, true)`.

### C7: Init Tools Deferred from Phase 1

Phase 1 deferred several init tools. Phase 2 needs them:

#### `gsd_init_new_project`

```json
{
  "name": "gsd_init_new_project",
  "description": "Assemble context for new-project workflow (brownfield detection, existing docs scan)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "description": { "type": "string", "description": "Optional project description from user" }
    }
  }
}
```

**Handler:** Calls `cmdInitNewProject(cwd, options, true)`.

**Windows adaptation:** The original uses `execSync('find ...')` for brownfield detection. Replace with recursive `fs.readdirSync` scan:

```javascript
function detectBrownfield(cwd) {
  const indicators = {
    hasPackageJson: fs.existsSync(path.join(cwd, 'package.json')),
    hasPyproject: fs.existsSync(path.join(cwd, 'pyproject.toml')),
    hasGo: fs.existsSync(path.join(cwd, 'go.mod')),
    hasCargo: fs.existsSync(path.join(cwd, 'Cargo.toml')),
    hasSrc: fs.existsSync(path.join(cwd, 'src')),
    fileCount: countFiles(cwd, 3), // max depth 3
  };
  indicators.isBrownfield = Object.values(indicators).some(v => v === true) || indicators.fileCount > 10;
  return indicators;
}
```

#### `gsd_init_plan_phase`

```json
{
  "name": "gsd_init_plan_phase",
  "description": "Assemble full context for plan-phase workflow (state, roadmap, codebase docs, prior summaries)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "phase": { "type": "string", "description": "Phase number" }
    },
    "required": ["phase"]
  }
}
```

**Handler:** Calls `cmdInitPlanPhase(cwd, phase, true)`. Returns a large JSON blob with all context needed by the planner agent.

#### `gsd_init_verify_work`

```json
{
  "name": "gsd_init_verify_work",
  "description": "Assemble context for verify-work workflow (summaries, verification reports, testable deliverables)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "phase": { "type": "string", "description": "Phase number" }
    },
    "required": ["phase"]
  }
}
```

#### `gsd_init_milestone_op`

```json
{
  "name": "gsd_init_milestone_op",
  "description": "Assemble context for milestone operations (audit, complete, new)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "version": { "type": "string", "description": "Milestone version (optional)" }
    }
  }
}
```

#### `gsd_init_map_codebase`

```json
{
  "name": "gsd_init_map_codebase",
  "description": "Assemble context for codebase mapping (existing analysis detection, scope)",
  "inputSchema": {}
}
```

---

## Supplement D: Interactive Questioning Protocol

Phase 2 introduces three skills with interactive questioning flows: `gsd-new-project`, `gsd-discuss-phase`, and `gsd-verify-work`. This supplement defines how to handle user interaction consistently.

### D1: AskUserQuestion → Chat Interaction Mapping

Claude Code uses `AskUserQuestion(header, question, options)` with structured JSON. Copilot agents interact conversationally. The mapping:

| Claude Code Pattern | Copilot Pattern |
|---|---|
| `AskUserQuestion("Config", "Select mode", ["YOLO", "Standard"])` | Present as numbered list, ask user to pick a number |
| `AskUserQuestion("Discovery", "What are you building?", null)` | Ask open-ended question, wait for response |
| Multi-select (gray areas in discuss-phase) | Present numbered list, ask user to select multiple (e.g., "1, 3, 5") |
| Confirmation ("Does this look right?") | Ask yes/no question |

### D2: Questioning Flow Structure (new-project)

**Phase 1: Configuration (3 questions)**

```markdown
Present the following configuration choices:

1. **Workflow mode:**
   - Standard (recommended) — interactive research, verification
   - YOLO — skip research/verification, maximum speed

2. **Depth:**
   - Quick — 3-5 roadmap phases, minimal research
   - Standard — 5-8 phases, balanced (default)
   - Comprehensive — 8-12 phases, deep research

3. **Model profile:**
   - Quality — prioritize accuracy (slower)
   - Balanced — recommended for most projects (default)
   - Budget — minimize token usage (faster)

Write selections to `.planning/config.json` via `gsd_config_set`.
```

**Phase 2: Discovery (adaptive questioning)**

The questioning reference (references/questioning.md, 94 lines) defines question philosophy:

- **Role:** Thinking partner, not interviewer (no rapid-fire surveys)
- **Question types:** Motivation ("Why?"), Concreteness ("Show me"), Clarification ("When you say X, do you mean...?"), Success ("How would you know it's working?")
- **Stopping rules:** Stop when core value prop is clear, target user is defined, and technical constraints are captured. 3-7 questions typical.

**Core questions (always asked):**
1. What are you building? (open-ended)
2. Who is it for? (audience/user)
3. What's the core value — why would someone use this over alternatives?

**Depth questions (ask based on complexity):**
4. Any technical constraints? (language, framework, platform)
5. Is there existing code? (→ offer `/gsd-map-codebase` if yes)
6. Are there similar products you like or dislike?

**Edge case questions (ask if relevant to domain):**
7. Scale expectations?
8. Authentication/authorization?
9. Payments/billing?
10. Real-time features?

### D3: Gray Area Identification (discuss-phase)

The discuss-phase skill identifies implementation gray areas based on the phase's domain:

```markdown
Analyze the ROADMAP.md phase description and categorize the phase delivery:

- **Visual/UI phase:** gray areas about layout, density, interactions, empty states,
  responsive behavior, animations, dark mode
- **API/Backend phase:** gray areas about response format, pagination, rate limiting,
  error codes, authentication, caching
- **CLI phase:** gray areas about flag names, output format, exit codes, colors,
  interactive vs. non-interactive mode
- **Data/Content phase:** gray areas about structure, naming, categorization,
  deduplication, migration
- **Infrastructure phase:** gray areas about deployment, monitoring, alerts,
  rollback, scaling

Present the identified gray areas as a numbered list.
User selects which to discuss (multi-select: "1, 3, 5").

For each selected gray area:
  Ask 3-4 focused questions about the user's preferences.
  After answers, offer: "Next topic?" / "Add more detail?" / "Done discussing?"
```

### D4: UAT Walk-Through Protocol (verify-work)

```markdown
For each testable deliverable:

1. Present the test in a checkpoint box:
   ╔══════════════════════════════════════════╗
   ║  TEST {N}/{total}: {test description}    ║
   ╠══════════════════════════════════════════╣
   ║  Expected: {what should happen}           ║
   ║  How to test: {step-by-step}              ║
   ╚══════════════════════════════════════════╝

2. Wait for user response:
   - "pass" / "yes" / "y" / "✓" → Record as PASSED
   - Anything else → Record as ISSUE, parse response for:
     - Severity inference (crash = critical, cosmetic = low)
     - Symptom description
     - Expected vs. actual behavior

3. For ISSUE responses:
   - Ask: "Should I diagnose this now or note it for later?"
   - If diagnose: delegate to gsd-debugger inline
   - If note: record in UAT.md for gap-closure planning

4. Between tests: show running score (e.g., "5/7 passed")
```

---

## Supplement E: Web Search & Context7 Fallback Strategy

The phase-researcher and project-researcher agents rely heavily on external knowledge sources. This supplement defines the Copilot fallback chain.

### E1: Source Priority Chain

Both researcher agents use this priority order in Claude Code:

```
1. Context7 MCP (library docs)
2. WebFetch (specific URLs)
3. WebSearch/Brave API (general search)
4. Training knowledge (last resort)
```

**Copilot equivalent chain:**

```
1. Context7 MCP (if configured in .vscode/mcp.json)
   → Try mcp__context7__resolve-library-id first
   → If available, use mcp__context7__query-docs
   → If NOT available (tool not found), skip silently

2. fetch_webpage (for specific URLs)
   → Load via tool_search_tool_regex before first use
   → Use for official documentation URLs
   → Use for GitHub README/docs pages

3. Web search via fetch_webpage + search URL
   → No native WebSearch in Copilot
   → Option A: fetch_webpage with Bing/Google search URL (unreliable)
   → Option B: Keep gsd-tools.cjs websearch MCP tool if Brave API key available
   → Option C: Skip web search, rely on training knowledge

4. Training knowledge
   → Always available but may be outdated
   → Agent must flag confidence level when using training knowledge
```

### E2: Context7 MCP Detection

The agent instructions should check for Context7 availability without hard-failing:

```markdown
## Research Sources

When researching external libraries or frameworks:

1. **Try Context7 first** (if available):
   - Call `mcp__context7__resolve-library-id` with the library name
   - If the tool is not available or returns an error, skip to step 2
   - If successful, call `mcp__context7__query-docs` with the resolved ID
   - Rate confidence: HIGH (official docs)

2. **Fetch official documentation** (if URLs known):
   - Use `fetch_webpage` to load official docs/README
   - Rate confidence: HIGH (official docs)

3. **Fall back to training knowledge:**
   - Use what you know, but:
   - Flag: "⚠️ Based on training knowledge — verify versions and APIs"
   - Rate confidence: MEDIUM
```

### E3: Brave Search MCP Tool (optional)

If the user has a Brave API key, Phase 2 can add a `gsd_websearch` MCP tool:

```json
{
  "name": "gsd_websearch",
  "description": "Search the web via Brave Search API (requires BRAVE_API_KEY env var)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search query" },
      "limit": { "type": "number", "description": "Max results (default: 5)" }
    },
    "required": ["query"]
  }
}
```

**Handler:** Port from `gsd-tools.cjs websearch` command. Check `process.env.BRAVE_API_KEY`. If not set, return `{ available: false, reason: "BRAVE_API_KEY not configured" }`.

### E4: Agent Instruction Adaptation

In researcher agent `.md` files, replace:

```
# Claude Code (remove)
mcp__context7__resolve-library-id → mcp__context7__query-docs
node ~/.claude/get-shit-done/bin/gsd-tools.cjs websearch "query"
WebSearch("query")
WebFetch("url")
```

With:

```
# Copilot (add)
If Context7 MCP is available, use it for library documentation lookups.
Use fetch_webpage to load specific documentation URLs.
If gsd_websearch is available, use it for general web searches.
Otherwise, use training knowledge and flag confidence level.
```

---

## Supplement F: Wave Execution Algorithm

The execute-phase skill uses wave-based ordering for plan execution. This supplement details the algorithm.

### F1: Wave Analysis

Plans declare their wave number and dependencies in YAML frontmatter:

```yaml
---
phase: "01"
plan: "01"
wave: 1
depends_on: []
---
```

```yaml
---
phase: "01"
plan: "03"
wave: 2
depends_on: ["01-01", "01-02"]
---
```

**Grouping algorithm:**

```
1. For each PLAN.md in the phase directory:
   a. Extract frontmatter via gsd_frontmatter_get
   b. Read { wave, depends_on, plan }

2. Group plans by wave number: { 1: [plan-01, plan-02], 2: [plan-03], ... }

3. Within each wave, sort by plan number (lexicographic)

4. Validate:
   - All depends_on references exist as plan files
   - No plan depends on a plan in the same or later wave
   - Wave 1 plans have empty depends_on (they are roots)
```

### F2: Execution Order Diagram

The skill should present the wave structure before executing:

```
Wave 1 (no dependencies):
  ├── Plan 01: {title}
  └── Plan 02: {title}

Wave 2 (depends on Wave 1):
  └── Plan 03: {title} ← depends on 01, 02

Wave 3 (depends on Wave 2):
  ├── Plan 04: {title} ← depends on 03
  └── Plan 05: {title} ← depends on 03
```

### F3: Sequential Execution Protocol

```markdown
For each wave (1, 2, 3, ...):
  For each plan in wave (sorted by plan number):

    1. ANNOUNCE: "Executing Plan {plan}: {title} (Wave {wave})"

    2. PRE-CHECK: Verify all depends_on plans have SUMMARY.md files
       - If any dependency is missing: HALT and report

    3. DELEGATE: Read gsd-executor.agent.md, execute the plan:
       - Input: PLAN.md path, STATE.md, config, project conventions
       - Output: Per-task commits, SUMMARY.md

    4. SPOT-CHECK:
       - Does SUMMARY.md exist? (file check)
       - Does SUMMARY frontmatter contain valid commit hashes?
       - Are the expected output files present on disk?
       - If spot-check fails: report to user, offer retry/skip/abort

    5. UPDATE STATE: Call gsd_state_advance_plan, gsd_state_update_progress

  After all plans in wave complete:
    - If config.gates.execute_next_plan is true: ask user "Proceed to wave {N+1}?"
    - Otherwise: continue automatically

After all waves complete:
  - Call gsd_state_update with phase status = "executed"
  - Present summary of all plans executed
  - Route to /gsd-verify-work
```

### F4: Gap-Only Mode

When `--gaps-only` flag is set, filter plans before wave analysis:

```markdown
1. Read all plans' frontmatter
2. Include only plans where type == "gap_closure"
3. Build wave structure from filtered subset
4. Execute as normal
```

---

## Supplement G: Template Porting Guide

Phase 2 ports ~20 templates from `get-shit-done/templates/` to skill-local directories. This supplement provides porting rules.

### G1: Template Variable Mapping

Templates use placeholder variables that need remapping:

| Claude Code Variable | Copilot Equivalent | Used In |
|---|---|---|
| `{date}` or `!date +%Y-%m-%d` | `new Date().toISOString().split('T')[0]` (from MCP tool) | discovery.md, research.md |
| `[Project Name]` | From `PROJECT.md` title or user input | requirements.md, roadmap.md |
| `{phase_number}` | Parsed from arguments | All phase templates |
| `{slug}` | From `gsd_generate_slug` MCP tool | phase-prompt.md |
| `{CAT}-01` (REQ-IDs) | Generated during requirements extraction | requirements.md |

### G2: Template Distribution

| Template Source | Target Location | Skill Owner |
|---|---|---|
| `templates/discovery.md` | `.github/skills/gsd-new-project/templates/` | gsd-new-project |
| `templates/requirements.md` | `.github/skills/gsd-new-project/templates/` | gsd-new-project |
| `templates/roadmap.md` | `.github/skills/gsd-new-project/templates/` | gsd-new-project |
| `templates/project.md` | `.github/skills/gsd-new-project/templates/` | gsd-new-project |
| `templates/config.json` | Already in `.gsd/references/` from Phase 1 | N/A |
| `templates/state.md` | Already in `.gsd/references/` from Phase 1 | N/A |
| `templates/research.md` | `.github/skills/gsd-plan-phase/templates/` | gsd-plan-phase |
| `templates/phase-prompt.md` | `.github/skills/gsd-plan-phase/templates/` | gsd-plan-phase |
| `templates/VALIDATION.md` | `.github/skills/gsd-plan-phase/templates/` | gsd-plan-phase |
| `templates/planner-subagent-prompt.md` | `.github/skills/gsd-plan-phase/templates/` | gsd-plan-phase |
| `templates/summary.md` | `.github/skills/gsd-execute-phase/templates/` | gsd-execute-phase |
| `templates/summary-minimal.md` | `.github/skills/gsd-execute-phase/templates/` | gsd-execute-phase |
| `templates/summary-standard.md` | `.github/skills/gsd-execute-phase/templates/` | gsd-execute-phase |
| `templates/summary-complex.md` | `.github/skills/gsd-execute-phase/templates/` | gsd-execute-phase |
| `templates/verification-report.md` | `.github/skills/gsd-execute-phase/templates/` | gsd-execute-phase |
| `templates/UAT.md` | `.github/skills/gsd-verify-work/templates/` | gsd-verify-work |
| `templates/debug-subagent-prompt.md` | `.github/skills/gsd-debug/templates/` | gsd-debug |
| `templates/milestone-archive.md` | `.github/skills/gsd-milestone/templates/` | gsd-milestone |
| `templates/retrospective.md` | `.github/skills/gsd-milestone/templates/` | gsd-milestone |
| `templates/codebase/*.md` (7 files) | `.github/skills/gsd-map-codebase/templates/codebase/` | gsd-map-codebase |
| `templates/research-project/*.md` (5 files) | `.github/skills/gsd-new-project/templates/research/` | gsd-new-project |

### G3: Templates That Need Adaptation vs. Copy-As-Is

**Copy as-is** (no Claude Code-specific content):
- `requirements.md` — pure template structure
- `roadmap.md` — pure template structure  
- `UAT.md` — pure template structure
- `VALIDATION.md` — pure template structure
- `milestone-archive.md` — pure template structure
- `retrospective.md` — pure template structure
- `codebase/*.md` — pure template structures
- `research-project/*.md` — pure template structures

**Need adaptation** (contain Claude Code tool references or paths):
- `phase-prompt.md` — references `gsd-tools.cjs` commands in task verification steps
- `summary.md` / `summary-*.md` — reference `gsd-tools.cjs commit` in format examples
- `verification-report.md` — references tool-specific verification patterns
- `planner-subagent-prompt.md` — contains `@` file references and Claude Code `Task()` conventions
- `debug-subagent-prompt.md` — references `Bash()` commands and Claude Code conventions
- `discovery.md` — uses `!date +%Y-%m-%d` shell command for date validation
- `context.md` — references `/gsd:` command syntax

**Adaptation rules:**
1. Replace `node ~/.claude/get-shit-done/bin/gsd-tools.cjs {cmd}` → `gsd_{cmd}` MCP tool call
2. Replace `@.planning/FILE.md` → "Read `.planning/FILE.md`"
3. Replace `/gsd:{command}` → `/gsd-{command}`
4. Replace `!date +%Y-%m-%d` → `{current_date}` placeholder (filled by MCP tool)
5. Replace `Bash(...)` → "Run in terminal: ..."

---

## Supplement H: Reference Porting Guide

Phase 2 ports 9 references. This supplement clarifies where each goes and what needs adaptation.

### H1: Reference Distribution

| Reference | Source | Target | Reason |
|---|---|---|---|
| `checkpoints.md` | `references/checkpoints.md` | `.gsd/references/checkpoints.md` | Shared across execute-phase and any skill with checkpoints |
| `continuation-format.md` | `references/continuation-format.md` | `.gsd/references/continuation-format.md` | Shared across all skills (completion format) |
| `decimal-phase-calculation.md` | `references/decimal-phase-calculation.md` | `.gsd/references/decimal-phase-calculation.md` | Used by insert-phase prompt |
| `git-planning-commit.md` | `references/git-planning-commit.md` | `.gsd/references/git-planning-commit.md` | Used by any skill that commits planning docs |
| `model-profile-resolution.md` | `references/model-profile-resolution.md` | `.gsd/references/model-profile-resolution.md` | Used by init tools (advisory) |
| `phase-argument-parsing.md` | `references/phase-argument-parsing.md` | `.gsd/references/phase-argument-parsing.md` | Used by all phase-aware skills |
| `planning-config.md` | `references/planning-config.md` | `.gsd/references/planning-config.md` | Used by settings prompt, config tools |
| `questioning.md` | `references/questioning.md` | `.github/skills/gsd-new-project/references/questioning-reference.md` | Skill-specific (only new-project uses it) |
| `tdd.md` | `references/tdd.md` | `.gsd/references/tdd.md` | Used by executor agent, execute-phase skill |

### H2: References That Need Adaptation

**Copy as-is** (no Claude Code specifics):
- `decimal-phase-calculation.md` — pure algorithm description (mentions `gsd-tools.cjs phase next-decimal` but as a tool reference, which maps to the MCP tool)
- `model-profile-resolution.md` — pure algorithm description
- `planning-config.md` — pure config documentation

**Need adaptation:**
- `checkpoints.md` (643 lines) — The most complex reference. Contains:
  - Claude Code `AskUserQuestion` patterns → replace with Copilot chat interaction (see Supplement D)
  - `SlashCommand` references for chaining → replace with `/gsd-{command}` suggestions
  - Auto-mode logic referencing `config.workflow.auto_advance` → keep as-is (config is the same)
  - XML task format for checkpoint types → keep as-is (used by planner/executor)
  
- `continuation-format.md` — Contains:
  - `/gsd:{command}` syntax → `/gsd-{command}`
  - `/clear` references → remove (no equivalent in Copilot; suggest starting a new conversation)
  - `@` file references → "Read {file}"

- `git-planning-commit.md` — Contains:
  - `gsd-tools.cjs commit` references → `gsd_commit` MCP tool
  - File staging patterns → same in MCP tool

- `phase-argument-parsing.md` — Contains:
  - `$ARGUMENTS` variable → user input parsing
  - Normalization examples → same (handled by `gsd_find_phase`)

- `questioning.md` — Contains:
  - `AskUserQuestion` patterns → Copilot chat interaction
  - Philosophy section → keep as-is (portable)

- `tdd.md` — Contains:
  - `Bash()` tool references → "Run in terminal" or `execute` tool
  - Plan structure examples → keep as-is

---

## Supplement I: Agent Porting Notes (Per-Agent)

Details for each of the 7 agents being ported, beyond what the Phase 2 plan specifies.

### I1: gsd-phase-researcher (383 lines)

**Unique challenges:**
- **Context7 two-step pattern:** `resolve-library-id` → `query-docs`. Keep as optional — see Supplement E2.
- **Brave Search via gsd-tools:** `node gsd-tools.cjs websearch "query"` → `gsd_websearch` MCP tool (optional). Fallback: skip.
- **WebFetch usage:** Official docs URLs → `fetch_webpage` (must load via `tool_search_tool_regex` first).
- **`brave_search` flag in init context:** Config flag that enables/disables web search. Keep in config.json.

**Sections to port as-is** (prompt engineering, no tool references):
- `<role>`, `<philosophy>` (training-as-hypothesis), `<source_hierarchy>`, `<verification_protocol>`, `<pre_submission_checklist>`, `<confidence_levels>` (None/Low/Medium/High/Very High)

**Sections needing adaptation:**
- `<tool_strategy>` — Replace Context7/WebSearch/WebFetch with fallback chain (Supplement E1)
- `<output_format>` — Keep RESEARCH.md template but replace shell date command with placeholder
- All `Bash(node gsd-tools.cjs ...)` → MCP tool call instructions

### I2: gsd-project-researcher (413 lines)

**Same web/MCP adaptations as phase-researcher.** Plus:

- **Four parallel instances:** In Claude Code, orchestrator spawns 4 researchers with different focus areas. In Copilot, the skill runs them sequentially (see Supplement B4).
- **Output files:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md → each written to `.planning/research/`
- **Feature categorization system:** Table Stakes vs. Differentiators vs. Anti-Features. Port as-is — this is pure prompt engineering.
- **No commit:** This agent writes but does NOT commit. The synthesizer commits everything.

### I3: gsd-research-synthesizer (164 lines)

**Simplest agent.** Only reads research files and writes SUMMARY.md.

**Key adaptation:** Replace commit command:
```
# Claude Code
Bash(node ~/.claude/get-shit-done/bin/gsd-tools.cjs commit "docs: complete project research" --files .planning/research/)

# Copilot
Call `gsd_commit` MCP tool with message "docs: complete project research" and files [".planning/research/"]
```

**Quality gate to preserve:** The "synthesized not concatenated" principle. The agent instructions explicitly forbid simply copying sections from the 4 research files. The synthesis must integrate, identify conflicts, and derive roadmap implications.

### I4: gsd-roadmapper (449 lines)

**No external tool dependencies.** Reads local files, writes ROADMAP.md. Cleanest port.

**Key aspects to preserve:**
- **100% requirement coverage:** Every REQ-ID from REQUIREMENTS.md must appear in exactly one phase. Orphan detection is critical.
- **Goal-backward success criteria:** Each phase gets "What must be TRUE?" statements, not "What to build" statements.
- **Anti-enterprise:** Instructions explicitly ban terms like "team", "stakeholder", "sprint", "quarterly goals". Keep this.
- **Depth calibration:** Quick (3-5 phases), Standard (5-8), Comprehensive (8-12). Read from config.

**MCP tool calls:**
- `gsd_state_load` — read current state
- `gsd_commit` — commit ROADMAP.md
- No other MCP tools needed (pure document generation)

### I5: gsd-debugger (908 lines — largest agent)

**Special case: user-invocable.** Only agent directly addressable as `@gsd-debugger` in chat.

**Key challenges:**
- **Persistent debug file:** Creates `.planning/debug/{slug}.md` that survives context resets. Port directly — file-based persistence works the same in Copilot.
- **Scientific method loop:** Evidence → Hypothesis → Prediction → Experiment → Observe → Conclude. This is purely prompt engineering — ports as-is.
- **Cognitive bias countermeasures table:** Confirmation, Anchoring, Availability, Sunk Cost biases with specific antidotes. Port as-is.
- **`Edit` tool usage:** Claude Code's native `Edit` → Copilot's `replace_string_in_file`. Update tool references.
- **Investigation techniques:** Binary search, rubber duck, minimal reproduction, working backwards — all prompt engineering, port as-is.
- **Meta-debugging section:** "Treat your code as foreign" — port as-is.
- **MCP tools needed:** `gsd_state_load`, `gsd_commit`, `gsd_state_update`

**Adaptation note:** The debugger's `find_and_fix` mode invokes `Edit` tool to apply fixes. In Copilot, this maps to the `edit` tool alias (which is `replace_string_in_file`). The instruction change is minimal.

### I6: gsd-codebase-mapper (523 lines)

**Key challenges:**
- **Bash-heavy exploration:** Uses `find`, `grep -r`, `ls`, `cat`, `wc -l` extensively. These work in Copilot's `execute` tool but need Windows compatibility awareness.
- **Windows compatibility:** Many commands assume Unix. For cross-platform:
  - `find . -name "*.ts"` → `Get-ChildItem -Recurse -Filter "*.ts"` or use `file_search` tool
  - `grep -r "pattern"` → `grep_search` tool (built-in, cross-platform)
  - `wc -l` → `(Get-Content file | Measure-Object -Line).Lines`
  - **Recommendation:** Replace bash exploration commands with Copilot's built-in `search` and `read` tools where possible. Keep `execute` for complex commands.
- **Forbidden files:** `.env` contents must never be read — only note existence. Port this rule explicitly.
- **Return contract:** Returns only confirmation + line counts, NOT document contents. This conserves orchestrator context. Critical to preserve.

**Adaptation approach:** Instead of instructing the agent to use `bash` commands for codebase exploration, instruct it to use:
- `file_search` (glob patterns) for finding files
- `grep_search` for pattern searching
- `read_file` for reading file contents
- `execute` only for things like `git log`, `npm list`, etc.

### I7: gsd-integration-checker (318 lines)

**Key challenges:**
- **Bash-heavy checking:** Uses `grep -r`, `find`, custom bash functions (`check_export_used()`, `check_api_consumed()`, `check_auth_protection()`). These are inline bash snippets, not external tools.
- **Adaptation:** Replace bash patterns with Copilot tool equivalents:
  - `grep -r "import.*from.*{module}"` → `grep_search` with regex pattern
  - `find . -name "*.test.*"` → `file_search` with glob pattern
  - Custom bash functions → Inline logic in the agent's analysis section
- **Provides/consumes mapping:** The agent builds an explicit export/import graph from SUMMARY.md files. This is analytical work, not tool-dependent. Port as-is.
- **"Existence ≠ Integration" principle:** Core philosophy — port as-is.
- **Requirements mapping:** Maps findings to REQ-IDs. Requirements with no cross-phase wiring get flagged. Port as-is.

---

## Supplement J: Session Start Hook Architecture

Phase 2 Step 14 creates a session-start hook for update checking. This supplement details the implementation.

### J1: Hook Mechanism in Copilot

Copilot supports `.github/hooks/` directory with JSON definitions. The available event type for session start may vary by Copilot version.

**Proposed hook definition (`.github/hooks/check-update.json`):**

```json
{
  "event": "SessionStart",
  "command": "node ${workspaceFolder}/.gsd/hooks/check-update.js",
  "systemMessage": "{{stdout}}"
}
```

**If `SessionStart` is not supported:** Fall back to checking on first GSD command invocation. Add a note in `copilot-instructions.md` or the first prompt interaction:

```markdown
## Update Check

At the start of any GSD command, before other work:
1. Read `.gsd/VERSION` for installed version
2. Check `.gsd/update-cache.json` for last check timestamp
3. If last check was >24h ago: suggest checking for updates
```

### J2: check-update.js Implementation

```javascript
// .gsd/hooks/check-update.js
// Runs at session start. Checks for newer GSD version.
// Output: systemMessage JSON for Copilot to inject.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workspace = process.env.GSD_WORKSPACE || process.cwd();
const versionFile = path.join(workspace, '.gsd', 'VERSION');
const cacheFile = path.join(workspace, '.gsd', 'update-cache.json');

try {
  // Read installed version
  const installed = fs.readFileSync(versionFile, 'utf-8').trim();
  
  // Check cache freshness (skip if checked within 24h)
  if (fs.existsSync(cacheFile)) {
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    const age = Date.now() - new Date(cache.timestamp).getTime();
    if (age < 86400000 && !cache.update_available) {
      process.exit(0); // Silent — no update
    }
    if (age < 86400000 && cache.update_available) {
      console.log(`GSD update available: ${installed} → ${cache.latest}. Run /gsd-update to upgrade.`);
      process.exit(0);
    }
  }
  
  // Query npm for latest version
  const latest = execSync('npm view gsd-copilot version', { 
    encoding: 'utf-8', timeout: 5000 
  }).trim();
  
  // Write cache
  const updateAvailable = latest !== installed;
  fs.writeFileSync(cacheFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    installed,
    latest,
    update_available: updateAvailable
  }));
  
  if (updateAvailable) {
    console.log(`GSD update available: ${installed} → ${latest}. Run /gsd-update to upgrade.`);
  }
} catch (err) {
  // Fail silently — update check is non-critical
  process.exit(0);
}
```

### J3: Graceful Degradation

The update check must never block or error in a way that affects the user's workflow:
- Network timeout: 5 seconds max, then silent exit
- npm not available: silent exit
- `.gsd/VERSION` missing: silent exit
- Cache write fails: silent exit (read-only filesystem)

---

## Supplement K: Milestone Skill Sub-Command Routing

Phase 2 Step 10 notes that the milestone skill covers three sub-commands (new, audit, complete). This supplement defines how to structure this.

### K1: Recommendation: Three Separate Skills

Instead of one skill with sub-command routing, create three separate skills:

```
.github/skills/gsd-new-milestone/SKILL.md
.github/skills/gsd-audit-milestone/SKILL.md
.github/skills/gsd-complete-milestone/SKILL.md
```

**Rationale:**
- Each is a separate `/gsd-*` command in the user's mental model
- Each has different preconditions and agent delegations
- Copilot's skill system doesn't have built-in sub-command routing
- Shared templates can go in `.gsd/references/` or be duplicated (they're small)

### K2: gsd-audit-milestone SKILL.md

```markdown
## Preconditions
- .planning/ exists
- At least one phase has VERIFICATION.md or SUMMARY.md

## Steps
1. Read all VERIFICATION.md files from current milestone phases
2. Read all SUMMARY.md files for tech debt inventory
3. Delegate to gsd-integration-checker agent:
   - Check cross-phase wiring
   - Check E2E flows
   - Check requirement coverage
4. Aggregate findings into MILESTONE-AUDIT.md:
   - Integration issues (from integration-checker)
   - Tech debt items (from summaries)
   - Deferred items (from verification reports)
   - Incomplete requirements (from REQUIREMENTS.md checkbox status)
5. Commit via gsd_commit
6. Route to /gsd-complete-milestone
```

### K3: gsd-complete-milestone SKILL.md

```markdown
## Preconditions
- .planning/ exists
- Recommend audit first (check if MILESTONE-AUDIT.md exists, suggest if not)
- All phases should have SUMMARYs

## Steps
1. Gather milestone stats via gsd_milestone_stats
2. Present summary for user approval:
   - Phase count, plan count, task count
   - Key accomplishments (from SUMMARY one-liners)
   - Outstanding issues (from audit if exists)
3. On approval:
   a. Archive via gsd_milestone_archive (moves files to .planning/milestones/{version}/)
   b. Git tag via execute tool: git tag -a {version} -m "Milestone {version}: {name}"
   c. Commit archive via gsd_commit
4. Route to /gsd-new-milestone
```

### K4: gsd-new-milestone SKILL.md

```markdown
## Preconditions
- .planning/PROJECT.md exists
- Previous milestone is complete (or this is the first)

## Steps
1. Read prior milestones from .planning/milestones/ for context
2. Question user:
   - What's the theme/focus of this milestone?
   - Target version number?
   - Any carryover items from previous milestone?
3. Similar to new-project but context-aware:
   - Skip PROJECT.md creation (already exists)
   - Read prior milestone archives for continuity
   - Create fresh REQUIREMENTS.md, ROADMAP.md, STATE.md
4. Optional research phase (if enabled in config)
5. Commit via gsd_commit
6. Route to /gsd-discuss-phase 1 or /gsd-plan-phase 1
```

---

## Supplement L: Recommended Implementation Order

Phase 2 has deep dependencies. This order minimizes blocked work.

```
LAYER 1 — No dependencies (can parallelize):
  Step 1a-1g: Port 7 agent .md files (independent of each other)
  Step 12:    Copy/adapt templates (independent of everything)
  Step 13:    Copy/adapt references (independent of everything)

LAYER 2 — Depends on understanding agents:
  Step 15:    Add handoff configs to agents (needs agents written)
  Step 2a-2f: Add MCP tools (needs Phase 1 MCP server working)

LAYER 3 — Depends on MCP tools + agents:
  Step 4:     gsd-discuss-phase skill (needs MCP + no agent delegation)
  Step 8:     gsd-map-codebase skill (needs MCP + codebase-mapper agent)
  Step 9:     gsd-debug skill (needs MCP + debugger agent)
  Step 11:    Remaining prompt files (needs MCP)

LAYER 4 — Depends on multiple agents + MCP:
  Step 3:     gsd-new-project skill (needs researcher + synthesizer + roadmapper agents + MCP)
  Step 5:     gsd-plan-phase skill (needs researcher + planner + checker agents + MCP)

LAYER 5 — Depends on plan-phase:
  Step 6:     gsd-execute-phase skill (needs executor + verifier agents + MCP)

LAYER 6 — Depends on execute-phase:
  Step 7:     gsd-verify-work skill (needs MCP + UAT templates)
  Step 10:    Milestone skills (needs everything)

LAYER 7 — Final:
  Step 14:    Session start hook (needs working system)
  Step 16:    End-to-end integration testing (needs everything)
```

**Critical path:** `MCP tools → agents → plan-phase skill → execute-phase skill → verify-work skill → milestone skills → E2E test`

**Estimated file count per layer:**

| Layer | Files | Description |
|---|---|---|
| 1 | ~35 | 7 agents + ~20 templates + ~9 references |
| 2 | ~15 | MCP tool handlers + handoff configs |
| 3 | ~8 | 3 simpler skills + 5 prompt files |
| 4 | ~6 | 2 complex skills |
| 5 | ~4 | 1 complex skill |
| 6 | ~5 | 2 skills |
| 7 | ~2 | Hook + test |
| **Total** | **~75** | (Phase 2 plan estimated ~60, difference is references/templates) |
