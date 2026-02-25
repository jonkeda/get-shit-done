# Phase 2 Supplementary Specs — Part 2

These specs fill gaps NOT covered by `phase-2-supplementary-specs.md`. Read these alongside both the Phase 2 plan and Part 1 of the supplementary specs.

---

## Supplement I: Verification Module — Complete Internal Specification

The existing Phase 2 supplementary specs (Supplement C1) define MCP tool input/output schemas for verification tools. This supplement provides the **internal behavioral contracts** — how each function works, what it checks, and the exact validation logic.

### I1: Full Function Registry

| # | Function | Lines | Complexity | Phase 2 Skill Users |
|---|----------|-------|------------|---------------------|
| 1 | `cmdVerifySummary` | ~80 | Medium | execute-phase (spot-check), verify-work |
| 2 | `cmdVerifyPlanStructure` | ~90 | Medium | plan-phase (checker), execute-phase (pre-check) |
| 3 | `cmdVerifyPhaseCompleteness` | ~40 | Low | execute-phase (wave completion), audit-milestone |
| 4 | `cmdVerifyReferences` | ~60 | Medium | plan-checker agent, verifier agent |
| 5 | `cmdVerifyCommits` | ~30 | Low | execute-phase (spot-check), verify-work |
| 6 | `cmdVerifyArtifacts` | ~70 | High | verifier agent, execute-phase (post-check) |
| 7 | `cmdVerifyKeyLinks` | ~60 | High | verifier agent, integration-checker agent |
| 8 | `cmdValidateConsistency` | ~80 | High | health prompt, audit-milestone |
| 9 | `cmdValidateHealth` | ~120 | High | health prompt |

### I2: Summary Verification Deep Dive (`cmdVerifySummary`)

**4-check protocol:**

1. **File existence** — does the SUMMARY.md exist at the specified path?

2. **File spot-check** — extract `key-files.created` and `key-files.modified` from frontmatter. Pick up to `check_file_count` (default: 5) files at random. Verify each exists on disk via `fs.existsSync`. Return `{ checked, found, missing[] }`.

3. **Commit hash validation** — scan SUMMARY.md body for inline code backticks matching `/[a-f0-9]{7,40}/`. For each extracted hash, run `git cat-file -t {hash}` — if it returns "commit", it's valid. Return aggregate `commits_exist: true` only if ALL extracted hashes are valid.

4. **Self-check section** — search for heading matching `## Self-Check`, `## Verification`, or `## Quality Check`. If found, scan below it for:
   - Pass indicators: `✓`, `✅`, `PASSED`, `pass`
   - Fail indicators: `✗`, `❌`, `FAILED`, `fail`
   - If more pass than fail → `'passed'`. If any fail → `'failed'`. If no section → `'not_found'`.

### I3: Plan Structure Verification Deep Dive (`cmdVerifyPlanStructure`)

**Validation steps:**

1. **Frontmatter completeness** — extract frontmatter via `extractFrontmatter()`. Check for all 8 required fields:
   ```
   phase, plan, type, wave, depends_on, files_modified, autonomous, must_haves
   ```
   Missing field → error.

2. **Task XML parsing** — regex scan for `<task` elements. For each task:
   - Extract `<name>` → error if missing
   - Extract `<action>` → error if missing
   - Extract `<verify>` → warning if missing
   - Extract `<done>` → warning if missing
   - Extract `<files>` → warning if missing
   - Extract `type` attribute (if present): validate against known types (`standard`, `checkpoint:human-verify`, `checkpoint:decision`, `checkpoint:human-action`)

3. **Autonomous/checkpoint constraint** — if ANY task has `type="checkpoint:*"`, then frontmatter `autonomous` MUST be `false`. Violation → error: "Plan contains checkpoint tasks but autonomous is true."

4. **Wave/depends_on sanity** — if `wave: 1` and `depends_on` is non-empty → warning: "Wave 1 plans typically have no dependencies."

### I4: Phase Completeness Deep Dive (`cmdVerifyPhaseCompleteness`)

**Matching algorithm:**

```
1. List all files in phase directory matching *-PLAN.md
2. Extract plan ID from each: e.g., "01-02" from "01-02-PLAN.md"
3. List all files matching *-SUMMARY.md
4. Extract plan ID from each: e.g., "01-02" from "01-02-SUMMARY.md"
5. incomplete_plans = plan_IDs - summary_IDs
6. orphan_summaries = summary_IDs - plan_IDs
7. complete = (incomplete_plans.length === 0)
```

### I5: Reference Verification Deep Dive (`cmdVerifyReferences`)

**Path extraction patterns:**

1. `@path/to/file` — explicit @ references (from Claude Code convention)
2. `` `path/to/file` `` — backtick paths containing `/` (excludes single-word backtick code)
3. `./relative/path` — relative path references

For each extracted path, resolve relative to workspace root and check `fs.existsSync`.

