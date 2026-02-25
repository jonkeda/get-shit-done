# Phase 2: Full Orchestration — Complete Project Lifecycle

**Goal:** Port the entire GSD project lifecycle so a user can go from `new-project` through `complete-milestone` entirely within Copilot.

**Depends on:** Phase 1 (MCP server, core agents, prompt files, copilot-instructions).  
**Validates:** Complex multi-agent orchestration works end-to-end in Copilot.

---

## Step 1: Port Remaining 7 Agents

Create `.agent.md` files for all agents not covered in Phase 1.

### Step 1a: `gsd-phase-researcher.agent.md`

**Source:** `agents/gsd-phase-researcher.md`

```yaml
---
description: "Researches how to implement a phase before planning — produces RESEARCH.md"
tools: [read, search, web, execute]
model: [claude-sonnet-4, gpt-4.1]
user-invocable: false
---
```

Key adaptations:
- Replace Context7 MCP references (`mcp__context7__resolve-library-id`, `mcp__context7__query-docs`) with equivalent MCP tool calls — these work natively in Copilot if the Context7 MCP server is configured
- Replace `WebSearch` / `WebFetch` with Copilot's `web` tool alias (built-in)
- Replace `gsd-tools.cjs websearch` (Brave API) with native web search
- Keep the source hierarchy: Context7 → Official Docs → Web Search
- Keep verification protocol, confidence levels, pre-submission checklist

### Step 1b: `gsd-project-researcher.agent.md`

**Source:** `agents/gsd-project-researcher.md`

```yaml
---
description: "Researches domain ecosystem before roadmap creation — produces research/ files"
tools: [read, search, web, execute]
model: [claude-sonnet-4, gpt-4.1]
user-invocable: false
---
```

Key adaptations:
- Same web/MCP tool mapping as phase-researcher
- Keep three research modes (ecosystem, feasibility, comparison)
- Keep parallel-safe design: writes files, does NOT commit
- Keep feature categorization (Table Stakes, Differentiators, Anti-Features)

### Step 1c: `gsd-research-synthesizer.agent.md`

**Source:** `agents/gsd-research-synthesizer.md`

```yaml
---
description: "Synthesizes research from parallel researcher agents into cohesive SUMMARY.md"
tools: [read, edit, execute]
model: [claude-sonnet-4, gpt-4.1]
user-invocable: false
---
```

Key adaptations:
- Replace `gsd-tools.cjs commit` with `gsd_commit` MCP tool
- Keep "synthesized not concatenated" quality principle
- Keep commit aggregation pattern: this agent commits ALL research files

### Step 1d: `gsd-roadmapper.agent.md`

**Source:** `agents/gsd-roadmapper.md`

```yaml
---
description: "Creates project roadmaps mapping requirements to phases with goal-backward success criteria"
tools: [read, edit, execute]
model: [claude-sonnet-4, gpt-4.1]
user-invocable: false
---
```

Key adaptations:
- Replace `gsd-tools.cjs` state management with MCP tool calls
- Keep 100% requirement coverage enforcement
- Keep depth calibration (quick/standard/comprehensive)
- Keep anti-enterprise philosophy

### Step 1e: `gsd-debugger.agent.md`

**Source:** `agents/gsd-debugger.md`

```yaml
---
description: "Systematic debugging using scientific method with persistent debug sessions"
tools: [read, edit, execute, search, web]
model: [claude-sonnet-4, gpt-4.1]
user-invocable: true
---
```

Note: `user-invocable: true` — debugger can be invoked directly by typing `@gsd-debugger`.

Key adaptations:
- Replace `gsd-tools.cjs state load` / `gsd-tools.cjs commit` with MCP tools
- Keep scientific method: hypothesis → prediction → experiment → observe → conclude
- Keep cognitive bias countermeasures table
- Keep persistent file protocol (debug file IS the debugging brain)
- Keep investigation techniques catalog

### Step 1f: `gsd-codebase-mapper.agent.md`

