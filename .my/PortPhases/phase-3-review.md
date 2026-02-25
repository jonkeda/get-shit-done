# Phase 3: Polish & Distribution — Implementation Review

**Review Date:** 2025-02-24  
**Spec Documents:** `phase-3-polish-and-distribution.md`, `phase-3-supplementary-specs.md`  
**Verdict:** Substantially complete with notable gaps in hooks, model profiles, and minor installer behaviors.

---

## Overall Score: 78/100

| Area | Score | Weight | Notes |
|------|-------|--------|-------|
| Installer (Step 1) | 80% | 20% | Core works; hooks merge and skip-if-exists missing |
| Multi-Model Support (Step 2) | 40% | 10% | 7/11 agents have model:; no gsd_switch_profile tool |
| VS Code Extension (Step 3) | 90% | 15% | Fully scaffolded with status bar, tree view, commands, settings |
| Instructions Files (Step 4) | 95% | 10% | All 6 files exist with correct applyTo patterns |
| Documentation (Step 5) | 85% | 10% | 5 docs + README; context-monitor doc is Claude-only |
| Testing (Step 6) | 75% | 20% | 137 Copilot tests pass, 252 total (4 failing); spec gaps in integration chains |
| Windows Compat (Supp B) | 85% | 10% | execFileSync ✓, fs.readdirSync ✓; missing windowsHide and normalizePath |
| Hooks (Supp A4) | 20% | 5% | context-monitor is stub; no hook merging in installer |

---

## Step 1: Installer (`bin/copilot-install.js`) — 80%

### What's Implemented ✅
- Fresh install copies all file categories: agents, skills, prompts, instructions, `.gsd/`, references, templates
- `--update` mode with `VERSION` tracking in `.gsd/VERSION`
- `--uninstall` mode with full cleanup (preserves `.planning/`)
- `--dry-run` and `--force` flags
- Section-append for `copilot-instructions.md` (but see marker issue below)
- `.vscode/mcp.json` merge — adds/updates `gsd-tools` entry, preserves other servers
- `.gsd/` added to `.gitignore`
- `--version` and `--help` flags
- Uninstall cleans up empty `.github/` subdirectories

### What's Missing ❌

| Gap | Spec Reference | Severity |
|-----|---------------|----------|
| **No `.github/hooks/` merging** | Supp A4 — GSD hooks identified by `.gsd/hooks/` in command path; should merge on install, remove on uninstall | **HIGH** |
| **Instructions always overwritten** | Supp A2 — "Skip if exists with same name" for `.github/instructions/*.instructions.md` | MEDIUM |
| **No GSD:BEGIN/GSD:END markers** in shipped `copilot-instructions.md` source | Supp A3 — the markers are used by the installer's section-append logic but the source file may lack them for first install | LOW (installer adds them on copy) |
| **No post-install verification** | Step 1c item 7 — "Verify installation — check key files exist" | MEDIUM |
| **Update = full overwrite** | Step 1d — "Preserve user customizations" — currently all files overwritten identically | LOW (acceptable for v1) |

---

## Step 2: Multi-Model Support — 40%

### What's Implemented ✅
- 7 of 11 agents have `model:` frontmatter arrays:
  - `gsd-codebase-mapper`: `[claude-sonnet-4, gpt-4.1]`
  - `gsd-debugger`: `[claude-sonnet-4, gpt-4.1, gemini-2.5-pro]`
  - `gsd-phase-researcher`: `[claude-sonnet-4, gpt-4.1, gemini-2.5-pro]`
  - `gsd-project-researcher`: `[claude-sonnet-4, gpt-4.1]`
  - `gsd-research-synthesizer`: `[claude-sonnet-4, gpt-4.1]`
  - `gsd-roadmapper`: `[claude-sonnet-4, gpt-4.1, gemini-2.5-pro]`
  - `gsd-integration-checker`: `[claude-sonnet-4, gpt-4.1]`

### What's Missing ❌

| Gap | Spec Reference | Severity |
|-----|---------------|----------|
| **4 core agents missing `model:` frontmatter** — `gsd-executor`, `gsd-plan-checker`, `gsd-planner`, `gsd-verifier` | Step 2a table — all should have model arrays | **HIGH** |
| **`gsd_switch_profile` MCP tool not created** | Step 2b — should read all `.agent.md` files and rewrite `model:` based on profile map | **HIGH** |
| **`gsd-codebase-mapper` spec says `claude-haiku-3.5`** as primary but implementation has `claude-sonnet-4` | Step 2a table | LOW |

---

## Step 3: VS Code Extension — 90%

### What's Implemented ✅
- Full extension scaffold under `extension/`
- `package.json` with correct contributions:
  - Activity bar container (`gsd-explorer`)
  - Tree view (`gsdProjectView`) with `gsd:hasPlanning` condition
  - 6 commands: newProject, planPhase, executePhase, quick, progress, switchProfile
  - 4 settings: modelProfile, workflow.research, workflow.planCheck, workflow.verifier