### I6: Artifact Verification Deep Dive (`cmdVerifyArtifacts`)

**Uses `parseMustHavesBlock()` from frontmatter.cjs** to extract `must_haves.artifacts`.

Per-artifact checks (in order):

1. **Exists** — `fs.existsSync(path)`. If not → fail immediately, skip remaining checks.
2. **min_lines** — `content.split('\n').length >= min_lines`. If not → issue: "File has {N} lines, expected at least {min_lines}."
3. **contains** — `content.includes(pattern)`. If not → issue: "File does not contain '{pattern}'."
4. **exports** — for each export name, check `content.includes(exportName)`. If not → issue: "File does not export '{exportName}'."

An artifact passes only if ALL checks pass.

### I7: Key Links Verification Deep Dive (`cmdVerifyKeyLinks`)

**Uses `parseMustHavesBlock()` from frontmatter.cjs** to extract `must_haves.key_links`.

Per-link verification:

1. Read `from` file content
2. Read `to` file content
3. If `pattern` provided:
   - Create regex from pattern string
   - Test against `from` content → `from_match`
   - Test against `to` content → `to_match`
   - Verified if BOTH match
4. If no `pattern`:
   - Check if `from` content contains any reference to `to` file (import, require, path)
   - OR check if `to` content contains any reference to `from` file
   - Verified if either direction references the other

---

## Supplement J: Health Check & Repair System

### J1: Health Check Pipeline

The `cmdValidateHealth` function runs 8 sequential checks:

```
Check 1: .planning/ directory exists                    → E001 if missing
Check 2: .planning/PROJECT.md exists                    → E002 if missing
Check 3: PROJECT.md has required sections               → W001 per missing section
Check 4: .planning/ROADMAP.md exists                    → E003 if missing
Check 5: .planning/STATE.md exists                      → E004 if missing (repairable)
Check 6: STATE.md phase reference is valid              → W002 if dangling (repairable)
Check 7: .planning/config.json exists and is valid JSON → W003/E005 (repairable)
         - If missing: W003 (create)
         - If invalid JSON: E005 (reset)
         - If present but invalid model_profile: W004
Check 8: Phase directory integrity                      → W005/W006/W007
         - W005: directory name doesn't match /^\d{2}(?:\.\d+)*-[\w-]+$/
         - W006: phase in ROADMAP but no directory on disk
         - W007: directory on disk but no phase in ROADMAP
Bonus:   Scan for plans without summaries               → I001 per incomplete plan
```

**Status derivation:**
- Any `E0xx` error → `status: 'broken'`
- No errors but any `W0xx` warning → `status: 'degraded'`
- Clean → `status: 'healthy'`

### J2: Repair Actions

When `repair: true` is passed, after all checks complete:

```
For each issue where repairable === true:
  Execute the repair action:

  createConfig:
    → Write default config JSON to .planning/config.json
    → Defaults: { model_profile: 'balanced', commit_docs: true,
        search_gitignored: false, branching_strategy: 'none',
        research: true, plan_checker: true, verifier: true,
        parallelization: true }

  resetConfig:
    → Same as createConfig (overwrites corrupt file)

  regenerateState:
    → Create backup: STATE.md → STATE.md.bak.{ISO_timestamp}
    → Get milestone info via getMilestoneInfo(cwd)
    → Generate minimal STATE.md:
      ---
      # Session State
      ## Project Reference
      See: .planning/PROJECT.md
      ## Position
      **Milestone:** {version} {name}
      **Current phase:** (determining...)
      **Status:** Resuming
      ## Session Log
      - {YYYY-MM-DD}: STATE.md regenerated by /gsd-health --repair
      ---
```

### J3: Copilot Adaptation for Health Check

In Copilot, the `/gsd-health` prompt calls `gsd_validate_health` MCP tool:

```markdown
## Health Check Flow

1. Call `gsd_validate_health` with `{ repair: false }`
2. Display results grouped by severity:
   - 🔴 ERRORS: {list with codes}
   - 🟡 WARNINGS: {list with codes}
   - ℹ️ INFO: {list}
3. Show overall status: BROKEN / DEGRADED / HEALTHY
4. If repairable_count > 0:
   Ask: "Found {N} auto-repairable issues. Run repair?"
   If yes: Call `gsd_validate_health` with `{ repair: true }`
   Show repair results.
5. For non-repairable issues, suggest corrective commands per error code.
```

---

## Supplement K: `must_haves` Schema — The Planner↔Verifier Contract

The `must_haves` field in PLAN.md frontmatter is the formal contract between the planner (who writes it) and the verifier/checker (who validates it). This is the most critical data structure in GSD's quality assurance loop.

### K1: Full Schema

```yaml
must_haves:
  truths:
    - "plain text assertion that must be true after execution"
    - "e.g., API returns 200 for GET /health"
  artifacts:
    - path: "src/api/health.ts"
      min_lines: 10
      contains: "router.get('/health'"
      exports: ["healthRouter"]
    - path: "tests/health.test.ts"
      min_lines: 5
  key_links:
    - from: "src/api/health.ts"
      to: "src/app.ts"
      via: "healthRouter imported and mounted"
      pattern: "healthRouter"
```