**Source:** `agents/gsd-codebase-mapper.md`

```yaml
---
description: "Explores codebase and writes structured analysis to .planning/codebase/"
tools: [read, execute, search]
model: [claude-haiku-3.5, claude-sonnet-4]
user-invocable: false
---
```

Key adaptations:
- Keep focus-area parameterization (tech, arch, quality, concerns)
- Keep downstream consumer awareness (`<why_this_matters>` section)
- Keep forbidden files list (secrets protection)
- Keep minimal return contract (10-line confirmation, not document contents)

### Step 1g: `gsd-integration-checker.agent.md`

**Source:** `agents/gsd-integration-checker.md`

```yaml
---
description: "Verifies cross-phase integration and E2E flows — existence ≠ integration"
tools: [read, execute, search]
model: [claude-sonnet-4, gpt-4.1]
user-invocable: false
---
```

Key adaptations:
- Keep "Existence ≠ Integration" principle
- Keep provides/consumes mapping pattern
- Keep both-direction checking
- Keep structured YAML output format

**Validation:** All 11 agents visible in agent picker. Only `gsd-debugger` is user-invocable.

---

## Step 2: Extend MCP Server for Phase 2 Operations

Add the remaining tools that complex workflows need.

### Step 2a: Plan structure verification tools

| Tool Name | Source | Input | Output |
|-----------|--------|-------|--------|
| `gsd_verify_plan_structure` | `lib/verify.cjs` | `{plan_file}` | Validation result (pass/fail + issues) |
| `gsd_verify_artifacts` | `lib/verify.cjs` | `{phase}` | Artifact existence check results |
| `gsd_verify_key_links` | `lib/verify.cjs` | `{phase}` | Import/export wiring results |
| `gsd_verify_commits` | `lib/verify.cjs` | `{phase}` | Git commit verification |

### Step 2b: Frontmatter tools

| Tool Name | Source | Input | Output |
|-----------|--------|-------|--------|
| `gsd_frontmatter_get` | `lib/frontmatter.cjs` | `{file, key?}` | Parsed frontmatter (or specific key) |
| `gsd_frontmatter_set` | `lib/frontmatter.cjs` | `{file, key, value}` | Updated file |
| `gsd_frontmatter_validate` | `lib/frontmatter.cjs` | `{file, schema}` | Validation result |

### Step 2c: Template tools

| Tool Name | Source | Input | Output |
|-----------|--------|-------|--------|
| `gsd_template_fill` | `lib/template.cjs` | `{template, vars}` | Filled template content |
| `gsd_scaffold_phase_dir` | `lib/phase.cjs` | `{phase, name}` | Created directory path |
| `gsd_scaffold_context` | `lib/template.cjs` | `{phase}` | Created CONTEXT.md path |

### Step 2d: Advanced roadmap tools

| Tool Name | Source | Input | Output |
|-----------|--------|-------|--------|
| `gsd_roadmap_update_plan_progress` | `lib/roadmap.cjs` | `{phase, plan, status}` | Updated roadmap |
| `gsd_roadmap_update_phase_status` | `lib/roadmap.cjs` | `{phase, status}` | Updated roadmap |

### Step 2e: History and summary tools

| Tool Name | Source | Input | Output |
|-----------|--------|-------|--------|
| `gsd_history_digest` | `lib/commands.cjs` | `{phase?}` | Digest of relevant prior summaries |
| `gsd_summary_extract` | `lib/commands.cjs` | `{file}` | One-liner from SUMMARY.md |
| `gsd_find_phase` | `lib/phase.cjs` | `{phase}` | Phase directory path + metadata |

### Step 2f: Milestone tools

| Tool Name | Source | Input | Output |
|-----------|--------|-------|--------|
| `gsd_milestone_archive` | `lib/milestone.cjs` | `{version}` | Archived file paths |
| `gsd_milestone_stats` | `lib/milestone.cjs` | `{version?}` | Phase/plan/task/LOC counts |

