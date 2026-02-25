# GSD Maintenance Guide: Merging Changes from get-shit-done → .github

**Created:** 2025-02-25  
**Purpose:** Track how the Claude Code `get-shit-done/` source maps to the Copilot `.github/` + `.gsd/` + `extension/` targets, and provide a review plan for validating port correctness.

---

## 1. Background

GSD was originally built for **Claude Code** (slash commands, `Task()` subagents, bash-based tooling). It was ported to **VS Code GitHub Copilot** across 9 phases (documented in `.my/PortPhases/`). Phase 7 fixed a critical discoverability gap, Phase 8 validated content parity across all components, and Phase 9 hardened the extension and live test infrastructure. The port is NOT a 1:1 transliteration — it required architectural changes:

> **Key Copilot concept:** A `.prompt.md` file = a `/gsd-*` slash command. A `.github/skills/*/SKILL.md` = workflow logic but NOT user-invocable on its own. Complex workflows need BOTH: a prompt (thin router) + a skill (full logic).

| Concept | Claude Code | VS Code Copilot |
|---|---|---|
| Commands | `commands/gsd/*.md` (slash-command YAML) | `.github/prompts/*.prompt.md` (slash commands) + `.github/skills/*/SKILL.md` (workflow logic) |
| Agents | `agents/*.md` | `.github/agents/*.agent.md` |
| Workflows | `get-shit-done/workflows/*.md` | Inlined into skills, prompts, and references |
| CLI tools | `get-shit-done/bin/gsd-tools.cjs` + `lib/*.cjs` | `.gsd/tools/gsd-mcp-server.js` + `lib/*.js` (MCP server) |
| Templates | `get-shit-done/templates/` | Split: `.gsd/templates/` (global) + `.github/skills/*/templates/` (per-skill) |
| References | `get-shit-done/references/` | Split: `.gsd/references/` (global) + `.github/skills/*/references/` (per-skill) |
| Hooks | `hooks/` | `.github/hooks/` + `.gsd/hooks/` |
| Instructions | _(none)_ | `.github/instructions/*.instructions.md` (new concept) |
| Extension | _(none)_ | `extension/` (VS Code tree view, status bar, commands) |
| Installer | `bin/install.js` (npm/Claude) | `bin/copilot-install.js` |

### Key Locations

| Dir | Role | Versioned? |
|---|---|---|
| `get-shit-done/` | **OLD SOURCE** — Claude Code original | Yes (reference) |
| `commands/gsd/` | **OLD SOURCE** — Claude Code commands | Yes (reference) |
| `agents/` | **OLD SOURCE** — Claude Code agents | Yes (reference) |
| `.github/` | **NEW TARGET** — Copilot agents, prompts, skills, instructions | Yes |
| `.gsd/` | **NEW RUNTIME** — MCP server, templates, references | Yes |
| `extension/` | **NEW** — VS Code extension (TypeScript + bundled MCP) | Yes |
| `.my/` | **PRIVATE** — Tests, docs, port phases (not distributed) | No (.gitignore) |

### Copies of MCP Server

The MCP server exists in **2 identical copies** (confirmed by hash):
- `.gsd/tools/gsd-mcp-server.js` + `lib/` — used by standalone MCP config
- `extension/mcp-server/gsd-mcp-server.js` + `lib/` — bundled in VS Code extension

**When you change MCP server code, update BOTH copies** (or create a build step to sync them).

---

## 2. File Mapping: OLD → NEW

### 2.1 Agents (11 files)

| OLD `agents/` | NEW `.github/agents/` | Lines OLD→NEW | Port Type |
|---|---|:---:|---|
| gsd-codebase-mapper.md | gsd-codebase-mapper.agent.md | 764→733 | Direct port (95%) |
| gsd-debugger.md | gsd-debugger.agent.md | 1246→1240 | Direct port (99%) |
| gsd-executor.md | gsd-executor.agent.md | 469→107 | **Rewritten** (MCP-native) |
| gsd-integration-checker.md | gsd-integration-checker.agent.md | 443→301 | Direct port (68%) |
| gsd-phase-researcher.md | gsd-phase-researcher.agent.md | 546→529 | Direct port (96%) |
| gsd-plan-checker.md | gsd-plan-checker.agent.md | 690→107 | **Rewritten** (MCP-native) |
| gsd-planner.md | gsd-planner.agent.md | 1275→118 | **Rewritten** (MCP-native) |
| gsd-project-researcher.md | gsd-project-researcher.agent.md | 621→348 | Partial port (56%) |
| gsd-research-synthesizer.md | gsd-research-synthesizer.agent.md | 239→233 | Direct port (97%) |
| gsd-roadmapper.md | gsd-roadmapper.agent.md | 642→643 | Direct port (100%) |
| gsd-verifier.md | gsd-verifier.agent.md | 573→117 | **Rewritten** (MCP-native) |

**4 agents intentionally rewritten** as lightweight orchestrators because their heavy logic moved into MCP tools (executor, planner, plan-checker, verifier). **1 agent** (project-researcher) has notable content reduction that should be reviewed.