### K2: Field Definitions

**`truths[]`** — string array. Human-readable assertions verified by the `gsd-verifier` agent (not automated tooling). These are success criteria that require understanding context to evaluate.

Examples:
- "Rate limiter middleware is applied to all /api/* routes"
- "Error responses use RFC 7807 problem details format"
- "All database queries use parameterized statements"

**`artifacts[]`** — object array. Machine-verifiable file-level checks run by `gsd_verify_artifacts`:

| Field | Type | Required | Check |
|-------|------|----------|-------|
| `path` | string | Yes | File exists at workspace-relative path |
| `min_lines` | number | No | File has ≥ N lines (not empty/stub) |
| `contains` | string | No | File content includes substring (case-sensitive) |
| `exports` | string \| string[] | No | Export name(s) appear in file content |

**`key_links[]`** — object array. Machine-verifiable cross-file integration checks run by `gsd_verify_key_links`:

| Field | Type | Required | Check |
|-------|------|----------|-------|
| `from` | string | Yes | Source file path |
| `to` | string | Yes | Target file path |
| `via` | string | No | Human-readable description of the connection |
| `pattern` | string | No | Regex pattern tested against BOTH files |

### K3: How Each GSD Component Uses `must_haves`

| Component | Reads/Writes | Purpose |
|-----------|-------------|---------|
| `gsd-planner` agent | **Writes** | Defines success criteria during planning |
| `gsd-plan-checker` agent | Reads truths + artifacts + key_links | Verifies plan quality: are criteria specific? testable? complete? |
| `gsd-executor` agent | Reads truths | Uses as implementation guide and self-check reference |
| `gsd-verifier` agent | Reads all | Post-execution goal-backward verification against actual codebase |
| `gsd_verify_artifacts` tool | Reads artifacts | Automated Level 1-2 checks (exists, substantive) |
| `gsd_verify_key_links` tool | Reads key_links | Automated Level 3 checks (wired) |

### K4: Quality Guidelines for Planners

The planner agent should follow these rules when writing `must_haves`:

1. **Every plan MUST have at least 1 truth and 1 artifact** — empty `must_haves` is a plan-checker rejection
2. **Truths should be falsifiable** — "The system works" is bad. "GET /health returns 200 with JSON body" is good.
3. **Artifacts should target the key deliverables, not every file** — 3-5 artifacts per plan, focusing on the most important files
4. **Key links should verify the most critical integration points** — where component A connects to component B. 1-3 per plan.
5. **`contains` patterns should be specific** — "import" is too broad. "import { healthRouter } from './health'" is good.

---

## Supplement L: Decimal Phase Gap-Closure Lifecycle

### L1: What Are Decimal Phases?

Created by `/gsd-insert-phase` to address gaps or issues. Phase `03.1` is a gap-closure phase inserted after phase `03` to fix issues found in `03`'s UAT or verification.

Decimal calculation reference: `references/decimal-phase-calculation.md`

### L2: The `close_parent_artifacts` Step

After all plans in a decimal phase execute and verify, the `execute-phase` skill runs a parent artifact closure step.

**Trigger condition:** Phase number matches `/^\d+\.\d+/` (has decimal component) AND all plans have SUMMARY.md files.

**Steps:**

```markdown
1. IDENTIFY PARENT: Strip decimal → "03.1" becomes "03"

2. FIND PARENT UAT:
   Read .planning/phases/{parent_dir}/{parent}-UAT.md
   If not found → skip (parent never had UAT)

3. UPDATE PARENT UAT:
   For each test in UAT.md with `status: failed`:
     - Check if the failure description maps to work done in this decimal phase
     - If yes: update to `status: resolved, resolved_by: phase {decimal_phase}`
     - If no: leave as `status: failed`

4. RESOLVE DEBUG SESSIONS:
   Check .planning/debug/ for sessions referencing parent phase:
     - Move to .planning/debug/resolved/
     - Add resolution note: "Resolved by gap-closure phase {decimal_phase}"

5. UPDATE PARENT VERIFICATION (if exists):
   Read .planning/phases/{parent_dir}/{parent}-VERIFICATION.md
   If gaps section references items fixed by this decimal phase:
     - Annotate with: "Resolved in phase {decimal_phase}"
```

### L3: Copilot Skill Integration

In the `execute-phase` SKILL.md, after Step 6 (post-execution verification):

```markdown
## Step 7: Gap-Closure Parent Update (decimal phases only)

If the current phase number contains a decimal (e.g., "3.1", "05.2"):

1. Extract parent phase number (strip decimal portion)
2. Check for parent's UAT.md and VERIFICATION.md
3. For each resolved gap:
   - Update the parent's UAT entry to "resolved"
   - Move any related debug sessions to debug/resolved/
4. Commit parent artifact updates via gsd_commit
5. Note: "Updated parent phase {N} artifacts with resolution references"
```