**Validation:** All MCP tools callable from Copilot chat. Test each with sample data.

---

## Step 3: Create `gsd-new-project` Skill

The most complex skill — full project initialization.

### Step 3a: Skill structure

```
.github/skills/gsd-new-project/
├── SKILL.md
├── references/
│   ├── questioning-workflow.md         ← from workflows/new-project.md (questioning section)
│   ├── research-workflow.md            ← from workflows/new-project.md (research section)
│   ├── requirements-workflow.md        ← from workflows/new-project.md (requirements section)
│   ├── roadmap-workflow.md             ← from workflows/new-project.md (roadmap section)
│   └── questioning-reference.md        ← from references/questioning.md
└── templates/
    ├── project.md
    ├── requirements.md
    ├── roadmap.md
    ├── state.md
    ├── config.json
    └── discovery.md
```

### Step 3b: SKILL.md orchestration

The SKILL.md defines the top-level flow:

1. **Check preconditions** — Error if `.planning/PROJECT.md` exists
2. **Parse flags** — `--auto` mode detection, check for `@` referenced idea docs
3. **Phase 1: Configuration** — Call `gsd_config_ensure` MCP tool, present 3 questions (mode, depth, model_profile)
4. **Phase 2: Discovery** — Interactive questioning flow:
   - Core questions: What are you building? Who is it for? What's the core value?
   - Depth questions: Technical constraints? Existing code? Similar products?
   - Edge case questions: Scale? Authentication? Payments? Real-time?
   - Use skill reference `questioning-workflow.md` for detailed flow
5. **Phase 3: Write PROJECT.md** — Fill template, write to `.planning/PROJECT.md`
6. **Phase 4: Research (optional)** — If `workflow.research` enabled:
   - Delegate to `gsd-project-researcher` agent (via subagent) — 4 sequential calls with different focus areas (stack, features, architecture, pitfalls)
   - Note: In Claude Code these run in parallel. In Copilot, sequential.
   - Delegate to `gsd-research-synthesizer` agent to merge results
7. **Phase 5: Requirements** — Extract requirements from PROJECT.md + research, categorize (v1/v2/out-of-scope), assign REQ-IDs, write REQUIREMENTS.md
8. **Phase 6: Roadmap** — Delegate to `gsd-roadmapper` agent, present for approval
9. **Phase 7: Commit** — Commit all `.planning/` files via `gsd_commit`
10. **Phase 8: Route** — Suggest `/gsd-discuss-phase 1` or `/gsd-plan-phase 1`

### Step 3c: Port questioning reference

`references/questioning-reference.md` — from `references/questioning.md`:
- Question types: open-ended, multiple-choice, confirmation
- Depth calibration by project complexity
- Domain-specific question sets
- When to stop asking rules

**Validation:** `/gsd-new-project` → should walk through full init, produce PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md.

---

## Step 4: Create `gsd-discuss-phase` Skill

### Step 4a: Skill structure

```
.github/skills/gsd-discuss-phase/
├── SKILL.md
└── templates/
    └── context.md
```

### Step 4b: SKILL.md orchestration

1. Validate phase number
2. Check if CONTEXT.md exists (offer update/view/skip)
3. Read ROADMAP.md phase description — extract phase boundary
4. Analyze phase domain → generate gray areas:
   - Visual: layout, density, interactions, empty states
   - API/CLI: response format, flags, error handling
   - Content: structure, tone, depth
   - Organization: grouping, naming, duplicates
5. Present gray areas with multi-select
6. For each selected area: ask 4 questions, offer next/add-more
7. Write `{phase_num}-CONTEXT.md` using template
8. Offer next steps: `/gsd-research-phase` or `/gsd-plan-phase`

**Validation:** `/gsd-discuss-phase 1` → interactive questioning, produces CONTEXT.md.

---

## Step 5: Create `gsd-plan-phase` Skill

The second most complex orchestration — research → plan → verify loop.

### Step 5a: Skill structure