- `extension.ts`: activation, context key, file watcher, component wiring
- `statusBar.ts`: left-aligned with phase/plan display, color-coded by status, auto-refresh
- `treeView.ts`: project, progress, phases (expandable with plan children), todos, blockers
- `commands.ts`: all 6 commands route to Copilot chat with input boxes
- `stateParser.ts`: parses STATE.md frontmatter and body sections, ROADMAP.md phases

### What's Missing ❌

| Gap | Spec Reference | Severity |
|-----|---------------|----------|
| **No build/packaging** — no compiled output, no VSIX | Step 7b — `vsce package` + publish | MEDIUM (expected to be done at publish time) |
| **No `media/gsd-icon.svg`** — `package.json` references `$(rocket)` codicon instead | Supp E1 structure | LOW |
| **No `extension.test.ts`** | Supp E1 structure | LOW |

---

## Step 4: Instructions Files — 95%

### What's Implemented ✅

All 6 instruction files exist with correct `applyTo` patterns:

| File | `applyTo` | Status |
|------|-----------|--------|
| `gsd-plans.instructions.md` | `.planning/phases/**/*-PLAN.md` | ✅ |
| `gsd-quick.instructions.md` | `.planning/quick/**` | ✅ |
| `gsd-research.instructions.md` | `.planning/phases/**/*-RESEARCH.md` | ✅ |
| `gsd-state.instructions.md` | `.planning/STATE.md` | ✅ |
| `gsd-summaries.instructions.md` | `.planning/phases/**/*-SUMMARY.md` | ✅ |
| `planning-docs.instructions.md` | `.planning/**` | ✅ (thin content) |

### Minor Issues

| Gap | Severity |
|-----|----------|
| `planning-docs.instructions.md` is 3 lines of content — could be richer (no naming conventions, no STATE.md-first rule) | LOW |

---

## Step 5: Documentation — 85%

### What's Implemented ✅

| Document | Status | Quality |
|----------|--------|---------|
| `docs/QUICK-START.md` | ✅ | Good — 5-minute setup, full lifecycle walkthrough, command table |
| `docs/USER-GUIDE.md` | ✅ | Good — workflow diagrams, command reference, configuration, troubleshooting |
| `docs/CONFIGURATION.md` | ✅ | Good — full config schema, toggles, gates, git settings, model profile |
| `docs/MIGRATION.md` | ✅ | Good — command mapping table, architecture diffs, coexistence |
| `docs/TROUBLESHOOTING.md` | ✅ | Good — MCP, commands, agents, research, commits, state, plan verification |
| `README.md` | ✅ | Comprehensive — install, quick start, commands, architecture, config, security |
| `SECURITY.md` | ✅ | Adequate — reporting, timeline, scope |

### Minor Issues

| Gap | Severity |
|-----|----------|
| `docs/context-monitor.md` documents the Claude Code bridge-file context monitor, not the Copilot version | LOW (legacy doc) |
| README lacks explicit "Differences from Claude Code" section (info is spread across docs) | LOW |

---

## Step 6: Testing — 75%

### What's Implemented ✅

**Copilot MCP server tests: 137 tests, 137 passing**

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `copilot-core.test.cjs` | 30 | loadConfig, normalizePhaseName, comparePhaseNum, findPhaseInternal, generateSlugInternal, execGit, safeReadFile, resolveModelInternal, getRoadmapPhaseInternal |
| `copilot-state.test.cjs` | 24 | stateLoad, stateSnapshot, stateGet, stateUpdate, statePatch, stateAdvancePlan, stateUpdateProgress, stateAddDecision, stateAddBlocker/ResolveBlocker |
| `copilot-verify.test.cjs` | 20 | planStructure, phaseCompleteness, consistency, health, summary, references |
| `copilot-frontmatter.test.cjs` | 21 | extractFrontmatter, reconstructFrontmatter, spliceFrontmatter, frontmatterGet/Set/Validate/Merge |
| `copilot-config.test.cjs` | 12 | configEnsure, configSet, configGet |

**Full suite: 252 tests, 248 passing, 4 failing**

Failing tests (CLI-side, not Copilot MCP):
- `init plan-phase returns file paths`
- `init phase-op returns core and optional phase file paths`
- `add-decision preserves dollar amounts without corrupting Decisions section`
- `add-blocker preserves dollar strings without corrupting Blockers section`

### What's Missing ❌

| Gap | Spec Reference | Severity |
|-----|---------------|----------|
| **No integration test chains** | Supp C3 — quick task flow, phase lifecycle, decimal insert, config cycle, health repair, frontmatter cycle, verify chain | **HIGH** |
| **No `init.test.js`** for Copilot MCP | Supp C1 — init context assembly tests | MEDIUM |
| **No `roadmap.test.js`** for Copilot MCP | Supp C1 — roadmap analyze/get-phase tests | MEDIUM |
| **No `phase.test.js`** for Copilot MCP | Supp C1 — phase add/remove/insert tests | MEDIUM |
| **No `milestone.test.js`** for Copilot MCP | Supp C1 — milestone complete/requirements tests | MEDIUM |
| **No `commands.test.js`** for Copilot MCP | Supp C1 — commit, slug, timestamp, todos tests | MEDIUM |
| **No `template.test.js`** for Copilot MCP | Supp C1 — template select/fill tests | LOW |
| **4 CLI tests failing** | — dollar sign handling in state mutations, init path assembly | MEDIUM |
| **Test fixture directory not in spec structure** | Supp C1 — `.gsd/tools/__tests__/fixtures/` with minimal project | LOW (tests use inline fixtures) |