---

## Supplement M: Auto-Advance Flag Propagation

### M1: The Infinite Loop Problem

Without flag propagation controls:
```
plan-phase --auto → spawns execute-phase --auto
  → execute-phase --auto completes → spawns plan-phase --auto for next phase
    → plan-phase --auto → spawns execute-phase --auto
      → (infinite loop)
```

### M2: Flag Definitions

| Flag | Set By | Meaning |
|------|--------|---------|
| `--auto` | User or `workflow.auto_advance: true` config | Skip interactive confirmations |
| `--no-transition` | Parent skill when delegating to child skill | Child must NOT spawn further transitions |

### M3: Propagation Matrix

| Parent Skill | Delegates To | Flags Passed |
|-------------|-------------|--------------|
| `plan-phase --auto` | execute-phase (inline) | `--auto --no-transition` |
| `execute-phase --auto` | verify-work (inline) | `--auto --no-transition` |
| `execute-phase` (normal) | verify-work | (none — user decides) |

### M4: Copilot Implementation

In Copilot's single-conversation model, flags are skill-internal state:

```markdown
## Flag State Management

At the start of skill execution, parse flags:
- auto_mode = true if --auto flag present OR config.workflow.auto_advance is true
- allow_transition = true UNLESS --no-transition flag is present

When delegating to another skill's logic inline:
- Pass auto_mode through
- Set allow_transition = false on the delegated logic

When the skill completes and would normally suggest "next phase":
- If allow_transition is false: present the suggestion but do NOT auto-execute
- If allow_transition is true AND auto_mode is true: auto-execute the next phase
```

### M5: Config Interaction

| Config | Effect on Auto-Advance |
|--------|----------------------|
| `workflow.auto_advance: true` | Equivalent to always passing `--auto` |
| `gates.confirm_transition: true` | Even with `--auto`, ask before phase transitions (plan-to-plan transitions still auto) |
| `safety.always_confirm_destructive: true` | Overrides auto-advance for destructive operations (phase removal, file deletion) |
| `safety.always_confirm_external_services: true` | Overrides auto-advance for external API calls |

---

## Supplement N: Branching Strategy Support

### N1: Strategy Definitions

| Strategy | Config Value | Branch Pattern | Scope |
|----------|-------------|----------------|-------|
| None | `"none"` | No branching — all work on current branch | Default |
| Phase | `"phase"` | `gsd/phase-{NN}-{slug}` | One branch per phase |
| Milestone | `"milestone"` | `gsd/milestone-{version}` | One branch per milestone |

### N2: Branch Lifecycle (Phase Strategy)

```
1. START PHASE:
   - Compute branch name: gsd/phase-{padded_phase}-{phase_slug}
   - Check if branch exists: git branch --list "gsd/phase-*"
   - If exists: git checkout {branch_name}
   - If not: git checkout -b {branch_name}

2. DURING EXECUTION:
   - All commits go to the phase branch
   - No special handling needed

3. PHASE COMPLETE:
   - Present to user: "Phase work is on branch '{branch_name}'"
   - Suggest: "Merge to {parent_branch} when ready"
   - Do NOT auto-merge (user decides merge strategy)
```

### N3: Branch Lifecycle (Milestone Strategy)

```
1. FIRST PHASE IN MILESTONE:
   - Compute branch name: gsd/milestone-{version}
   - git checkout -b {branch_name}

2. SUBSEQUENT PHASES:
   - git checkout {branch_name} (reuse same branch)

3. MILESTONE COMPLETE:
   - Present to user: "Milestone work is on branch '{branch_name}'"
   - Suggest merge + tag
```

### N4: Init Tool Provides Branch Name

The `gsd_init_execute_phase` MCP tool pre-computes the branch name:

```json
{
  "branch_name": "gsd/phase-03-authentication",
  "branching_strategy": "phase",
  "parent_branch": "main"
}
```

The skill only needs to read this and run the git commands.

### N5: Copilot Adaptation

In the `execute-phase` SKILL.md, before Step 4 (wave execution):

```markdown
## Step 3b: Branch Setup (if branching enabled)

If init context contains `branching_strategy` != "none":
  1. Run `git branch --list "{branch_name}"` to check existence
  2. If exists: Run `git checkout {branch_name}`
  3. If not: Run `git checkout -b {branch_name}`
  4. Note: "Working on branch: {branch_name}"

After all execution completes:
  Note: "All work committed to branch '{branch_name}'. Merge when ready."
```

---

## Supplement O: Full `config.json` Schema

### O1: Complete Schema with Defaults and Effects

