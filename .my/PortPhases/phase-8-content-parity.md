# Phase 8: Content Parity — Lost Planning Discipline & Cross-Module Review

**Goal:** Restore the 6 lost planning-discipline sections identified in the agent content review, run MCP library function parity checks, and verify skill content completeness.

**Prior phase:** Phase 7 fixed 9 missing prompt files. Phase 8 addresses content-level gaps found during the first systematic port review (`.my/Maintenance/README.md` §7).

---

## Problem Statement

The Phase 1-6 port validated *structural* correctness (files exist, tools register, tests pass). The Phase 8 content review found that 4 agents were intentionally rewritten as lightweight MCP orchestrators — BUT some behavioral rules that existed in the old agents did NOT land in either the new `.agent.md` files OR the corresponding skill references. These represent lost "planning discipline" that affects quality of generated plans and verification rigor.

Additionally, the MCP library function parity (old `.cjs` vs new `.js`) has not been reviewed at the content level. Tests cover the happy path but may miss behavioral differences.

---

## Part 1: Restore Lost Planning Discipline

### 6 Gaps Identified

| # | Source Agent | Lost Content | Target File |
|---|---|---|---|
| 1 | gsd-planner.md L117-150 | Discovery Levels 0-3 (when to skip/quick/standard/deep research) | `.github/skills/gsd-plan-phase/references/planning-workflow.md` |
| 2 | gsd-planner.md L189-201 | Task Sizing (15-60 min window, split/combine signals) | `.github/skills/gsd-plan-phase/references/planning-workflow.md` |
| 3 | gsd-planner.md L213-229 | Specificity Examples (TOO VAGUE vs JUST RIGHT table) | `.github/skills/gsd-plan-phase/references/planning-workflow.md` |
| 4 | gsd-planner.md L203-212 | Interface-First Task Ordering (define contracts → implement → wire) | `.github/skills/gsd-plan-phase/references/planning-workflow.md` |
| 5 | gsd-verifier.md L50-79 | Re-Verification Mode (detect prior VERIFICATION.md, skip passed items) | `.github/skills/gsd-verify-work/references/uat-workflow.md` |
| 6 | gsd-verifier.md L81-145 | Must-Haves Options A/B/C (PLAN frontmatter → ROADMAP criteria → derive) | `.github/skills/gsd-verify-work/references/uat-workflow.md` |

### Step 1.1: Add 4 planner sections to `planning-workflow.md`