```
.github/skills/gsd-plan-phase/
├── SKILL.md
├── references/
│   ├── research-workflow.md
│   ├── planning-workflow.md
│   ├── plan-checking.md
│   └── plan-revision.md
└── templates/
    ├── phase-prompt.md         ← PLAN.md template
    ├── research.md             ← RESEARCH.md template
    └── validation.md           ← VALIDATION.md template
```

### Step 5b: SKILL.md orchestration

1. **Parse flags:** `--research`, `--skip-research`, `--gaps`, `--skip-verify`, `--prd <file>`, `--auto`
2. **Initialize:** Call `gsd_init_phase_op` + `gsd_roadmap_get_phase` MCP tools
3. **PRD handling (if `--prd`):** Read PRD file, parse into CONTEXT.md format
4. **Research step (unless `--skip-research` or `--gaps`):**
   - Check for existing RESEARCH.md (reuse/refresh/skip)
   - Delegate to `gsd-phase-researcher` agent via subagent
   - Agent produces `{phase}-RESEARCH.md`
5. **Planning step:**
   - Delegate to `gsd-planner` agent via subagent
   - Agent reads: STATE.md, ROADMAP.md, REQUIREMENTS.md, CONTEXT.md, RESEARCH.md, codebase docs, prior summaries  
   - Agent produces: one or more `{phase}-{NN}-PLAN.md` files
   - Agent updates ROADMAP.md with plan count
   - Agent commits plans
6. **Verification loop (unless `--skip-verify`):**
   - Delegate to `gsd-plan-checker` agent via subagent
   - Checker reads all PLANs + ROADMAP + CONTEXT + RESEARCH
   - If PASSED → done
   - If ISSUES FOUND → feed issues back to planner (subagent), re-check (max 3 iterations)
7. **Gap closure mode (`--gaps`):**
   - Read VERIFICATION.md for gaps
   - Skip research
   - Planner creates fix plans only
8. **Completion:** Present plan summary, suggest `/gsd-execute-phase`

**Validation:** `/gsd-plan-phase 1` → researcher runs, planner creates PLANs, checker verifies, loop resolves. Final PLANs committed.

---

## Step 6: Create `gsd-execute-phase` Skill

Wave-based execution, adapted for sequential subagent calls.

### Step 6a: Skill structure

```
.github/skills/gsd-execute-phase/
├── SKILL.md
├── references/
│   ├── execute-plan-workflow.md     ← per-plan execution protocol
│   ├── wave-logic.md                ← dependency analysis and ordering
│   ├── deviation-rules.md           ← R1-R4 deviation rules
│   └── checkpoint-protocol.md       ← human checkpoint handling
└── templates/
    ├── summary.md
    └── verification-report.md
```

### Step 6b: SKILL.md orchestration

1. **Initialize:** Call `gsd_init_phase_op` MCP tool, get plans list
2. **Parse flags:** `--gaps-only` (filter for `gap_closure: true` plans)
3. **Wave analysis:**
   - Read frontmatter of each PLAN.md (wave number, depends_on)
   - Group plans by wave number
   - Within each wave, sort by plan number
   - Display wave structure diagram
4. **Execute waves sequentially:**
   - For each wave:
     - For each plan in wave (sequential in Copilot, would be parallel in Claude Code):
       - Present: "Executing Plan {N}: {title}"
       - Delegate to `gsd-executor` agent via subagent
       - Pass: PLAN.md path, STATE.md, config, project conventions
       - Agent produces: per-task commits, SUMMARY.md
       - Spot-check: verify SUMMARY.md exists, verify git commits
       - If CHECKPOINT REACHED: present to user, collect response, spawn continuation subagent
     - Wave completion checkpoint (if `gates.execute_next_plan` enabled)
5. **Post-execution verification (if `workflow.verifier` enabled):**
   - Delegate to `gsd-verifier` agent via subagent
   - Agent reads: PLAN.md must_haves, SUMMARY.md claims, actual codebase
   - Agent produces: VERIFICATION.md
   - Present results:
     - PASSED → celebration
     - GAPS FOUND → offer `/gsd-plan-phase --gaps` or accept
     - HUMAN NEEDED → present human verification items
