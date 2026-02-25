# Phase 4: Fixes & Completeness

**Goal:** Resolve all known issues from Phase 1–3 reviews. Fix broken tests, complete agent porting, add missing MCP tools, harden the installer, and fill test coverage gaps.

**Depends on:** Phase 3 (all core functionality implemented).  
**Validates:** Zero failing tests, no stale Claude Code references, complete agent frontmatter, full MCP tool coverage, installer robustness.

**Audit sources:**
- `.my/phase-1-review.md` (Phase 1 implementation review)
- `.my/phase-2-review.md` (Phase 2 implementation review)
- `.my/phase-3-review.md` (Phase 3 implementation review)

---

## Step 1: Fix Failing Tests (P0)

4 tests currently failing in the CLI test suite (248/252 passing).

### Step 1a: Fix init path assembly tests

**Files:** `tests/init.test.cjs`, `get-shit-done/bin/lib/init.cjs`

Failing tests:
- `init plan-phase returns file paths`
- `init phase-op returns core and optional phase file paths`

Diagnose the assertion mismatches — likely a path format or return shape change that wasn't reflected in the tests. Fix either the implementation or the test expectations to match the intended contract.

### Step 1b: Fix dollar-sign handling in state mutations

**Files:** `tests/state.test.cjs`, `get-shit-done/bin/lib/state.cjs`

Failing tests:
- `add-decision preserves dollar amounts without corrupting Decisions section`
- `add-blocker preserves dollar strings without corrupting Blockers section`

The dollar-sign regex in state mutation functions is likely clobbering `$` characters in content. Fix the regex or escaping logic so `$100`, `$50k`, etc. survive round-trips through state mutations.

**Validation:** `npm test` → 252/252 passing, 0 failing.

---

## Step 2: Complete Agent Frontmatter (P0)

### Step 2a: Add `model:` to the 4 core Copilot agents

**Files:** `.github/agents/gsd-executor.agent.md`, `.github/agents/gsd-planner.agent.md`, `.github/agents/gsd-plan-checker.agent.md`, `.github/agents/gsd-verifier.agent.md`

Add `model:` and `user-invocable:` frontmatter fields:

```yaml
model: [claude-sonnet-4, gpt-4.1, gemini-2.5-pro]
user-invocable: false
```

Exception: `gsd-debugger.agent.md` should have `user-invocable: true` (users invoke it directly via `@gsd-debugger`). Verify this is already correct — the Phase 2 review flagged it as `false` but the codebase audit shows it's already `false`. Fix to `true`.

### Step 2b: Add `handoffs:` to all 11 agents

Per Phase 2 Supplement B6, add advisory `handoffs:` fields to all agent frontmatter:

| Agent | `handoffs:` |
|-------|-------------|
| `gsd-planner` | `[gsd-plan-checker, gsd-executor]` |
| `gsd-executor` | `[gsd-verifier]` |
| `gsd-plan-checker` | `[gsd-planner]` |
| `gsd-verifier` | `[gsd-debugger]` |
| `gsd-debugger` | `[gsd-executor]` |
| `gsd-phase-researcher` | `[gsd-research-synthesizer]` |
| `gsd-project-researcher` | `[gsd-research-synthesizer]` |
| `gsd-research-synthesizer` | `[gsd-roadmapper]` |
| `gsd-roadmapper` | `[gsd-planner]` |
| `gsd-codebase-mapper` | `[]` |
| `gsd-integration-checker` | `[]` |

**Validation:** All 11 `.github/agents/*.agent.md` files have `model:`, `user-invocable:`, `handoffs:` in frontmatter.

---

## Step 3: Remove Stale Claude Code References from Copilot Agents (P0)

### Step 3a: Fix `gsd-phase-researcher.agent.md`

**File:** `.github/agents/gsd-phase-researcher.agent.md`

3 occurrences of `~/.gsd/get-shit-done/bin/gsd-tools.cjs`:
- Line 122: `websearch` CLI call → replace with `use the web tool for searching` or equivalent Copilot-native instruction
- Line 359: `init phase-op` CLI call → replace with `call gsd_init_phase_op MCP tool`
- Line 461: `commit` CLI call → replace with `call gsd_commit MCP tool`