### Test Coverage Summary

| Module | Spec'd Tests | Actual Tests | Coverage |
|--------|-------------|-------------|----------|
| core.js | ✅ | 30 | Good |
| state.js | ✅ | 24 | Good |
| config.js | ✅ | 12 | Good |
| frontmatter.js | ✅ | 21 | Good |
| verify.js | ✅ | 20 | Good |
| init.js | ❌ | 0 | Missing |
| roadmap.js | ❌ | 0 | Missing |
| phase.js | ❌ | 0 | Missing |
| milestone.js | ❌ | 0 | Missing |
| commands.js | ❌ | 0 | Missing |
| template.js | ❌ | 0 | Missing |
| Integration chains | ❌ | 0 | Missing |

---

## Windows Compatibility (Supplement B) — 85%

### What's Implemented ✅

| Requirement | Status | Details |
|-------------|--------|---------|
| `execFileSync` with args array (B2) | ✅ | `core.js` uses `execFileSync('git', args, ...)` — no shell |
| Brownfield uses `fs.readdirSync` (B3) | ✅ | `init.js` recursive walker — no Unix `find` |
| No `/tmp/` paths | ✅ | No hardcoded temp paths |
| No `~/.claude/` paths | ✅ | Clean — uses workspace-relative `.gsd/` |
| `path.join()` throughout | ✅ | Consistent cross-platform path construction |
| No `chmod +x` | ✅ | Not present |

### What's Missing ❌

| Gap | Spec Reference | Severity |
|-----|---------------|----------|
| **No `windowsHide: true`** on `execFileSync` | Supp B2 — prevents console window flash | LOW |
| **No `normalizePath()` function** | Supp B4 — paths in frontmatter should use forward slashes | LOW |

---

## Hooks (Supplement A4) — 20%

### What's Implemented ✅
- `.gsd/hooks/check-update.js` — functional, checks npm for updates with 24h cache TTL

### What's Missing ❌

| Gap | Severity |
|-----|----------|
| **`.gsd/hooks/context-monitor.js` is a stub** — 6 lines, just `process.exit(0)` | **HIGH** |
| **No statusline hook** for Copilot | MEDIUM (may not be applicable to Copilot) |
| **Installer doesn't merge `.github/hooks/`** — no hook registration logic at all | **HIGH** |

---

## MCP Server — Exceeds Spec

The MCP server significantly exceeds Phase 3 specs with **64 registered tools** (spec estimated ~50). All core modules are ported and functional. The JSON-RPC 2.0 stdio protocol with Content-Length framing is correctly implemented.

---

## Prioritized Action Items

### P0 — Critical (should fix before release)

1. **Add hook merging to installer** — implement Supplement A4 strategy for `.github/hooks/` (detect GSD hooks by `.gsd/hooks/` in command path, merge on install, remove on uninstall)
2. **Fix 4 failing CLI tests** — dollar sign handling in state mutations, init path assembly
3. **Add `model:` frontmatter to 4 core agents** — gsd-executor, gsd-plan-checker, gsd-planner, gsd-verifier should all have `[claude-sonnet-4, gpt-4.1, gemini-2.5-pro]`

### P1 — Important (should fix soon)

4. **Implement or stub `gsd_switch_profile` MCP tool** — rewrite agent `model:` frontmatter based on profile map
5. **Implement `.gsd/hooks/context-monitor.js`** — currently a no-op stub; either implement for Copilot or document that it's N/A for Copilot
6. **Add "skip if exists" logic for instructions** — installer should not overwrite user-customized instruction files
7. **Add post-install verification** — check key files exist after install
8. **Write missing MCP test files** — init, roadmap, phase, milestone, commands, template

### P2 — Nice to Have

9. **Add `windowsHide: true`** to `execFileSync` calls in core.js
10. **Add `normalizePath()`** function and apply to frontmatter path writes
11. **Write integration test chains** per Supplement C3 spec
12. **Enrich `planning-docs.instructions.md`** with naming conventions and context fidelity rules
13. **Remove or update `docs/context-monitor.md`** — currently Claude Code-specific
14. **Build VSIX for extension** — add build script and packaging
15. **Add extension tests** — `extension.test.ts`

---

## Summary

Phase 3 is **substantially implemented** across all 8 steps. The installer, extension, documentation, instructions, and MCP server are all functional. The primary gaps are:

1. **Hook ecosystem** — installer doesn't merge hooks, context-monitor is a stub
2. **Model profile system** — incomplete agent frontmatter, missing switch tool
3. **Test coverage** — only 5 of 11 MCP modules have dedicated test files; no integration chains

The MCP server itself overdelivered (64 tools vs spec's ~50), and the VS Code extension is a clean implementation matching the spec closely. Windows compatibility is solid for the core execution path.
