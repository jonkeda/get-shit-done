# RCA: MCP Server "Allow" Buttons in Live Tests

## Problem

Every live test run shows "Allow" buttons that require manual intervention. This blocks fully automated test execution. Despite multiple fixes, the buttons persist.

## VS Code MCP Trust Architecture (source analysis of 1.109.5)

From reverse-engineering `workbench.desktop.main.js`:

- `trustBehavior: 0` → **Auto-trusted**, no prompt shown
- `trustBehavior: 1` → **Requires trust**, shows Allow prompt

| MCP Source | trustBehavior | Prompt? |
|------------|:------------:|---------|
| `.vscode/mcp.json` (config file) | 0 | **No** — auto-trusted |
| `settings.json` MCP entries | 0 | **No** — auto-trusted |
| Extension API (`registerMcpServerDefinitionProvider`) | 1 (default) | **Yes** |
| Discovery (claude-desktop, cursor, windsurf) | 1 | **Yes** |
| `.cursor/mcp.json` | 1 | **Yes** |

Trust decisions stored in `state.vscdb` (SQLite), keyed by hash of server config (command + args + env). Fresh user-data dir = no trust history = always prompted for `trustBehavior: 1` servers.

## Current Test Workspace State

Files in temp workspace after test run:

```
.vscode/mcp.json          — intact, correct gsd-tools definition
.vscode/settings.json     — VS Code rewrites our boolean false to per-provider object
.user-data/User/settings.json — discovery disabled, all suppression settings present
.user-data/state.vscdb    — empty (fresh each run, no stored trust)
```

Post-run `.vscode/settings.json` (VS Code modified our original):
```json
{
  "chat.mcp.discovery.enabled": {
    "claude-desktop": false, "windsurf": false,
    "cursor-global": false, "cursor-workspace": false
  },
  "security.workspace.trust.enabled": false,
  "chat.mcp.access": "all"   // VS Code added this
}
```

## Fixes Applied So Far

| # | Fix | Status | Result |
|---|-----|--------|--------|
| 1 | Remove `registerMcpServerDefinitionProvider` from extension.ts | ✅ Done | Eliminated extension-sourced trust prompt |
| 2 | Remove `mcpServerDefinitionProviders` from extension package.json | ✅ Done | No more extension MCP contribution |
| 3 | Extension rebuilt (`npm run compile`) | ✅ Done | Compiled clean |
| 4 | Set `chat.mcp.discovery.enabled: false` in workspace settings | ✅ Done | VS Code rewrites to per-provider object, all false |
| 5 | Set `chat.mcp.discovery.enabled: false` in user-data settings | ✅ Done | Same rewrite behavior |
| 6 | Fixed `gsd-set-profile.prompt.md` (removed tools restriction + validation) | ✅ Done | set-profile test now passes |

**Result: Allow buttons STILL appear.**

## Remaining Fix Candidates (work through in order)

### ▶ Fix A: Identify WHAT the Allow buttons are for
**Priority: FIRST — everything else depends on this**
**Hypothesis:** We don't actually know what the Allow buttons are for. They could be:
1. MCP server trust ("Do you trust GSD Tools?")
2. MCP server start notification ("MCP server found, Start?")
3. Per-tool-call approval ("Allow gsd_state_load?") — inline in chat
4. Workspace trust ("Do you trust this workspace?")
5. Copilot's own internal tool approval
**Action:** User needs to describe exactly what the buttons say, where they appear (popup? chat inline? notification?), and for what server/tool.
**Status:** ⏳ WAITING — need user input

### ▶ Fix B: Check if `chat.mcp.enabled` is being lost
**Hypothesis:** We originally wrote `chat.mcp.enabled: true` in settings, but post-run inspection shows it's GONE. VS Code may have removed it or it conflicts with the discovery object. Without this setting, MCP may not auto-start the mcp.json server.
**Action:** Verify `chat.mcp.enabled` is still being set and not dropped by VS Code.
**Status:** ⏳ NOT TESTED

### ▶ Fix C: Pre-set `chat.mcp.access: "all"` explicitly
**Hypothesis:** VS Code is adding `"chat.mcp.access": "all"` to settings. This setting controls whether MCP servers can be used. It might need to be pre-set to avoid a prompt asking "Allow MCP access?"
**Action:** Add `"chat.mcp.access": "all"` to both workspace and user settings explicitly.
**Status:** ⏳ NOT TESTED

### ▶ Fix D: Check `enabledApiProposals` in extension package.json
**Hypothesis:** The extension package.json might still declare MCP-related proposed APIs. Combined with `--enable-proposed-api gsd.gsd-copilot` launch arg, this could cause VS Code to register a ghost MCP provider.
**Action:** Check extension package.json for `enabledApiProposals` containing MCP-related entries.
**Status:** ⏳ NOT TESTED

### ▶ Fix E: Pre-seed `state.vscdb` with trust entry
**Hypothesis:** Even for `.vscode/mcp.json` servers (trustBehavior:0), VS Code might still check state.vscdb. Since we use a fresh user-data dir each run, there's no stored trust.
**Action:** Run test, click Allow, DON'T clean up, copy state.vscdb, inspect entries, replicate in future runs.
**Status:** ⏳ NOT TESTED — requires modifying cleanup() to preserve workspace

### ▶ Fix F: Remove `.github/` copy from test workspace
**Hypothesis:** `.github/` directory contains prompt files that reference MCP tools by name. VS Code might parse these and trigger MCP-related prompts.
**Action:** Stop copying `.github/` to test workspace, or check if it affects MCP behavior.
**Status:** ⏳ NOT TESTED

### ▶ Fix G: Check if the `gsd-tools` MCP server binary path resolves correctly
**Hypothesis:** The mcp.json uses `${workspaceFolder}/.gsd/tools/gsd-mcp-server.js`. If VS Code can't resolve this path (e.g., `${workspaceFolder}` not expanded for temp dir), it might prompt differently.
**Action:** Verify `.gsd/tools/gsd-mcp-server.js` exists in test workspace.
**Status:** ⏳ NOT TESTED

### ▶ Fix H: Accept the Allow button and optimize the warmup test
**Fallback if nothing else works.**
**Hypothesis:** The Allow button is unavoidable in VS Code test mode for some MCP interactions.
**Action:** Keep the 120s warmup test with manual click, add polling to detect when MCP is ready instead of fixed 30s sleep.
**Status:** Current workaround — works but blocks CI/CD.

## Next Step

**Fix A is blocking.** Need user to describe exactly what the Allow buttons say and where they appear. All other fixes are guesses until we know the actual source.