### Step 3b: Fix `gsd-debugger.agent.md`

**File:** `.github/agents/gsd-debugger.agent.md`

2 occurrences of `~/.gsd/get-shit-done/bin/gsd-tools.cjs`:
- Line 1027: `state load` CLI call → replace with `call gsd_state_load MCP tool`
- Line 1044: `commit` CLI call → replace with `call gsd_commit MCP tool`

### Step 3c: Fix `~/.gsd/` path references in agents

7 remaining `~/.gsd/` or `~/.claude/` home-relative path references in `.github/agents/`. Replace with workspace-relative `.gsd/` paths or MCP tool calls as appropriate.

**Validation:** `Select-String -Path ".github/agents/*.agent.md" -Pattern "gsd-tools\.cjs|~/\.(gsd|claude)"` returns 0 matches.

---

## Step 4: Implement Missing MCP Tools (P1)

### Step 4a: `gsd_history_digest`

**File:** `.gsd/tools/gsd-mcp-server.js` (or the appropriate lib module)

Port from CLI `history-digest` command in `get-shit-done/bin/gsd-tools.cjs`. This tool synthesizes prior phase summaries and decisions to inform planning. Referenced by `gsd-plan-phase` workflow.

Input: `{ phase: string }` (optional — defaults to current phase)
Output: Digest of prior phase summaries, key decisions, and active blockers.

### Step 4b: `gsd_roadmap_update_phase_status`

**File:** `.gsd/tools/lib/roadmap.js`

Standalone tool to update a phase's status in ROADMAP.md (e.g., `not-started` → `in-progress` → `complete`). Currently, only `gsd_roadmap_update_plan_progress` exists, which handles plan-level progress but not phase-level status changes.

Input: `{ phase: number, status: string }`
Output: Updated ROADMAP.md content.

### Step 4c: `gsd_milestone_stats`

**File:** `.gsd/tools/lib/milestone.js`

Compute statistics for the current milestone: total phases, phases complete, phases remaining, requirements coverage, blockers count. Used by `audit-milestone` and `complete-milestone` workflows.

Input: `{}` (reads from STATE.md + ROADMAP.md)
Output: `{ totalPhases, completedPhases, remainingPhases, requirementsCoverage, blockersCount }`

### Step 4d: `gsd_switch_profile`

**File:** `.gsd/tools/gsd-mcp-server.js`

Reads all `.github/agents/*.agent.md` files, rewrites `model:` frontmatter based on the selected profile map from `.gsd/references/model-profiles.md`.

Input: `{ profile: "quality" | "balanced" | "budget" }`
Output: List of updated agent files with their new model arrays.

Profile map:
- **quality:** primary = `claude-sonnet-4`, fallback = `gpt-4.1`, `gemini-2.5-pro`
- **balanced:** primary = `claude-sonnet-4`, fallback = `gpt-4.1`
- **budget:** primary = `gpt-4.1-mini`, fallback = `gemini-2.5-flash`

Special case: `gsd-codebase-mapper` uses cheaper models (haiku/mini) in all profiles.

**Validation:** Each tool should have at least one test in the appropriate test file. All 4 tools respond correctly via MCP JSON-RPC.

---

## Step 5: Harden the Installer (P1)

### Step 5a: Add "skip if exists" for instruction files

**File:** `bin/copilot-install.js`

When copying `.github/instructions/*.instructions.md`, check if the destination file already exists. If it does, skip it (user may have customized). Log a message: `Skipping {file} (already exists, use --force to overwrite)`.

The `--force` flag should override this behavior and overwrite all files.

### Step 5b: Add hook merging logic

**File:** `bin/copilot-install.js`

