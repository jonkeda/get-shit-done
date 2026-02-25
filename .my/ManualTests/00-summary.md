# Manual Test Summary

**Total: 40 manual tests across 7 test plans**

| # | Plan | Tests | Area |
|---|------|:---:|------|
| 1 | [01-mcp-server-startup](01-mcp-server-startup.md) | MT-1 to MT-5 | MCP server startup, handshake, VS Code integration |
| 2 | [02-installer](02-installer.md) | MT-6 to MT-11 | Fresh install, update, uninstall, skip-if-exists |
| 3 | [03-copilot-commands](03-copilot-commands.md) | MT-12 to MT-18 | Slash commands, agent invocation, profile switching |
| 4 | [04-mcp-tool-calls](04-mcp-tool-calls.md) | MT-19 to MT-26 | Direct MCP tool verification via Copilot |
| 5 | [05-quick-workflow](05-quick-workflow.md) | MT-27 to MT-28 | End-to-end quick task skill |
| 6 | [06-templates-and-structure](06-templates-and-structure.md) | MT-29 to MT-35 | File structure, templates, tests, stale refs |
| 7 | [07-vscode-extension](07-vscode-extension.md) | MT-36 to MT-40 | Extension activation, tree view, commands |

## Execution Order

**Run first (no Copilot needed — scriptable):**
- MT-29 to MT-35 (templates and structure checks)
- MT-1 to MT-3, MT-5 (MCP server terminal tests)

**Run second (needs VS Code + Copilot):**
- MT-4 (MCP in VS Code)
- MT-12 to MT-18 (slash commands)
- MT-19 to MT-26 (MCP tool calls)

**Run third (needs installer test):**
- MT-6 to MT-11 (clean temp dir)

**Run last (needs built extension):**
- MT-36 to MT-40 (extension)

**Run when ready for e2e:**
- MT-27 to MT-28 (quick workflow — modifies project files)

## Scoring

| Result | Meaning |
|--------|---------|
| Pass | Test behavior matches expected |
| Fail | Test behavior differs from expected — file bug |
| Skip | Prerequisite not met (e.g., extension not built) |
| N/A | Feature not yet implemented (expected per fix plan) |
