# Phase 9: Extension Hardening & Live Test Infrastructure

**Date:** 2025-02-25  
**Focus:** Fix extension MCP server registration, build live test framework, investigate MCP trust issues  
**Status:** COMPLETE (MCP trust prompt issue outstanding)

---

## Goals

1. Fix extension MCP server registration to use workspace `.gsd/` path instead of bundled copy
2. Build comprehensive live test framework for real VS Code instance testing
3. Investigate and resolve MCP trust prompt blocking automated tests
4. Reorganize `.my/` directory structure

---

## Part 1: Extension MCP Registration Fix

### Problem
The extension registered its bundled `extension/mcp-server/gsd-mcp-server.js` via the extension URI. This created confusion with the workspace's own `.gsd/tools/gsd-mcp-server.js` copy — two MCP servers from different paths.

### Changes

**`extension/src/extension.ts`:**
- Changed MCP server path from `extensionUri/mcp-server/` → `workspaceFolder/.gsd/tools/`
- Changed provider ID from `gsd-tools` → `gsd.mcp-servers`
- Changed executable from hardcoded `node` → `process.execPath`
- Added existence check: only registers if `.gsd/tools/gsd-mcp-server.js` exists
- Removed `typeof vscode.lm?.registerMcpServerDefinitionProvider` guard (now checks folder existence)

**`extension/package.json`:**
- Updated `mcpServerDefinitionProviders[].id` from `gsd-tools` → `gsd.mcp-servers`
- Moved `mcpServerDefinitionProviders` section after `commands` (cosmetic reorder)

### Rationale
Using the workspace's `.gsd/` copy means:
- Single source of truth for MCP server code at runtime
- Server version always matches what `bin/copilot-install.js` installed
- Extension doesn't need its own copy to be updated separately
- `GSD_WORKSPACE` env var correctly set to workspace folder

---

## Part 2: Live Test Framework

### Architecture
Built in `.my/LiveTests/`:

```
run-live-tests.cjs      — Orchestrator: creates temp workspace, launches VS Code, runs suite
suite/
  helpers.cjs            — Shared utilities (sendChatCommand, waitForFile, sleep)
  index.cjs              — Suite registry
  01-activation.test.cjs — Extension activation + MCP server start
  02-readonly-commands.test.cjs  — /gsd-help, /gsd-health, read-only commands
  03-stateful-commands.test.cjs  — /gsd-add-todo, state-modifying commands
  04-mcp-chain.test.cjs  — Multi-tool MCP orchestration chains
  05-edge-cases.test.cjs — Error handling, missing files
  06-document-creation.test.cjs  — /gsd-new-project file creation
fixtures/                — Test fixture files
```

### How It Works
1. Creates temporary workspace with full GSD install (`.gsd/`, `.github/`, `.vscode/`, `.planning/`)
2. Writes `.vscode/settings.json` with MCP trust suppression settings
3. Launches VS Code Insiders with `--extensionDevelopmentPath` pointing to GSD extension
4. Sends `/gsd-*` commands via Copilot Chat API
5. Monitors file system for expected side effects (file creation, state changes)
6. Reports pass/fail per test, cleans up temp workspace

### Requirements
- VS Code Insiders installed
- GitHub Copilot Chat extension
- No other VS Code instance using same user-data directory
- `GSD_TEST_MODEL` env var (e.g., `gpt-5.2`) for model selection

---

## Part 3: MCP Trust Prompt Investigation (RCA)

### Problem
Every live test run shows "Allow" buttons requiring manual intervention, blocking fully automated testing.

### Root Cause
Reverse-engineered from `workbench.desktop.main.js` (VS Code 1.109.5):

| MCP Source | trustBehavior | Auto-trusted? |
|---|:---:|---|
| `.vscode/mcp.json` | 0 | Yes |
| `settings.json` entries | 0 | Yes |
| Extension API (`registerMcpServerDefinitionProvider`) | 1 | **No — prompts** |

Trust decisions stored in `state.vscdb` (SQLite), keyed by hash of server config (command + args + env). Fresh user-data dir = no stored trust = always prompted for `trustBehavior:1` servers.

### Fixes Applied
1. Changed extension to register from workspace `.gsd/` instead of bundled path
2. Set `chat.mcp.discovery.enabled: false` in workspace settings
3. Disabled workspace trust in test settings
4. Fixed `gsd-set-profile.prompt.md` (removed invalid tools restriction)

### Status: OUTSTANDING
Allow buttons still appear. Full RCA and remaining fix candidates documented in `.my/RCA-mcp-trust-prompt.md`. Most promising path: use `.vscode/mcp.json` as sole MCP source (trustBehavior:0), potentially removing the extension's programmatic registration.

---

## Part 4: File Reorganization

- Moved old phase docs from `.my/` root → `.my/PortPhases/`:
  - `copilot-porting-analysis.md`
  - `phase-1-core-foundation.md`, `phase-1-review.md`, `phase-1-supplementary-specs.md`
  - `phase-2-full-orchestration.md`, `phase-2-review.md`, `phase-2-supplementary-specs.md`, `phase-2-supplementary-specs-part2.md`
  - `phase-3-polish-and-distribution.md`, `phase-3-review.md`, `phase-3-supplementary-specs.md`
  - `phase-4-fixes-and-completeness.md`, `phase-4-review.md`
  - `phase-5-fix-plan.md`, `phase-5-review.md`
  - `phase-6-review.md`
- Removed `.vscode/mcp.json` — MCP server registered programmatically by extension
- Created `.my/Maintenance/README.md` — comprehensive maintenance guide with file mappings and review results

---

## Uncommitted Changes Summary

59 files changed (as of session end):

| Category | Files | Type |
|---|---|---|
| Extension | `extension.ts`, `package.json`, compiled output | Modified |
| Prompts (Phase 7) | 11 new `.prompt.md` files | New |
| Prompts (existing) | 8 `.prompt.md` files updated | Modified |
| Agents | 3 `.agent.md` files (frontmatter cleanup) | Modified |
| Skill references (Phase 8) | `planning-workflow.md`, `uat-workflow.md` | Modified |
| copilot-instructions.md | Updated command list (13→28) | Modified |
| Structural tests | `tests/copilot-structure.test.cjs` | New |
| Live tests | `run-live-tests.cjs` + 6 suite files + fixtures | New/Modified |
| Port phases | Moved from `.my/` root to `.my/PortPhases/` | Moved |
| `.vscode/mcp.json` | Deleted (replaced by extension registration) | Deleted |
| Maintenance | `.my/Maintenance/README.md` | New |
| RCA | `.my/RCA-mcp-trust-prompt.md` | New |

---

## Test Results
- Core: **411 passed** (19 test files)
- Port-validation: **180 passed** (6 files)
- Total: **591 tests, 0 failures**