Currently hooks are copied wholesale. Implement:
- **Install:** Copy GSD hooks to `.github/hooks/`. If a hook JSON already exists, merge the GSD entry into it (don't overwrite the whole file).
- **Uninstall:** Remove only GSD-related entries from hook JSONs (identified by `.gsd/hooks/` in the command path). If the hook JSON becomes empty after removal, delete it.

### Step 5c: Add post-install verification

**File:** `bin/copilot-install.js`

After all copy operations, verify that key files exist:
- `.github/copilot-instructions.md`
- `.github/agents/gsd-planner.agent.md`
- `.gsd/tools/gsd-mcp-server.js`
- `.vscode/mcp.json`

If any are missing, print a warning with the specific missing file(s).

**Validation:** Fresh install in a test directory succeeds with verification passing. Repeated install preserves user-customized instruction files.

---

## Step 6: Windows Compatibility Hardening (P2)

### Step 6a: Add `windowsHide: true` to `execFileSync` calls

**File:** `.gsd/tools/lib/core.js`

Add `windowsHide: true` to the options object in the `execGit()` function (and any other `execFileSync` calls in the MCP server lib). This prevents a console window from flashing on Windows when git commands are executed.

### Step 6b: Add `normalizePath()` utility

**File:** `.gsd/tools/lib/core.js`

Create a `normalizePath(p)` function that converts backslashes to forward slashes. Apply it when writing paths into frontmatter or planning docs, so that paths in YAML frontmatter are always forward-slash regardless of OS.

```js
function normalizePath(p) { return p.replace(/\\/g, '/'); }
```

Export it and apply in `frontmatter.js` when writing path values.

**Validation:** On Windows, frontmatter paths use forward slashes. `execFileSync` calls include `windowsHide: true`.

---

## Step 7: Fill MCP Test Coverage Gaps (P1)

### Step 7a: Create `tests/copilot-init.test.cjs`

Test the init module functions:
- `cmdInitNewProject` — returns correct file paths and context
- `cmdInitPlanPhase` — returns phase dir, file paths, prior summaries
- `cmdInitExecutePhase` — returns plan content, state
- `cmdInitVerifyWork` — returns verification context
- `cmdInitMilestoneOp` — returns milestone context
- `cmdInitMapCodebase` — returns codebase context
- `cmdInitQuick` — returns quick task context
- `cmdInitResume` — returns resume context

Target: ~20 tests.

### Step 7b: Create `tests/copilot-roadmap.test.cjs`

Test roadmap module functions:
- `cmdRoadmapAnalyze` — parses ROADMAP.md phases, stats
- `cmdRoadmapGetPhase` — returns specific phase details
- `cmdRoadmapUpdatePlanProgress` — updates plan status in roadmap
- `cmdRoadmapUpdatePhaseStatus` — updates phase status (new tool from Step 4b)

Target: ~15 tests.

### Step 7c: Create `tests/copilot-phase.test.cjs`

Test phase module functions:
- `cmdPhaseAdd` — appends phase to roadmap
- `cmdPhaseInsert` — inserts decimal phase
- `cmdPhaseRemove` — removes future phase
- `cmdPhaseNextDecimal` — computes next decimal number
- `cmdPhasesList` — lists all phases
- `cmdPhasePlanIndex` — returns plan index for phase
- `cmdPhaseComplete` — marks phase complete

Target: ~20 tests.

### Step 7d: Create `tests/copilot-milestone.test.cjs`

Test milestone module functions:
- `cmdMilestoneComplete` — archives milestone
- `cmdRequirementsMarkComplete` — marks requirements done
- `cmdMilestoneStats` — returns milestone statistics (new tool from Step 4c)

Target: ~12 tests.

### Step 7e: Create `tests/copilot-commands.test.cjs`

Test command module functions:
- `cmdCommit` — creates git commits
- `cmdGenerateSlug` — generates slugs from strings
- `cmdCurrentTimestamp` — returns formatted timestamps
- `cmdTodoComplete` / `cmdListTodos` — todo management
- `cmdHistoryDigest` — history digest (new tool from Step 4a)

Target: ~15 tests.

**Validation:** All new test files pass. Total Copilot test count increases from 137 to ~220+.

---

## Step 8: Clean Up Miscellaneous Issues (P2)

### Step 8a: Enrich `planning-docs.instructions.md`

**File:** `.github/instructions/planning-docs.instructions.md`

Currently only 3 lines. Add:
- File naming conventions (e.g., `NN-CONTEXT.md`, `NN-MM-PLAN.md`)
- STATE.md-first rule reminder
- Frontmatter format requirement (YAML frontmatter with `---` delimiters)
- Context fidelity rules (no invented requirements, no assumed tech)

### Step 8b: Remove or update `docs/context-monitor.md`

**File:** `docs/context-monitor.md`

This documents the Claude Code bridge-file context monitor, not the Copilot version. Either:
- Replace content with Copilot-relevant context management docs (referencing the actual hooks), or
- Add a header noting this is Claude Code-specific and link to the Copilot equivalent

### Step 8c: Fix `gsd-debugger.agent.md` user-invocable

**File:** `.github/agents/gsd-debugger.agent.md`

Already has `user-invocable: false` — change to `user-invocable: true`. The debugger is the one agent users invoke directly via `@gsd-debugger`.

*Note: This is also covered in Step 2a but called out explicitly due to its BLOCKING severity in the Phase 2 review.*

### Step 8d: Fix Bash-only commands in prompt files

**Files:** `commands/gsd/update.md`, `commands/gsd/cleanup.md`, `commands/gsd/plan-milestone-gaps.md`

Replace Unix-only shell commands (`cat`, `ls -d`, `mv`, `ls -t | head`) with cross-platform alternatives. Use MCP tool calls or instruct the agent to use PowerShell-compatible equivalents on Windows.

### Step 8e: Fix `web`/`agent` tool names in prompt frontmatter

**File:** `commands/gsd/research-phase.md` (or equivalent prompt file)

`tools: [read, search, web, execute, agent]` — `web` and `agent` are not standard VS Code Copilot tool names. Replace with the correct Copilot tool identifiers or remove invalid entries.

---

## Step 9: Truncated Agent Content (P2)

### Step 9a: Complete `gsd-project-researcher.agent.md`

**File:** `.github/agents/gsd-project-researcher.agent.md`

Currently at ~56% of the original source content (`agents/gsd-project-researcher.md`). Port the remaining ~183 lines from the source agent, adapting Claude Code primitives to Copilot equivalents.

### Step 9b: Complete `gsd-integration-checker.agent.md`

**File:** `.github/agents/gsd-integration-checker.agent.md`

Currently at ~63% of the original source content (`agents/gsd-integration-checker.md`). Port the remaining ~118 lines from the source agent. The source file ends mid-flow at Step 5 with an incomplete YAML block — ensure the port completes fully.

**Validation:** Both agent files are complete, self-contained, and reference only MCP tools (no `gsd-tools.cjs`).

---

## Priority Summary

| Step | Priority | Effort | Description |
|------|----------|--------|-------------|
| 1 | P0 | Small | Fix 4 failing tests |
| 2 | P0 | Small | Complete agent frontmatter (model, user-invocable, handoffs) |
| 3 | P0 | Medium | Remove stale Claude Code references from Copilot agents |
| 4 | P1 | Large | Implement 4 missing MCP tools |
| 5 | P1 | Medium | Harden installer (skip-if-exists, hook merge, post-verify) |
| 6 | P2 | Small | Windows compatibility (windowsHide, normalizePath) |
| 7 | P1 | Large | Fill MCP test coverage gaps (~80 new tests) |
| 8 | P2 | Small | Miscellaneous cleanup (docs, prompts, instructions) |
| 9 | P2 | Medium | Complete truncated agent ports |

---

## Completion Criteria

- [ ] `npm test` → 252/252 passing (Step 1)
- [ ] All 11 `.github/agents/*.agent.md` have `model:`, `user-invocable:`, `handoffs:` (Step 2)
- [ ] Zero `gsd-tools.cjs` or `~/.gsd/` references in `.github/agents/` (Step 3)
- [ ] `gsd_history_digest`, `gsd_roadmap_update_phase_status`, `gsd_milestone_stats`, `gsd_switch_profile` tools registered and functional (Step 4)
- [ ] Installer handles skip-if-exists, hook merging, post-verification (Step 5)
- [ ] `windowsHide: true` on all `execFileSync` calls; `normalizePath()` applied to frontmatter writes (Step 6)
- [ ] ~80+ new Copilot MCP tests across 5 new test files (Step 7)
- [ ] No stale/broken references in prompts, docs, or instructions (Step 8)
- [ ] `gsd-project-researcher` and `gsd-integration-checker` agents fully ported (Step 9)