```jsonc
{
  // === Top-Level Settings ===
  "mode": "interactive",
  // Values: "interactive" | "yolo"
  // "interactive": all confirmation gates active
  // "yolo": skip research, plan-check, verification; auto-approve most gates
  // Set during /gsd-new-project setup

  "depth": "standard",
  // Values: "quick" | "standard" | "comprehensive"
  // Controls: roadmap phase count, research depth, question count
  // "quick": 3-5 phases, minimal research, 3 questions
  // "standard": 5-8 phases, balanced research, 5-7 questions
  // "comprehensive": 8-12 phases, deep research, 7-10+ questions

  // === Workflow Agent Toggles ===
  "workflow": {
    "research": true,
    // Enable gsd-phase-researcher before planning
    // false → plan-phase skips research step entirely

    "plan_check": true,
    // Enable gsd-plan-checker after planning
    // false → plans are accepted without verification loop

    "verifier": true,
    // Enable gsd-verifier after execution
    // false → execute-phase skips post-execution verification

    "auto_advance": false,
    // Auto-progress through plan→execute→next-phase chain
    // true → equivalent to --auto flag on every command
    // Respects --no-transition when propagated

    "nyquist_validation": false
    // Generate VALIDATION.md test coverage map during planning
    // true → plan-phase creates VALIDATION.md, executor runs wave 0 first
  },

  // === Planning & Git Settings ===
  "planning": {
    "commit_docs": true,
    // Auto-commit .planning/ changes after each workflow step
    // false → planning docs accumulate without commits

    "search_gitignored": false
    // Include gitignored files in codebase search during research/mapping
    // true → adds --no-exclude-standard to grep, includes node_modules etc.
  },

  // === Parallelization (Claude Code specific — informational in Copilot) ===
  "parallelization": {
    "enabled": true,
    // Master switch for parallel execution
    // In Copilot: informational only (execution is always sequential)

    "plan_level": true,
    // Parallelize plans within a wave
    // In Copilot: ignored (plans execute sequentially regardless)

    "task_level": false,
    // Parallelize tasks within a plan (DANGEROUS — rarely useful)
    // In Copilot: ignored

    "skip_checkpoints": true,
    // Plans containing checkpoints are excluded from parallel execution
    // In Copilot: irrelevant (sequential)

    "max_concurrent_agents": 3,
    // Max simultaneous subagents (Claude Code limit)
    // In Copilot: informational only

    "min_plans_for_parallel": 2
    // Minimum plans in a wave to trigger parallel execution
    // In Copilot: informational only
  },

  // === Human Confirmation Gates ===
  "gates": {
    "confirm_project": true,
    // Confirm PROJECT.md content before proceeding in new-project

    "confirm_phases": true,
    // Confirm phase count/structure during roadmap creation

    "confirm_roadmap": true,
    // Confirm full ROADMAP.md before writing to disk

    "confirm_breakdown": true,
    // Confirm task breakdown before writing detailed plan

    "confirm_plan": true,
    // Confirm plan before starting execution

    "execute_next_plan": true,
    // Ask between plans in a wave during execute-phase
    // false → auto-advance to next plan in wave

    "issues_review": true,
    // Review plan-checker issues before revision iteration

    "confirm_transition": true
    // Confirm before advancing to next phase after execution
    // This gate is checked even when auto_advance is true
  },

  // === Hard Safety Constraints (cannot be bypassed in auto mode) ===
  "safety": {
    "always_confirm_destructive": true,
    // Confirm before: rm, drop table, git reset --hard, file deletion
    // Cannot be overridden by --auto or mode: yolo

    "always_confirm_external_services": true
    // Confirm before: API calls to external services, third-party auth
    // Cannot be overridden by --auto or mode: yolo
  },

  // === Model Configuration ===
  "model_profile": "balanced",
  // Values: "quality" | "balanced" | "budget"
  // Maps to model table in references/model-profiles.md
  // In Copilot: advisory only (model selection is user-controlled)

  "branching_strategy": "none",
  // Values: "none" | "phase" | "milestone"
  // See Supplement N for full behavior

  // === Optional: Model Overrides (per-agent) ===
  "model_overrides": {
    // Override profile defaults for specific agents
    // Example: { "gsd-planner": "claude-opus-4" }
    // In Copilot: informational only
  }
}
```

### O2: Config Resolution Precedence

```
1. Explicit model_overrides (per-agent)        ← highest priority
2. model_profile (maps to profile table)
3. Agent .md model: frontmatter (fallback array)
4. User's current Copilot model selection       ← Copilot actual behavior
```

In Copilot, items 1-3 are **advisory** — they tell the user which model is recommended but cannot enforce it. Item 4 is what actually runs.

### O3: Global Defaults File

Path: `~/.gsd/defaults.json`

Same schema as `config.json`. Values are used as defaults when `.planning/config.json` is first created during `/gsd-new-project`. If a defaults file exists and contains a value for `model_profile`, `depth`, or `mode`, the corresponding setup question is skipped.

### O4: `.gitignore` Interaction