### 2.2 Workflows (33) → Prompts (28) + Skills (9)

**Important: Skills are NOT slash commands.** A `.github/skills/*/SKILL.md` file provides workflow logic but is NOT user-invocable. Every skill needs a matching `.github/prompts/*.prompt.md` file to appear as a `/gsd-*` slash command. The prompt file is a **thin router** that references the skill — the SKILL.md is the single source of truth. (This was a blind spot caught in Phase 7 — see `.my/PortPhases/phase-7-missing-prompts.md`.)

#### Simple workflows (17) — Prompt only, no skill

| OLD `get-shit-done/workflows/` | NEW `.github/prompts/` |
|---|---|
| help.md | gsd-help.prompt.md |
| progress.md | gsd-progress.prompt.md |
| pause-work.md | gsd-pause-work.prompt.md |
| resume-project.md | gsd-resume-work.prompt.md |
| settings.md | gsd-settings.prompt.md |
| add-todo.md | gsd-add-todo.prompt.md |
| check-todos.md | gsd-check-todos.prompt.md |
| add-phase.md | gsd-add-phase.prompt.md |
| remove-phase.md | gsd-remove-phase.prompt.md |
| insert-phase.md | gsd-insert-phase.prompt.md |
| set-profile.md | gsd-set-profile.prompt.md |
| update.md | gsd-update.prompt.md |
| health.md | gsd-health.prompt.md |
| cleanup.md | gsd-cleanup.prompt.md |
| research-phase.md | gsd-research-phase.prompt.md |
| list-phase-assumptions.md | gsd-list-phase-assumptions.prompt.md |
| plan-milestone-gaps.md | gsd-plan-milestone-gaps.prompt.md |

#### Complex workflows (11) — Prompt (thin router) + Skill (full logic)

| OLD `get-shit-done/workflows/` | Prompt (entry point) | Skill (logic) |
|---|---|---|
| quick.md | gsd-quick.prompt.md | gsd-quick/SKILL.md |
| execute-phase.md + execute-plan.md | gsd-execute-phase.prompt.md | gsd-execute-phase/SKILL.md |
| plan-phase.md | gsd-plan-phase.prompt.md | gsd-plan-phase/SKILL.md |
| new-project.md + discovery-phase.md | gsd-new-project.prompt.md | gsd-new-project/SKILL.md |
| verify-work.md + verify-phase.md | gsd-verify-work.prompt.md | gsd-verify-work/SKILL.md |
| discuss-phase.md | gsd-discuss-phase.prompt.md | gsd-discuss-phase/SKILL.md |
| debug.md + diagnose-issues.md | gsd-debug.prompt.md | gsd-debug/SKILL.md |
| audit-milestone.md | gsd-audit-milestone.prompt.md | gsd-milestone/SKILL.md (audit flow) |
| complete-milestone.md | gsd-complete-milestone.prompt.md | gsd-milestone/SKILL.md (complete flow) |
| new-milestone.md | gsd-new-milestone.prompt.md | gsd-milestone/SKILL.md (new flow) |
| map-codebase.md | gsd-map-codebase.prompt.md | gsd-map-codebase/SKILL.md |

#### NOT PORTED

| OLD Workflow | Reason |
|---|---|
| transition.md | Obsolete |
| add-tests.md | Not in Copilot flow |
| join-discord (command only) | Promotional only |

### 2.3 CLI Libraries (11 modules) → MCP Server Libraries

| OLD `get-shit-done/bin/lib/` | NEW `.gsd/tools/lib/` | Also at `extension/mcp-server/lib/` |
|---|---|---|
| commands.cjs | commands.js | commands.js (identical) |
| config.cjs | config.js | config.js (identical) |
| core.cjs | core.js | core.js (identical) |
| frontmatter.cjs | frontmatter.js | frontmatter.js (identical) |
| init.cjs | init.js | init.js (identical) |
| milestone.cjs | milestone.js | milestone.js (identical) |
| phase.cjs | phase.js | phase.js (identical) |
| roadmap.cjs | roadmap.js | roadmap.js (identical) |
| state.cjs | state.js | state.js (identical) |
| template.cjs | template.js | template.js (identical) |
| verify.cjs | verify.js | verify.js (identical) |

**All `.cjs` → `.js` are DIFFERENT content** (rewritten for MCP, not just renamed). The `.gsd/` and `extension/` copies are currently **IDENTICAL** — keep them in sync.

### 2.4 Templates (30 → 41)