6. **Completion:** Update STATE.md position, present summary, suggest `/gsd-verify-work`

**Key difference from Claude Code:** Plans within a wave execute sequentially, not in parallel. The wave grouping still matters for correctness (dependency ordering), but not for parallelism.

**Validation:** `/gsd-execute-phase 1` → executes plans in wave order, produces commits + summaries + verification.

---

## Step 7: Create `gsd-verify-work` Skill

UAT + goal-backward verification.

### Step 7a: Skill structure

```
.github/skills/gsd-verify-work/
├── SKILL.md
├── references/
│   ├── uat-workflow.md              ← UAT testing protocol
│   └── diagnosis-workflow.md        ← diagnose-issues flow
└── templates/
    └── UAT.md
```

### Step 7b: SKILL.md orchestration

1. **Initialize:** Parse phase number, load STATE.md, check for existing UAT session
2. **Extract testable deliverables:** Read VERIFICATION.md, PLAN.md must_haves, ROADMAP.md success criteria
3. **Walk through each deliverable:**
   - Present test instruction: "Can you [do X]?"
   - User responds: pass / fail / describe issue
   - For failures: use diagnose-issues reference to spawn `gsd-debugger` subagent for root cause analysis
4. **For each diagnosed failure:**
   - Create gap-closure PLAN.md with fix tasks
   - Mark in UAT tracking
5. **Write UAT.md:** Record all test results, pass/fail status, diagnosis results
6. **Route:**
   - All passed → suggest `/gsd-audit-milestone` or next phase
   - Failures with fix plans → suggest `/gsd-execute-phase --gaps-only`
   - Undiagnosable → suggest manual investigation

**Validation:** `/gsd-verify-work 1` → interactive UAT walk-through, produces UAT.md, creates fix plans for failures.

---

## Step 8: Create `gsd-map-codebase` Skill

Brownfield codebase analysis.

### Step 8a: Skill structure

```
.github/skills/gsd-map-codebase/
├── SKILL.md
└── templates/
    └── codebase/
        ├── STACK.md
        ├── ARCHITECTURE.md
        ├── CONVENTIONS.md
        └── CONCERNS.md
```

### Step 8b: SKILL.md orchestration

1. Check if `.planning/codebase/` exists (offer refresh/skip)
2. Create directory structure
3. Execute 4 sequential `gsd-codebase-mapper` subagent calls:
   - Call 1: `focus=tech` → STACK.md, INTEGRATIONS.md
   - Call 2: `focus=arch` → ARCHITECTURE.md, STRUCTURE.md
   - Call 3: `focus=quality` → CONVENTIONS.md, TESTING.md
   - Call 4: `focus=concerns` → CONCERNS.md
4. Verify all 7 documents exist
5. Commit via `gsd_commit`
6. Suggest `/gsd-new-project`

**Note:** In Claude Code these 4 calls run in parallel. In Copilot, sequential. Slower but identical output.

**Validation:** `/gsd-map-codebase` on an existing project → produces 7 analysis docs.

---

## Step 9: Create `gsd-debug` Skill

Scientific debugging with persistent sessions.

### Step 9a: Skill structure

```
.github/skills/gsd-debug/
├── SKILL.md
└── templates/
    └── debug-session.md
```

### Step 9b: SKILL.md orchestration

1. Check for active sessions in `.planning/debug/*.md`
2. If resuming: read debug file, present current state
3. If new: gather symptoms (5 questions: expected, actual, errors, timeline, reproduction)
4. Delegate to `gsd-debugger` agent via subagent
5. Handle returns:
   - ROOT CAUSE FOUND → offer fix/plan/manual
   - CHECKPOINT REACHED → present findings, ask user, spawn continuation
   - INVESTIGATION INCONCLUSIVE → offer continue/add-context/manual