When `planning.commit_docs: false`, the `/gsd-new-project` workflow adds `.planning/` to `.gitignore`. This is a **one-time** action during project init — changing the flag later does NOT modify `.gitignore`.

---

## Supplement P: PRD Express Path

### P1: What It Is

The `--prd <filepath>` flag on `plan-phase` provides an alternate entry point that bypasses interactive discussion (`discuss-phase`), generating `CONTEXT.md` directly from a Product Requirements Document.

### P2: Flow Comparison

| Step | Standard Path | PRD Express Path |
|------|---------------|-----------------|
| 1 | `discuss-phase` → gray areas → questioning → CONTEXT.md | Read PRD → auto-generate CONTEXT.md |
| 2 | Research → RESEARCH.md | Research → RESEARCH.md (unchanged) |
| 3 | Plan → PLAN.md(s) | Plan → PLAN.md(s) (unchanged) |
| 4 | Verify → VALIDATION.md | Verify → VALIDATION.md (unchanged) |

### P3: CONTEXT.md Generation from PRD

```markdown
When --prd <path> is provided:

1. Read the file at <path>
2. Parse sections as requirements/decisions
3. For each concrete requirement or decision found:
   → Create a LOCKED DECISION entry in CONTEXT.md
   → Locked decisions are NON-NEGOTIABLE (planner cannot override)
4. For topics/domains NOT covered in the PRD:
   → Create "Claude's Discretion" entries
   → The planner uses its judgment for these areas
5. Write CONTEXT.md with header:
   > Generated from PRD: {filename}
   > All requirements from this PRD are treated as locked design decisions.
6. Skip discuss-phase entirely
7. Continue with research → plan → verify as normal
```

### P4: Impact on Planner

The planner treats PRD-generated context identically to discussion-generated context:
- **Locked decisions** → implemented exactly as specified, no deviation
- **Discretion areas** → planner uses judgment, documented as decisions in PLAN.md
- **Conflicts between PRD and research** → PRD wins (it represents user intent)

### P5: Copilot Skill Integration

In `gsd-plan-phase` SKILL.md:

```markdown
## Step 2: Parse Arguments

Extract from user input:
- Phase number (required)
- --prd <filepath> (optional)
- Other flags (--research, --skip-research, --gaps, etc.)

## Step 3: Context Resolution

If --prd flag is present:
  1. Read the PRD file
  2. Generate CONTEXT.md from PRD content:
     - Concrete specs → locked decisions
     - Unspecified areas → Claude's Discretion
  3. Write to {phase_dir}/{phase}-CONTEXT.md
  4. SKIP discuss-phase delegation
Else if CONTEXT.md already exists:
  Use existing CONTEXT.md
Else:
  Suggest: "No CONTEXT.md found. Run /gsd-discuss-phase {N} first, or provide --prd <file>."
```

---

## Supplement Q: Nyquist Validation System

### Q1: Purpose

Named after signal processing's Nyquist theorem — ensuring verification "sampling rate" is sufficient to detect implementation defects. When enabled, every task gets a mapped verification method BEFORE execution begins.

### Q2: Trigger Conditions

- `config.workflow.nyquist_validation: true` (default: `false`)
- Only during `plan-phase` workflow (not `quick`)
- Runs after research, before or alongside planning

### Q3: VALIDATION.md Template

```yaml
---
phase: {N}
slug: "{phase-slug}"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "{ISO_date}"
---

# Validation Strategy — Phase {N}: {Phase Name}

## Test Infrastructure
- **Framework:** {test framework}
- **Config:** {config file}
- **Run Command:** {test command}
- **Estimated Runtime:** {seconds}

## Sampling Rate
- **Quick suite:** {subset command} — run after every task
- **Full suite:** {full command} — run after each wave
- **Max feedback latency:** {seconds}s

## Per-Task Verification Map

| Task | Plan | Wave | Requirement | Test Type | Command | Status |
|------|------|------|-------------|-----------|---------|--------|
| T1   | 01   | 1    | REQ-AUTH-01 | unit      | `npm test -- auth` | ⬜ pending |
| T2   | 01   | 1    | REQ-AUTH-02 | integration | `npm test -- auth-flow` | ⬜ pending |
| T3   | 02   | 2    | REQ-API-01  | manual    | See Manual section | ⬜ pending |

## Wave 0 Requirements
<!-- Test infrastructure and stubs that must exist before any execution -->
- [ ] Test framework configured
- [ ] Test database seeded
- [ ] Mock server setup

## Manual-Only Verifications
| Task | Reason | How to Verify |
|------|--------|---------------|
| T3   | OAuth flow requires browser | Login via browser, check redirect |

## Validation Sign-Off
- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks lack automated verify
- [ ] Wave 0 covers all MISSING test references
- [ ] No `--watch` flags in test commands
- [ ] Feedback latency ≤ {threshold}s
- [ ] `nyquist_compliant: true` set in frontmatter
```

### Q4: Impact on Execution

When VALIDATION.md exists for a phase:

1. **Wave 0 first** — before any implementation waves, the executor runs Wave 0 tasks (test infrastructure setup)
2. **Post-task verification** — after each task, the executor runs the corresponding test command from the verification map
3. **Status tracking** — updates task status in VALIDATION.md: `⬜ pending` → `✅ green` or `❌ red` or `⚠️ flaky`
4. **Regression detection** — a test that was `✅ green` becoming `❌ red` is flagged as a regression, triggering deviation rule R2 (bug in own code)

### Q5: Copilot Skill Integration

In `gsd-plan-phase` SKILL.md, after the planning step:

```markdown
## Step 5b: Generate Validation Strategy (if nyquist enabled)

If config.workflow.nyquist_validation is true:
  1. Read the phase's PLAN.md files
  2. For each task, determine the appropriate test type:
     - Unit test (pure function, deterministic)
     - Integration test (multi-component)
     - E2E test (full-stack)
     - Manual (browser, auth, visual)
  3. Fill VALIDATION.md template with the task→test mapping
  4. Present for review
  5. Write to {phase_dir}/{phase}-VALIDATION.md
```

In `gsd-execute-phase` SKILL.md, before wave execution:

```markdown
## Step 3b: Wave 0 (if VALIDATION.md exists)

If {phase}-VALIDATION.md exists:
  1. Read Wave 0 Requirements
  2. Execute each requirement (create test stubs, seed data, configure framework)
  3. Mark wave_0_complete: true in VALIDATION.md frontmatter
  4. Then proceed to normal wave execution
```

---

## Supplement R: Verification Patterns — 4-Level Model

### R1: Level Definitions

| Level | Name | Question | Tool | Automation |
|-------|------|----------|------|------------|
| 1 | **Exists** | Does the file exist? | `gsd_verify_artifacts` | Full |
| 2 | **Substantive** | Is it real code, not a stub? | `gsd_verify_artifacts` (min_lines, contains) | Full |
| 3 | **Wired** | Is it connected to the system? | `gsd_verify_key_links` | Full |
| 4 | **Functional** | Does it actually work? | UAT / manual + `checkpoint:human-verify` | Partial |

### R2: Stub Detection Patterns

The verifier agent and automated verification tools scan for these anti-patterns when checking Level 2 (Substantive):

**Comment stubs:**
```
TODO, FIXME, XXX, PLACEHOLDER, implement, add later, coming soon,
not yet implemented, stub, mock (when not in test files)
```

**Placeholder content:**
```
lorem ipsum, sample, example, test data, dummy, foo, bar, baz,
placeholder, template, default value
```

**Empty implementations:**
```javascript
return null; return undefined; return {}; return [];
throw new Error('Not implemented');
// Python: pass, raise NotImplementedError
// Java: return null; throw new UnsupportedOperationException();
```

**Hardcoded indicators:**
```
Hardcoded IDs (uuid-like strings in logic, not config)
Hardcoded counts (magic numbers for data that should be dynamic)
Hardcoded display values (text that should come from state/props/data)
```

**Log-only functions:**
```javascript
function handleClick() { console.log('clicked'); }  // No real logic
```

### R3: Wiring Verification Patterns

How to verify Level 3 (Wired) for common integration types:

| Connection | Pass Pattern | Fail Pattern |
|-----------|-------------|--------------|
| Component → API | `fetch`/`axios` call + response consumed | No fetch call, or response ignored |
| API → Database | Query + await + result in return | Query exists but result unused |
| Form → Handler | `onSubmit` calls mutation/API | Only `preventDefault`, no API call |
| State → Render | State var in JSX expression | Hardcoded text instead of `{state.value}` |
| Route → Component | Router entry maps path → import | Route defined but wrong or missing component |
| Middleware → Route | Middleware applied before handler | Middleware defined but never `app.use()`'d |
| Event → Handler | `addEventListener` + handler does work | Handler is `() => {}` (empty) |
| Config → Usage | Config value read AND used in logic | Config read but hardcoded value used instead |

### R4: How the Verifier Agent Uses These Patterns

```markdown
The gsd-verifier agent performs goal-backward verification:

1. Read PLAN.md must_haves (truths, artifacts, key_links)
2. For each truth:
   - Search codebase for evidence supporting the truth
   - Search for evidence contradicting the truth
   - Verdict: confirmed / contradicted / inconclusive
3. For each artifact:
   - Call gsd_verify_artifacts MCP tool (Levels 1-2)
   - Additionally: scan for stub patterns (Level 2 deep check)
4. For each key_link:
   - Call gsd_verify_key_links MCP tool (Level 3)
   - Additionally: trace the integration path manually
5. For Level 4 (functional):
   - If test commands exist, run them via terminal
   - If manual verification needed, note as "HUMAN VERIFICATION REQUIRED"

CRITICAL RULE: "DO NOT trust SUMMARY claims."
The verifier reads the actual codebase, not the SUMMARY.md.
If SUMMARY says "authentication works" but auth middleware is stubbed,
the verifier reports GAPS FOUND.
```