Insert after the existing "Quality Gate" section (or before it — these guide the planner's decisions):

**Discovery Levels** — adapted for Copilot (replace bash/Context7 with MCP tools):
- Level 0: Skip (pure internal work)
- Level 1: Quick (2-5 min, single known lib)
- Level 2: Standard (15-30 min, choosing between options)
- Level 3: Deep (1+ hour, architectural)
- Depth indicators and niche domain guidance

**Task Sizing** — 15-60 minute execution window:
- Too small → combine
- Too large → split
- Split/combine signal heuristics

**Specificity Examples** — TOO VAGUE vs JUST RIGHT table:
- 5 example pairs covering auth, API, styling, errors, database
- Test: "Could a different agent execute without clarifying questions?"

**Interface-First Ordering** — Wave 0 contract pattern:
- First task: define contracts/interfaces
- Middle tasks: implement against contracts
- Last task: wire implementations to consumers

### Step 1.2: Add 2 verifier sections to `uat-workflow.md`

Insert before the existing "Session Management" section:

**Re-Verification Mode** — adapted for MCP:
- Check for prior VERIFICATION.md using MCP tools
- If gaps exist: re-verification mode (full check on failed, quick on passed)
- If no prior: initial mode

**Must-Haves Establishment (Options A/B/C)**:
- Option A: Extract `must_haves` from PLAN frontmatter
- Option B: Use `success_criteria` from ROADMAP via `gsd_roadmap_get_phase`
- Option C: Derive from phase goal (fallback)
- Priority order: A → B → C

---

## Part 2: MCP Library Function Parity

### Function Count Comparison

| Module | OLD cmd functions | NEW functions | Delta | Notes |
|---|---|---|---|---|
| state | 12 | 13 | +1 | Extra: `stateExtractField` (helper) + `stateReplaceField` (helper). Missing: `cmdStateRecordMetric` |
| init | 12 | 13 | +1 | Extra: helper(s). Verify 1:1 mapping |
| commands | 11 | 11 | 0 | Verify names match |
| verify | 9 | 9 | 0 | Verify names match |
| phase | 8 | 8 | 0 | Verify names match |
| frontmatter | 4 | 8 | +4 | New helpers likely. Verify coverage |
| config | 3 | 3 | 0 | |
| roadmap | 3 | 4 | +1 | Extra function. Verify |
| milestone | 2 | 3 | +1 | Extra function. Verify |
| template | 2 | 2 | 0 | |
| core | 0 cmd functions | 16 | +16 | Core is utility, not cmd-prefixed |
| **Total** | **66 cmd** | **90 total** | +24 | Helpers + core utilities |

### Step 2.1: Function-by-function parity check

For each of the 11 modules, run a subagent to:
1. List all `function cmd*` in the old `.cjs`
2. List all `function` in the new `.js`
3. Map old → new (name changes expected: `cmdStateLoad` → `stateLoad`)
4. Report any old functions with NO new equivalent
5. Report behavioral differences (parameter changes, logic changes)

Focus on the 5 modules with highest risk: **state, init, verify, phase, commands**

### Step 2.2: Verify `cmdStateRecordMetric` gap

This was flagged in Phase 4 as not ported. Confirm it's still missing and document whether it matters (performance metrics may not be needed in MCP).

---

## Part 3: Skills Content Review (9 skills)

For each of the 9 complex skills, verify the SKILL.md + references contain all workflow steps from the source workflows.

| # | Skill | Source Workflow(s) | Focus |
|---|---|---|---|
| 1 | gsd-quick | workflows/quick.md | Core flow preserved |
| 2 | gsd-execute-phase | workflows/execute-phase.md + execute-plan.md | Wave execution, checkpoints |
| 3 | gsd-plan-phase | workflows/plan-phase.md | Research → plan → verify |
| 4 | gsd-new-project | workflows/new-project.md + discovery-phase.md | Full init pipeline |
| 5 | gsd-verify-work | workflows/verify-work.md + verify-phase.md | UAT and diagnosis |
| 6 | gsd-discuss-phase | workflows/discuss-phase.md | Phase questioning |
| 7 | gsd-debug | workflows/debug.md + diagnose-issues.md | Session management |
| 8 | gsd-milestone | workflows/audit + complete + new-milestone.md | 3 sub-workflows |
| 9 | gsd-map-codebase | workflows/map-codebase.md | 4-focus mapper |

### Step 3.1: Run parallel content comparison

For each skill, a subagent reads OLD workflow(s) and NEW skill (SKILL.md + references/) and reports:
- Steps in OLD workflow missing from NEW skill
- Claude Code patterns (`Task()`, `gsd-tools.cjs`, `$ARGUMENTS`) remaining in NEW
- Templates/references referenced but not present

---

## Part 4: Fix Issues Found

Address any gaps discovered in Parts 2-3. Create targeted fixes for:
- Missing MCP tool functions
- Missing skill workflow steps
- Stale Claude Code references

---

## Part 5: Validation

1. Run full test suite: `node --test tests/*.cjs`
2. Run port-validation tests: `node --test .my/AutomaticTests/*.cjs`
3. Verify no regressions
4. Update `.my/Maintenance/README.md` with findings

---

## Execution Order

| Step | Description | Depends On | Strategy |
|---|---|---|---|
| 1.1 | Add 4 planner sections to planning-workflow.md | — | Direct edit |
| 1.2 | Add 2 verifier sections to uat-workflow.md | — | Direct edit |
| 2.1 | MCP function parity (5 high-risk modules) | — | Subagent per module |
| 3.1 | Skills content comparison (9 skills) | — | Subagent per skill |
| 4 | Fix issues from 2.1 and 3.1 | 2.1, 3.1 | Targeted edits |
| 5 | Run tests, update Maintenance doc | 1.*, 4 | Sequential |

---

## Execution Results

### Part 1: COMPLETED
- Added 4 planning-discipline sections to `planning-workflow.md` (Discovery Levels, Task Sizing, Interface-First Ordering, Specificity Examples)
- Added 2 verifier sections to `uat-workflow.md` (Re-Verification Mode, Must-Haves Options A/B/C)

### Part 2: COMPLETED — No Issues Found
MCP library function parity review found:
- **Verify, Phase, Config, Roadmap, Milestone, Template**: 100% parity (only `raw` parameter removed — intentional)
- **Core**: 13/13 helpers present, `execGit` changed from `execSync` to `execFileSync` (security improvement)
- **Frontmatter**: `spliceFrontmatter()` EXISTS (line 137, used internally by `cmdFrontmatterSet` and `cmdFrontmatterMerge`)
- **Init**: All 12 functions present and exported (subagent incorrectly reported 4 as missing)
- **State**: 12/13 functions. `cmdStateRecordMetric` intentionally deferred (Phase 1 decision, low priority, informational only)
- **Commands**: 11/12 functions. `cmdWebsearch` intentionally deferred (Phase 2 decision, optional Brave API dependency)
- **All `raw` parameter removals are intentional** — MCP returns JSON objects, not stdout

### Part 3: COMPLETED — No Actionable Issues
Skills content comparison for all 9 skills:
- Average completeness: **94%** (range: 92-98%)
- **Zero legacy Claude Code patterns** (no `Task()`, no `~/.claude/` paths, no `allowed_tools`)
- **All referenced templates and references exist** at expected paths
- Minor acceptable gaps: gap closure parent artifacts implicit in execute-phase, Nyquist validation less prominent in plan-phase, global defaults removed from new-project
- All rated as **MIGRATION SUCCESSFUL**

### Part 4: COMPLETED — Nothing to Fix
All identified issues were either:
1. Intentionally deferred (documented in Phase 1/2 specs)
2. False negatives (subagent incorrectly reported existing functions as missing)
3. Acceptable simplifications (not bugs)

### Part 5: COMPLETED — All Tests Pass
- Core tests: **411 passed** (up from 393 baseline — 18 new tests added since baseline)
- Port-validation tests: **180 passed**
- Total: **591 tests, 0 failures**
- MCP server copies verified identical (file hashes match)

**Wave 1 (parallel):** Steps 1.1, 1.2, 2.1, 3.1  
**Wave 2 (sequential):** Step 4 (fixes), Step 5 (validation)

---

## Validation Criteria

- [ ] All 6 lost sections restored in skill references
- [ ] MCP function parity confirmed (or gaps documented as intentional)
- [ ] 9 skills verified against source workflows
- [ ] 573+ tests passing (393 core + 180 port-validation)
- [ ] Maintenance README updated with Phase 8 findings