6. For continuations: spawn fresh subagent with prior state from debug file

**Validation:** `/gsd-debug "Login button unresponsive"` → symptom gathering, hypothesis testing, root cause identification.

---

## Step 10: Create Milestone Skills

### Step 10a: `gsd-new-milestone` skill

```
.github/skills/gsd-milestone/
├── SKILL.md
└── references/
    ├── new-milestone-workflow.md
    ├── audit-milestone-workflow.md
    └── complete-milestone-workflow.md
```

**SKILL.md** covers three sub-commands (or create 3 separate skills):

**New milestone flow:**
1. Prompt for milestone name/version
2. Similar to new-project: questioning → research → requirements → roadmap
3. But context-aware: reads existing PROJECT.md, prior milestone archives

**Audit milestone flow:**
1. Read all VERIFICATION.md files for current milestone's phases
2. Aggregate tech debt, deferred items, gaps
3. Delegate to `gsd-integration-checker` subagent for cross-phase wiring
4. Produce MILESTONE-AUDIT.md

**Complete milestone flow:**
1. Check for audit (recommend if missing)
2. Verify all phases have SUMMARYs
3. Gather stats, extract accomplishments
4. Archive to `.planning/milestones/`
5. Git tag
6. Suggest `/gsd-new-milestone`

**Validation:** Full milestone lifecycle: audit → complete → new.

---

## Step 11: Create Remaining Prompt Files

### Step 11a: `gsd-research-phase.prompt.md`

```yaml
---
mode: agent
description: "Deep ecosystem research for a phase (standalone)"
tools: [read, search, web, execute, agent]
---
```

Body: Initialize, validate phase, delegate to `gsd-phase-researcher` agent, handle returns.

### Step 11b: `gsd-list-phase-assumptions.prompt.md`

```yaml
---
mode: agent
description: "Surface Claude's assumptions about a phase approach before planning"
tools: [read, execute, search]
---
```

Body: Read ROADMAP.md phase, analyze and surface assumptions about technical approach, implementation order, scope, risks, dependencies. Conversational only — no file creation.

### Step 11c: `gsd-plan-milestone-gaps.prompt.md`

```yaml
---
mode: agent
description: "Create phases to close gaps identified by milestone audit"
tools: [read, edit, execute]
---
```

Body: Read MILESTONE-AUDIT.md, group gaps into logical phases, confirm with user, create phase entries in ROADMAP.md.

### Step 11d: `gsd-cleanup.prompt.md`

**Source:** `commands/gsd/cleanup.md`

```yaml
---
mode: agent
description: "Clean up completed debug sessions and archived planning artifacts"
tools: [read, edit, execute]
---
```

### Step 11e: `gsd-health.prompt.md`

**Source:** `commands/gsd/health.md`

```yaml
---
mode: agent
description: "Check project health — file integrity, state consistency, config validation"
tools: [read, execute, search]
---
```

---

## Step 12: Port All Remaining Templates

| Template | Source | Target Skill |
|----------|--------|-------------|
| `discovery.md` | `templates/discovery.md` | `gsd-new-project` |
| `requirements.md` | `templates/requirements.md` | `gsd-new-project` |
| `roadmap.md` | `templates/roadmap.md` | `gsd-new-project` |
| `milestone-archive.md` | `templates/milestone-archive.md` | `gsd-milestone` |
| `research.md` | `templates/research.md` | `gsd-plan-phase` |
| `retrospective.md` | `templates/retrospective.md` | `gsd-milestone` |
| `UAT.md` | `templates/UAT.md` | `gsd-verify-work` |
| `VALIDATION.md` | `templates/VALIDATION.md` | `gsd-plan-phase` |
| `verification-report.md` | `templates/verification-report.md` | `gsd-execute-phase` |
| `debug-subagent-prompt.md` | `templates/debug-subagent-prompt.md` | `gsd-debug` |
| `planner-subagent-prompt.md` | `templates/planner-subagent-prompt.md` | `gsd-plan-phase` |
| `codebase/*` (7 files) | `templates/codebase/` | `gsd-map-codebase` |
| `research-project/*` | `templates/research-project/` | `gsd-new-project` |
| `summary-*.md` (4 files) | `templates/summary-*.md` | `gsd-execute-phase` |