---

## Supplement S: New-Project Auto Mode

### S1: What Changes

When `--auto` is passed to `new-project`:

| Standard Mode | Auto Mode |
|---------------|-----------|
| Interactive questioning (5-10 questions) | Requires idea doc via `@` reference |
| Mode selection prompt | `mode` set to `yolo` automatically |
| Depth selection prompt | `depth` inferred from idea doc length |
| Config in 3 questions | Config in 2 compact rounds |
| Research with confirmation gates | Research without gates |
| Requirements review | Requirements auto-approved |
| Roadmap review | Roadmap auto-approved |

### S2: Required Input

Auto mode REQUIRES either:
- An `@` referenced idea document: `/gsd-new-project --auto @ideas/my-app.md`
- Or inline description of sufficient length (≥100 chars)

If neither is provided, fall back to standard mode with a note: "Auto mode requires an idea document or detailed description."

### S3: Config Quick-Setup

In auto mode, config questions are asked in 2 compact rounds:

**Round 1 (core):**
```
Quick setup:
- Depth: quick / standard / comprehensive? [standard]
- Model profile: quality / balanced / budget? [balanced]
```

**Round 2 (workflow):**
```
Workflow agents:
- Research: yes/no? [yes]
- Plan checking: yes/no? [yes]
- Verification: yes/no? [yes]
```

User can press Enter to accept all defaults.

### S4: Depth Inference from Idea Doc

If depth is not explicitly chosen:
- Idea doc < 500 chars → `quick`
- Idea doc 500-2000 chars → `standard`
- Idea doc > 2000 chars → `comprehensive`

### S5: Auto-Approval of Artifacts

In auto mode, the following gates are bypassed:
- `gates.confirm_project` → auto-approved
- `gates.confirm_phases` → auto-approved
- `gates.confirm_roadmap` → auto-approved

The safety gates (`safety.*`) are NEVER bypassed, even in auto mode.

---

## Supplement T: Quick Task Numbering & Table Differences

### T1: Numbering Convention

| Scope | Format | Example | Pattern |
|-------|--------|---------|---------|
| Phase numbers | 2-digit zero-padded | `01`, `02`, `12` | `/^\d{2}$/` |
| Phase plans | `{phase}-{NN}` | `01-01`, `01-02` | `/^\d{2}-\d{2}$/` |
| Decimal phases | `{NN}.{N}` | `03.1`, `05.2` | `/^\d{2}\.\d+$/` |
| **Quick tasks** | **3-digit zero-padded** | `001`, `002`, `003` | `/^\d{3}$/` |

### T2: Directory Structure

```
.planning/
├── phases/
│   ├── 01-init/
│   │   ├── 01-01-PLAN.md
│   │   └── 01-01-SUMMARY.md
│   └── 02-auth/
│       ├── 02-01-PLAN.md
│       └── 02-01-SUMMARY.md
└── quick/
    ├── 001-add-health-check/
    │   ├── 001-PLAN.md
    │   └── 001-SUMMARY.md
    └── 002-fix-login-bug/
        ├── 002-PLAN.md
        └── 002-SUMMARY.md
```

### T3: STATE.md Quick Task Table

**Standard mode (no `--full` flag):**
```markdown
## Quick Tasks

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Add health check | 2026-02-24 | abc1234 | .planning/quick/001-add-health-check |
```

**Full mode (`--full` flag adds Status column):**
```markdown
## Quick Tasks

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 001 | Add health check | 2026-02-24 | abc1234 | verified | .planning/quick/001-add-health-check |
```

**Status values:** `planned`, `executing`, `completed`, `verified`

### T4: Plan-Checker Reduction for Quick Tasks

Quick mode plan-checking is lighter than phase planning:

| Dimension | Phase Plan-Check | Quick Plan-Check |
|-----------|-----------------|-----------------|
| Max revision iterations | 3 | **2** |
| Context compliance | ✅ Checked | ❌ Skipped |
| Cross-plan dependencies | ✅ Checked | ❌ Skipped |
| ROADMAP alignment | ✅ Checked | ❌ Skipped |
| Task breakdown quality | ✅ Checked | ✅ Checked |
| File coverage | ✅ Checked | ✅ Checked |
| must_haves completeness | ✅ Checked | ✅ Checked |
| Wave structure | ✅ Checked | ❌ Skipped (quick = single wave) |

### T5: Spot-Check After Execution

Regardless of reported success/failure, the quick skill always verifies:
1. SUMMARY.md exists at expected path: `.planning/quick/{NNN}-{slug}/{NNN}-SUMMARY.md`
2. Recent commits exist: `git log --oneline -5` shows commits with expected patterns
3. No `## Self-Check: FAILED` marker in SUMMARY.md

This is a robustness pattern inherited from a Claude Code bug workaround, but retained because defensive verification is always valuable.