| OLD `get-shit-done/templates/` | NEW Location | Notes |
|---|---|---|
| config.json | `.gsd/templates/config.json` | Global |
| state.md | `.gsd/templates/state.md` | Global |
| continue-here.md | `.gsd/templates/continue-here.md` | Global |
| summary.md | `.gsd/templates/summary.md` | Global |
| summary-complex.md | `.gsd/templates/summary-complex.md` | Global |
| summary-minimal.md | `.gsd/templates/summary-minimal.md` | Global |
| summary-standard.md | `.gsd/templates/summary-standard.md` | Global |
| debug-subagent-prompt.md | `.gsd/templates/debug-subagent-prompt.md` | Global |
| planner-subagent-prompt.md | `.gsd/templates/planner-subagent-prompt.md` | Global |
| VALIDATION.md | `.github/skills/gsd-plan-phase/templates/validation.md` | Skill-scoped |
| context.md | `.github/skills/gsd-discuss-phase/templates/context.md` | Skill-scoped |
| discovery.md | `.github/skills/gsd-new-project/templates/discovery.md` | Skill-scoped |
| project.md | `.github/skills/gsd-new-project/templates/project.md` | Skill-scoped |
| requirements.md | `.github/skills/gsd-new-project/templates/requirements.md` | Skill-scoped |
| roadmap.md | `.github/skills/gsd-new-project/templates/roadmap.md` | Skill-scoped |
| research.md | `.github/skills/gsd-plan-phase/templates/research.md` | Skill-scoped |
| phase-prompt.md | `.github/skills/gsd-plan-phase/templates/phase-prompt.md` | Skill-scoped |
| UAT.md | `.github/skills/gsd-verify-work/templates/UAT.md` | Skill-scoped |
| verification-report.md | `.github/skills/gsd-execute-phase/templates/verification-report.md` | Skill-scoped |
| milestone-archive.md | `.github/skills/gsd-milestone/templates/milestone-archive.md` | Skill-scoped |
| retrospective.md | `.github/skills/gsd-milestone/templates/retrospective.md` | Skill-scoped |
| codebase/* (7) | `.github/skills/gsd-map-codebase/templates/codebase/` | Skill-scoped |
| research-project/* (5) | `.gsd/templates/research-project/` | Global |
| user-setup.md | — | Not ported (unused) |
| milestone.md | — | Not needed (in skill) |
| **NEW in Copilot** | | |
| — | `.github/skills/gsd-debug/templates/debug-session.md` | New |
| — | `.github/skills/gsd-quick/templates/plan.md` | New |
| — | `.github/skills/gsd-quick/templates/summary.md` | New |
| — | `.github/skills/gsd-execute-phase/templates/summary.md` | New |
| — | `.gsd/templates/research-project/COMPARISON.md` | New |
| — | `.gsd/templates/research-project/FEASIBILITY.md` | New |

### 2.5 References (14 → 32)

| OLD `get-shit-done/references/` | NEW `.gsd/references/` | Status |
|---|---|---|
| checkpoints.md | checkpoints.md | ✅ Ported |
| continuation-format.md | continuation-format.md | ✅ Ported |
| decimal-phase-calculation.md | decimal-phase-calculation.md | ✅ Ported |
| git-integration.md | git-integration.md | ✅ Ported |
| git-planning-commit.md | git-planning-commit.md | ✅ Ported |
| model-profile-resolution.md | model-profile-resolution.md | ✅ Ported |
| model-profiles.md | model-profiles.md | ✅ Ported |
| phase-argument-parsing.md | phase-argument-parsing.md | ✅ Ported |
| planning-config.md | planning-config.md | ✅ Ported |
| questioning.md | questioning.md | ✅ Ported |
| tdd.md | tdd.md | ✅ Ported |
| ui-brand.md | ui-brand.md | ✅ Ported |
| verification-patterns.md | verification-patterns.md | ✅ Ported |

**Plus 19 NEW skill-scoped references** in `.github/skills/*/references/` — these have no old equivalent (they were extracted from workflow content).

### 2.6 Instructions (NEW — no old equivalent)

| File | Applies To |
|---|---|
| `.github/instructions/planning-docs.instructions.md` | `.planning/**` |
| `.github/instructions/gsd-plans.instructions.md` | `.planning/phases/**/*-PLAN.md` |
| `.github/instructions/gsd-quick.instructions.md` | `.planning/quick/**` |
| `.github/instructions/gsd-research.instructions.md` | `.planning/phases/**/*-RESEARCH.md` |
| `.github/instructions/gsd-state.instructions.md` | `.planning/STATE.md` |
| `.github/instructions/gsd-summaries.instructions.md` | `.planning/phases/**/*-SUMMARY.md` |

### 2.7 Hooks

| OLD `hooks/` | NEW Location | Status |
|---|---|---|
| gsd-check-update.js | `.gsd/hooks/check-update.js` | Ported |
| gsd-context-monitor.js | `.gsd/hooks/context-monitor.js` | Stub (7 lines) |
| gsd-statusline.js | Extension `statusBar.ts` | Replaced by native VS Code |

---

## 3. Maintenance Workflow: When get-shit-done Changes

When changes are made to the Claude Code source (`get-shit-done/`), follow this process to propagate them:

### 3.1 Change to a Library Module (e.g., `get-shit-done/bin/lib/state.cjs`)

1. Apply the equivalent change to `.gsd/tools/lib/state.js`
2. Copy the updated file to `extension/mcp-server/lib/state.js`
3. Run tests: `node tests/copilot-state.test.cjs`
4. If extension changed, rebuild VSIX

### 3.2 Change to a Workflow (e.g., `get-shit-done/workflows/quick.md`)

1. Identify the target: is it a **prompt** (`.github/prompts/`) or a **skill** (`gsd-quick/SKILL.md`)?
2. Apply the change to the correct Copilot file
3. If the workflow references templates/references, check those too

### 3.3 Change to an Agent (e.g., `agents/gsd-planner.md`)

1. If the agent was **directly ported** (codebase-mapper, debugger, etc.): apply change to `.github/agents/{name}.agent.md`
2. If the agent was **rewritten** (executor, planner, plan-checker, verifier): evaluate if the change applies to the lightweight agent or to MCP tool logic

### 3.4 Change to Templates or References

1. Check the mapping table above for the new location
2. If template is in `.gsd/templates/` — update there
3. If template is in `.github/skills/*/templates/` — update there
4. References: same pattern (`.gsd/references/` or `.github/skills/*/references/`)

---

## 4. Test Infrastructure in `.my/`

| Directory | Purpose | How to Run |
|---|---|---|
| `.my/AutomaticTests/` | Port validation tests (6 files) | `node .my/AutomaticTests/port-validation-*.test.cjs` |
| `.my/IntegrationTests/` | Copilot integration tests | `node .my/IntegrationTests/copilot-integration.test.cjs` |
| `.my/EndToEndTests/` | E2E with MCP client (5 files) | `node .my/EndToEndTests/e2e-*.test.cjs` |
| `.my/LiveTests/` | Live Copilot tests (real VS Code instance) | `node .my/LiveTests/run-live-tests.cjs` |
| `.my/ManualTests/` | Manual test checklists (7 files) | Read and execute manually |
| `tests/` | Core unit tests (19 files, 411 tests) | `node --test tests/` |

**Live Tests note:** Launches a real VS Code Insiders instance with the GSD extension loaded. Creates a temporary workspace with `.gsd/`, `.github/`, `.vscode/` and `.planning/` structure. Executes `/gsd-*` chat commands and validates file system side effects. Cannot run while another VS Code instance uses the same user-data directory. See `.my/RCA-mcp-trust-prompt.md` for known issues with MCP trust prompts blocking fully automated execution.

---

## 5. Review Plan: Verify Port Correctness

The review is organized per-component. Each section can be executed independently (by a subagent or manually).

### Review Checklist Format

For each file pair (OLD → NEW), verify:
- [ ] **Completeness**: All functional content from OLD exists in NEW
- [ ] **Correctness**: Claude Code primitives (`Task()`, `$ARGUMENTS`, etc.) replaced with Copilot equivalents
- [ ] **No Stale References**: No mentions of `gsd-tools.cjs`, `SlashCommand`, Claude-specific patterns
- [ ] **Frontmatter Valid**: YAML frontmatter uses Copilot schema (`description`, `tools`, `model`, etc.)
- [ ] **Templates Reachable**: Any referenced templates exist at the expected path

### Review 1: Agents (11 pairs)

**Priority: HIGH** — 4 agents were intentionally rewritten (shorter). The other 7 should be near-complete ports.

| # | OLD | NEW | Focus |
|---|---|---|---|
| 1 | agents/gsd-executor.md | .github/agents/gsd-executor.agent.md | Verify rewrite captures all execution logic |
| 2 | agents/gsd-planner.md | .github/agents/gsd-planner.agent.md | Verify rewrite captures planning protocol |
| 3 | agents/gsd-plan-checker.md | .github/agents/gsd-plan-checker.agent.md | Verify 8 verification dimensions preserved |
| 4 | agents/gsd-verifier.md | .github/agents/gsd-verifier.agent.md | Verify goal-backward verification protocol |
| 5 | agents/gsd-project-researcher.md | .github/agents/gsd-project-researcher.agent.md | **56% coverage** — check what's missing |
| 6 | agents/gsd-integration-checker.md | .github/agents/gsd-integration-checker.agent.md | 68% coverage — check truncation |
| 7-11 | (remaining 5) | (corresponding .agent.md) | Verify near-100% ports |

### Review 2: Workflows → Skills (9 skills)

**Priority: HIGH** — Complex workflows were restructured. Verify all steps survived.

| # | OLD Workflow(s) | NEW Skill | Focus |
|---|---|---|---|
| 1 | workflows/quick.md | gsd-quick/SKILL.md | Core quick task flow |
| 2 | workflows/execute-phase.md + execute-plan.md | gsd-execute-phase/SKILL.md | Wave execution, checkpoints, deviation handling |
| 3 | workflows/plan-phase.md | gsd-plan-phase/SKILL.md | Research → plan → verify pipeline |
| 4 | workflows/new-project.md + discovery-phase.md | gsd-new-project/SKILL.md | Full project initialization |
| 5 | workflows/verify-work.md + verify-phase.md | gsd-verify-work/SKILL.md | UAT and diagnosis |
| 6 | workflows/discuss-phase.md | gsd-discuss-phase/SKILL.md | Phase questioning |
| 7 | workflows/debug.md + diagnose-issues.md | gsd-debug/SKILL.md | Debug session management |
| 8 | workflows/audit-milestone.md + complete-milestone.md + new-milestone.md | gsd-milestone/SKILL.md | Milestone lifecycle |
| 9 | workflows/map-codebase.md | gsd-map-codebase/SKILL.md | Codebase analysis |

### Review 3: Workflows → Prompts (28 prompts)

**Priority: MEDIUM** — Simple workflows became one-shot prompts. Complex workflows got thin-router prompts pointing to skills (Phase 7).

For the 17 simple prompts:
- Compare against the corresponding `get-shit-done/workflows/*.md`
- Verify all steps/instructions are present
- Verify MCP tool calls replace CLI tool calls

For the 11 skill-routing prompts (Phase 7 additions):
- Verify they reference the correct skill SKILL.md
- Verify argument parsing (`$ARGUMENTS`) is handled
- Verify they don't duplicate skill content (thin router pattern)

### Review 4: MCP Server Libraries (11 modules)

**Priority: HIGH** — The core engine. All CLI functions must have MCP equivalents.

| # | OLD `.cjs` | NEW `.js` | Functions |
|---|---|---|---|
| 1 | lib/state.cjs | lib/state.js | 11 state management functions |
| 2 | lib/init.cjs | lib/init.js | 12 context initialization functions |
| 3 | lib/phase.cjs | lib/phase.js | 8 phase operation functions |
| 4 | lib/verify.cjs | lib/verify.js | 9 verification functions |
| 5 | lib/commands.cjs | lib/commands.js | 11 utility functions |
| 6 | lib/core.cjs | lib/core.js | 17 core utility functions |
| 7 | lib/frontmatter.cjs | lib/frontmatter.js | 9 YAML frontmatter functions |
| 8 | lib/roadmap.cjs | lib/roadmap.js | 4 roadmap functions |
| 9 | lib/config.cjs | lib/config.js | 3 config functions |
| 10 | lib/milestone.cjs | lib/milestone.js | 3 milestone functions |
| 11 | lib/template.cjs | lib/template.js | 2 template functions |

For each module: enumerate exported functions in OLD, verify each exists in NEW with correct behavior.

### Review 5: Templates (30 old → 41 new)

**Priority: MEDIUM** — Verify template content preserved, placeholders intact.

- Compare each old template against its new location (see mapping in §2.4)
- Verify `{{placeholder}}` syntax preserved
- Verify frontmatter templates are valid

### Review 6: References (14 old → 32 new)

**Priority: LOW** — Mostly documentation. Verify content not stale.

- Compare each old reference against `.gsd/references/` copy
- Verify no Claude Code-specific instructions remain

### Review 7: Instructions (6 files, NEW)

**Priority: LOW** — No old equivalent to compare. Just verify they work.

- Verify `applyTo` patterns match intended files
- Verify content is consistent with skill/workflow expectations

---

## 6. Executing Reviews with Subagents

Each review section above can be executed in parallel by a subagent using the `Explore` agent:

```
For Review N: 
1. Read the OLD file(s)
2. Read the NEW file(s)  
3. Diff the content conceptually (not line-by-line — the format changed)
4. Report: missing sections, stale Claude references, incomplete ports
```

### Suggested Subagent Prompts

**Agent Review (per agent):**
> Read `agents/{name}.md` and `.github/agents/{name}.agent.md`. Compare them.
> Report: (1) sections/rules in OLD missing from NEW, (2) Claude Code primitives still in NEW (Task, SlashCommand, $ARGUMENTS, allowed-tools), (3) frontmatter validity for Copilot.

**Skill Review (per skill):**
> Read the OLD workflow(s) that map to `.github/skills/{name}/SKILL.md`. Also read the skill's references/ and templates/.
> Report: (1) workflow steps missing from SKILL.md, (2) templates referenced but not present, (3) MCP tools referenced vs available.

**MCP Library Review (per module):**
> Read `get-shit-done/bin/lib/{name}.cjs` and `.gsd/tools/lib/{name}.js`.
> List all exported functions in each. Report: (1) functions in OLD not in NEW, (2) behavioral differences, (3) stale CLI patterns in NEW.

---

## 7. Review Findings (2025-02-25)

### 7.1 Test Baseline

| Suite | Tests | Status |
|---|---|---|
| Core unit tests (`tests/*.cjs`) | 393 | ✅ All passing |
| Port-validation tests (`.my/AutomaticTests/`) | 180 | ✅ All passing |
| **Total** | **573** | ✅ |

### 7.2 Agent Content Review

Tests verify structure (files exist, frontmatter valid). This review checked **content completeness** — whether behavioral rules from old agents survived the port.

**4 REWRITTEN agents** (executor, planner, plan-checker, verifier) were intentionally shortened because logic moved to MCP tools + skill references. Cross-reference results:

| Agent | Visible Coverage | Logic Location Verified? | Gaps |
|---|---|---|---|
| **gsd-executor** | ~50% in .agent.md | ✅ Deviation rules → `deviation-rules.md`; Checkpoint → `checkpoint-protocol.md` | TDD flow details compressed (concept present, steps reduced) |
| **gsd-plan-checker** | ~50% in .agent.md | ✅ All 8 dims → `plan-checking.md` | Nyquist compliance concept present but metrics not fully defined |
| **gsd-planner** | ~40% in .agent.md | ⚠️ **GAP** — content NOT in skills either | See §7.3 below |
| **gsd-verifier** | ~40% in .agent.md | ⚠️ **PARTIAL** — wiring/stubs → `verification-report.md` | See §7.3 below |

**2 UNDER-PORTED agents** — acceptable:

| Agent | Coverage | Verdict |
|---|---|---|
| gsd-project-researcher | 56% | ✅ OK — missing content moved to templates, philosophy preserved |
| gsd-integration-checker | 68% | ✅ OK — missing content is bash detail, logic preserved |

**5 NEAR-100% agents** — scanned for stale Claude refs, all clean.

### 7.3 Lost Planning Discipline (actionable gaps)

These sections existed in the **old Claude Code agents** but are NOT in the new `.agent.md` AND NOT in the corresponding skill references. They represent genuine content loss:

| # | Source | Lost Content | Impact | Priority |
|---|---|---|---|---|
| 1 | gsd-planner.md | **Discovery Levels 0-3** — when to skip research, quick verify, standard, or deep dive (~280 lines) | Plans may over-research or under-research | P2 |
| 2 | gsd-planner.md | **Task Sizing (15-60 min)** — time-budget per task, split signals | Plans may have over-scoped or micro tasks | P2 |
| 3 | gsd-planner.md | **Specificity Examples** — "TOO VAGUE vs JUST RIGHT" with 8 example pairs | Planner may produce vague tasks | P2 |
| 4 | gsd-planner.md | **Interface-First Ordering** — Wave 0 skeleton pattern | Dependencies may be mis-ordered | P3 |
| 5 | gsd-verifier.md | **Re-Verification Mode** — proper re-entry protocol after fixes | Gap-closure loops less efficient | P3 |
| 6 | gsd-verifier.md | **Must-Haves Options A/B/C** — 3 extraction strategies with fallback | Verifier may miss extraction options | P3 |

**Status: FIXED in Phase 8 Part 1** — All 6 sections added to skill references:
- Items 1-4 → `.github/skills/gsd-plan-phase/references/planning-workflow.md`
- Items 5-6 → `.github/skills/gsd-verify-work/references/uat-workflow.md`

### 7.4 Infrastructure & Sync Issues

| # | Severity | Area | Issue |
|---|---|---|---|
| 1 | P1 | MCP sync | `.gsd/tools/` and `extension/mcp-server/` must be kept identical (currently are) |
| 2 | ~~P2~~ | Agents | ~~2 agents have Claude-style `tools:` frontmatter~~ — **FIXED in Phase 7** |
| 3 | P2 | MCP | `cmdStateRecordMetric` (performance metrics) not ported |
| 4 | P2 | Hooks | `context-monitor.js` is a 7-line stub |
| 5 | P3 | Extension | No CI build script for VSIX |
| 6 | P3 | Commands | 71 stale Claude Code references in `commands/gsd/*.md` source files |

---

## 8. Phase 8 Results (Content Parity)

Phase 8 executed all remaining high-priority reviews. See `.my/PortPhases/phase-8-content-parity.md` for full plan.

### 8.1 Part 1 — Lost Planning Discipline (FIXED)
All 6 lost sections from §7.3 restored to skill references:
- Items 1-4 → [planning-workflow.md](.github/skills/gsd-plan-phase/references/planning-workflow.md) (Discovery Levels, Task Sizing, Interface-First Ordering, Specificity Examples)
- Items 5-6 → [uat-workflow.md](.github/skills/gsd-verify-work/references/uat-workflow.md) (Re-Verification Mode, Must-Haves Options A/B/C)

### 8.2 Part 2 — MCP Library Parity (CLEAN)

| Module | Functions | Parity | Notes |
|---|---|---|---|
| state | 12/13 | 92% | `cmdStateRecordMetric` intentionally deferred (Phase 1, low priority) |
| init | 12/12 | 100% | All functions present including `cmdInitTodos/MilestoneOp/MapCodebase/Progress` |
| commands | 11/12 | 92% | `cmdWebsearch` intentionally deferred (Phase 2, optional Brave API) |
| verify | 9/9 | 100% | |
| phase | 8/8 | 100% | |
| frontmatter | 8/8 | 100% | `spliceFrontmatter()` present as internal helper |
| config | 3/3 | 100% | |
| core | 13/13 | 100% | `execGit` → `execFileSync` (security improvement) |
| roadmap | 3/3 | 100% | |
| milestone | 2/2 | 100% | |
| template | 2/2 | 100% | |
| **Total** | **83/85** | **97.6%** | 2 intentional deferrals |

All `raw` parameter removals confirmed intentional (MCP returns JSON, not stdout).
MCP server copies verified identical (file hash comparison).

### 8.3 Part 3 — Skills Content (CLEAN)

| Skill | Completeness | Legacy Patterns | Refs Exist |
|---|---|---|---|
| gsd-quick | 95% | None | ✓ |
| gsd-execute-phase | 92% | None | ✓ |
| gsd-plan-phase | 94% | None | ✓ |
| gsd-new-project | 93% | None | ✓ |
| gsd-verify-work | 94% | None | ✓ |
| gsd-discuss-phase | 98% | None | ✓ |
| gsd-debug | 96% | None | ✓ |
| gsd-milestone | 94% | None | ✓ |
| gsd-map-codebase | 97% | None | ✓ |
| **Average** | **94.8%** | **Zero** | **All** |

Minor acceptable gaps: gap closure parent artifacts implicit in execute-phase, Nyquist validation less prominent in plan-phase, global defaults removed from new-project. All rated as migration successful.

### 8.4 Test Counts After Phase 8
- Core: **411 passed** (up from 393 baseline)
- Port-validation: **180 passed**
- Total: **591 tests, 0 failures**

### 8.5 Updated Review Status

| Review | Priority | Status | Result |
|---|---|---|---|
| Review 1: Agents | HIGH | **DONE** (§7.3) | 6 gaps found → fixed in Part 1 |
| Review 2: Skills | HIGH | **DONE** (§8.3) | 94.8% avg, zero legacy patterns |
| Review 4: MCP Libraries | HIGH | **DONE** (§8.2) | 97.6% parity, 2 intentional deferrals |
| Review 3: Prompts | MEDIUM | **DONE** (§9.1) | 28/28 valid, 1 missing prompt (add-tests) |
| Review 5: Templates | MEDIUM | **DONE** (§9.2) | 26 new clean, 10 old intentionally not ported |
| Review 6: References | LOW | Not started | Reference content freshness |
| Review 7: Instructions | LOW | **DONE** (§9.3) | 6/6 valid, zero legacy patterns |

**All HIGH and MEDIUM reviews complete.** Only Review 6 (low-priority reference freshness) remains.

---

## 9. Second Review Pass (Feb 2026)

### 9.1 Prompt Review (Review 3)

**28 prompts reviewed** — all skill/agent references verified valid.

- **`$ARGUMENTS` usage (21 prompts):** Valid Copilot prompt convention, NOT a legacy pattern. This is how `.prompt.md` files receive user input when invoked as `/gsd-*` commands.
- **Routing breakdown:** 10 skill-routing prompts, 18 inline (most with MCP tools)
- **Broken references:** None — all skill and agent refs point to existing files

**Missing prompts (3 commands without `.prompt.md`):**

| Command | Verdict | Reason |
|---|---|---|
| `add-tests` | Should port | Substantial workflow (test generation from UAT criteria) — worth having |
| `join-discord` | Skip | Trivial static text — not applicable to Copilot distribution |
| `reapply-patches` | Skip | Claude Code-specific (`~/.claude/gsd-local-patches`), not applicable to Copilot |

### 9.2 Template Review (Review 5)

**26 new templates, all clean** — zero legacy patterns in any new template file.

**10 old templates intentionally not ported:**

| Category | Templates | Reason |
|---|---|---|
| Subagent prompts (3) | `debug-subagent-prompt.md`, `planner-subagent-prompt.md`, `DEBUG.md` | Replaced by `.agent.md` files + skill-based role-play |
| Research-project (3) | `FEATURES.md`, `PITFALLS.md`, `SUMMARY.md` | Absorbed into `gsd-new-project` discovery flow (`discovery.md` template) |
| Summary variants (3) | `summary-minimal.md`, `summary-standard.md`, `summary-complex.md` | Consolidated into single `summary.md` per skill; `cmdTemplateSelect` still selects complexity level |
| Continuation (1) | `continue-here.md` | Replaced by STATE.md session tracking + `gsd_state_record_session` |

**Placeholder convention change:** Old templates use `[brackets]`, new use `{braces}`. Intentional — `cmdTemplateFill` generates inline templates with `[bracket]` human-readable markers, while skill template files use `{braces}` for programmatic substitution. Not a conflict.

### 9.3 Instructions Review (Review 7)

**6 instruction files, all valid:**

| File | `applyTo` | Status |
|---|---|---|
| `gsd-plans.instructions.md` | `.planning/phases/**/*-PLAN.md` | OK |
| `gsd-quick.instructions.md` | `.planning/quick/**` | OK |
| `gsd-research.instructions.md` | `.planning/phases/**/*-RESEARCH.md` | OK |
| `gsd-state.instructions.md` | `.planning/STATE.md` | OK |
| `gsd-summaries.instructions.md` | `.planning/phases/**/*-SUMMARY.md` | OK |
| `planning-docs.instructions.md` | `.planning/**` | OK |

All patterns target `.planning/` which only exists in GSD-managed projects. Content is clean, current, and uses MCP tools correctly. Main `copilot-instructions.md` verified accurate.

### 9.4 Remaining Items

| Item | Priority | Action |
|---|---|---|
| Create `gsd-add-tests.prompt.md` | P3 | Port test generation workflow as a new prompt |
| Review 6: Reference freshness | P4 | Check `.gsd/references/` and skill references for stale content |

Neither blocks production use.

---

## 10. Phase 9 Results (Extension & Live Testing)

Phase 9 focused on hardening the VS Code extension's MCP server registration and building out the live test infrastructure. See `.my/PortPhases/phase-9-extension-and-live-tests.md` for full plan.

### 10.1 Extension MCP Registration Fix

**Problem:** The extension bundled its own copy of the MCP server (`extension/mcp-server/`) and registered it via the extension URI. This meant the server ran from a different path than the workspace `.gsd/` copy, creating a dual-server confusion.

**Fix:** Changed extension to register the **workspace's own** `.gsd/tools/gsd-mcp-server.js` instead of the bundled copy:
- Path: `extensionUri/mcp-server/` → `workspaceFolder/.gsd/tools/`
- Provider ID: `gsd-tools` → `gsd.mcp-servers`
- Executable: hardcoded `node` → `process.execPath` (respects user's Node version)
- Guard: Only registers if `.gsd/tools/gsd-mcp-server.js` actually exists in workspace

The bundled `extension/mcp-server/` copy remains as fallback/reference but is no longer used at runtime.

### 10.2 MCP Trust Prompt RCA

**Issue:** Live tests show persistent "Allow" buttons requiring manual intervention, blocking fully automated testing.

**Root Cause (from VS Code source analysis of 1.109.5):**

| MCP Source | trustBehavior | Prompt? |
|---|:---:|---|
| `.vscode/mcp.json` (config file) | 0 | **No** — auto-trusted |
| `settings.json` MCP entries | 0 | **No** — auto-trusted |
| Extension API (`registerMcpServerDefinitionProvider`) | 1 (default) | **Yes** |

Fresh VS Code user-data directory = no stored trust in `state.vscdb` = always prompted for extension-registered servers. The live test framework creates a fresh user-data dir each run.

**Status:** Outstanding. Multiple mitigation attempts documented in `.my/RCA-mcp-trust-prompt.md`. The `.vscode/mcp.json` config file approach auto-trusts (trustBehavior:0) but the extension's programmatic registration triggers prompts (trustBehavior:1). Possible resolutions:
- Accept manual Allow click during test warmup (current workaround)
- Pre-seed `state.vscdb` with trust entries
- Use `.vscode/mcp.json` as the sole MCP source, remove extension registration

### 10.3 Live Test Framework

Built comprehensive live test suite in `.my/LiveTests/`:

| File | Tests | Scope |
|---|---|---|
| `01-activation.test.cjs` | Extension activation, MCP server start | Smoke test |
| `02-readonly-commands.test.cjs` | `/gsd-help`, `/gsd-health`, read-only commands | Query commands |
| `03-stateful-commands.test.cjs` | `/gsd-add-todo`, commands that modify state | Write commands |
| `04-mcp-chain.test.cjs` | Multi-tool MCP chains | Tool orchestration |
| `05-edge-cases.test.cjs` | Error handling, missing files | Resilience |
| `06-document-creation.test.cjs` | `/gsd-new-project` file creation | Complex workflow |

Framework (`run-live-tests.cjs`) handles: temp workspace creation, VS Code Insiders launch, extension installation, fixture setup, sequential test execution, and cleanup.

### 10.4 File Reorganization

- Moved old phase docs from `.my/` root into `.my/PortPhases/` (phase-1 through phase-6 reviews, supplementary specs, copilot-porting-analysis)
- Removed `.vscode/mcp.json` — MCP server now registered programmatically by extension
- Updated `.my/` structure to clearly separate concerns (AutomaticTests, EndToEndTests, IntegrationTests, LiveTests, ManualTests, Maintenance, PortPhases, Docs)

### 10.5 Test Counts After Phase 9
- Core: **411 passed** (19 test files including structural tests)
- Port-validation: **180 passed** (6 files)
- Total: **591 tests, 0 failures**

### 10.6 Updated Review Status

| Review | Priority | Status | Result |
|---|---|---|---|
| Review 1: Agents | HIGH | **DONE** (§7.3) | 6 gaps found → fixed in Phase 8 |
| Review 2: Skills | HIGH | **DONE** (§8.3) | 94.8% avg, zero legacy patterns |
| Review 4: MCP Libraries | HIGH | **DONE** (§8.2) | 97.6% parity, 2 intentional deferrals |
| Review 3: Prompts | MEDIUM | **DONE** (§9.1) | 28/28 valid |
| Review 5: Templates | MEDIUM | **DONE** (§9.2) | 26 new clean, 10 old intentionally not ported |
| Review 7: Instructions | LOW | **DONE** (§9.3) | 6/6 valid, zero legacy patterns |
| Review 6: References | LOW | Not started | Reference content freshness |

**All HIGH and MEDIUM reviews complete.** Only Review 6 (low-priority reference freshness) remains.

### 10.7 Remaining Items

| Item | Priority | Status |
|---|---|---|
| Resolve MCP trust prompt for live tests | P2 | RCA done, fix pending (see §10.2) |
| Create `gsd-add-tests.prompt.md` | P3 | Port test generation workflow |
| Review 6: Reference freshness | P4 | Check `.gsd/references/` for stale content |
| Extension MCP: evaluate removing programmatic registration | P3 | Use `.vscode/mcp.json` only (simplifies trust) |