---

## Step 13: Port All Remaining References

| Reference | Source | Target |
|-----------|--------|--------|
| `checkpoints.md` | `references/checkpoints.md` | `.gsd/references/` |
| `continuation-format.md` | `references/continuation-format.md` | `.gsd/references/` |
| `decimal-phase-calculation.md` | `references/decimal-phase-calculation.md` | `.gsd/references/` |
| `git-planning-commit.md` | `references/git-planning-commit.md` | `.gsd/references/` |
| `model-profile-resolution.md` | `references/model-profile-resolution.md` | `.gsd/references/` |
| `phase-argument-parsing.md` | `references/phase-argument-parsing.md` | `.gsd/references/` |
| `planning-config.md` | `references/planning-config.md` | `.gsd/references/` |
| `questioning.md` | `references/questioning.md` | `gsd-new-project/references/` |
| `tdd.md` | `references/tdd.md` | `.gsd/references/` |

---

## Step 14: Create Session Start Hook

Port the update-check hook.

`.gsd/hooks/check-update.js`:
- Spawn detached background process
- Read installed VERSION file
- Query npm for latest version
- Write result to cache file

`.github/hooks/session-start.json`:
```json
{
  "event": "SessionStart",
  "command": "node ${workspaceFolder}/.gsd/hooks/check-update.js"
}
```

---

## Step 15: Add Handoff Support Between Agents

Configure `handoffs:` in agent YAML frontmatter so agents can chain to each other naturally:

```yaml
# gsd-planner.agent.md
handoffs:
  - gsd-plan-checker    # After planning, hand off for verification
  - gsd-executor        # Alternative: direct to execution

# gsd-executor.agent.md  
handoffs:
  - gsd-verifier        # After execution, hand off for verification

# gsd-debugger.agent.md
handoffs:
  - gsd-executor        # After finding fix, hand off for implementation
```

This enables natural agent chaining without explicit orchestration in some cases.

---

## Step 16: End-to-End Integration Testing

Full lifecycle test:

1. `/gsd-map-codebase` on an existing project → 7 codebase docs
2. `/gsd-new-project` → full init with questioning, research, requirements, roadmap
3. `/gsd-discuss-phase 1` → interactive preferences, CONTEXT.md
4. `/gsd-plan-phase 1` → research, planning, verification loop
5. `/gsd-execute-phase 1` → sequential wave execution, commits, summaries
6. `/gsd-verify-work 1` → UAT walk-through
7. Repeat steps 3-6 for phase 2-3
8. `/gsd-audit-milestone` → integration checking
9. `/gsd-complete-milestone v1.0` → archive, tag
10. `/gsd-new-milestone v1.1` → new cycle
11. `/gsd-debug "some issue"` → debug session
12. `/gsd-quick "fix typo"` → quick task execution

**Edge cases to test:**
- Resume after context reset (session memory + STATE.md)
- Pause mid-execution, resume in new session
- Plan-checker rejection → revision loop
- Executor checkpoint → user input → continuation
- Gap closure flow: verify-work → plan --gaps → execute --gaps-only
- Decimal phase insertion between existing phases

---

## Phase 2 Deliverables

| Component | Count | Status |
|-----------|-------|--------|
| New `.agent.md` files | 7 (total: 11) | |
| New MCP tools | ~15 (total: ~35) | |
| New skills | 7 | |
| New `.prompt.md` files | 5 (total: 17) | |
| New templates | ~20 (total: ~23) | |
| New references | ~9 (total: ~13) | |
| Hook scripts | 1 (total: 2) | |
| Agent handoff configs | 3+ agents | |
| **Total new files** | **~60** | |
