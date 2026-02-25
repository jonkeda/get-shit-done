# Migration Guide: Claude Code → VS Code Copilot

This guide helps existing GSD users transition from the Claude Code version to the VS Code Copilot version.

## Command Mapping

| Claude Code | VS Code Copilot | Notes |
|------------|----------------|-------|
| `/gsd:new-project` | `/gsd-new-project` | Same workflow, different prefix |
| `/gsd:map-codebase` | `/gsd-map-codebase` | Same workflow |
| `/gsd:discuss-phase N` | `/gsd-discuss-phase N` | Same workflow |
| `/gsd:plan-phase N` | `/gsd-plan-phase N` | Same workflow |
| `/gsd:execute-phase N` | `/gsd-execute-phase N` | Sequential (not parallel) |
| `/gsd:verify-work N` | `/gsd-verify-work N` | Same workflow |
| `/gsd:quick "desc"` | `/gsd-quick "desc"` | Same workflow |
| `/gsd:debug "symptom"` | `/gsd-debug "symptom"` | Same workflow |
| `/gsd:progress` | `/gsd-progress` | Same output |
| `/gsd:help` | `/gsd-help` | Same output |
| `/gsd:pause` | `/gsd-pause-work` | Same workflow |
| `/gsd:resume` | `/gsd-resume-work` | Same workflow |
| `/gsd:settings` | `/gsd-settings` | Same workflow |
| `/gsd:add-todo` | `/gsd-add-todo` | Same workflow |
| `/gsd:check-todos` | `/gsd-check-todos` | Same workflow |
| `/gsd:add-phase` | `/gsd-add-phase` | Same workflow |
| `/gsd:remove-phase` | `/gsd-remove-phase` | Same workflow |
| `/gsd:insert-phase` | `/gsd-insert-phase` | Same workflow |
| `/gsd:health` | `/gsd-health` | Same workflow |
| `/gsd:cleanup` | `/gsd-cleanup` | Same workflow |

## What's Different

### Execution Model
- **Claude Code:** Parallel plan execution using `Task()` subagents
- **VS Code Copilot:** Sequential plan execution using agent mode delegation
- Plans execute one at a time within a phase, but the workflow and artifacts are identical

### Agent System
- **Claude Code:** Agents defined in `.agents/` directory with Claude-specific frontmatter
- **VS Code Copilot:** Agents defined in `.github/agents/` with Copilot-compatible frontmatter (`model:` array for fallback chains)

### MCP Server
- **Claude Code:** Configured in `.mcp.json` or `~/.claude/settings.json`
- **VS Code Copilot:** Configured in `.vscode/mcp.json`

### Hooks
- **Claude Code:** Hook scripts in `.claude/hooks/` with `settings.json` configuration
- **VS Code Copilot:** Hook configs in `.github/hooks/` (VS Code Copilot hook format)

### Skills vs Commands
- **Claude Code:** Slash commands defined in `commands/gsd/` directory
- **VS Code Copilot:** Skills in `.github/skills/` + prompts in `.github/prompts/`

## What's the Same

- **`.planning/` directory** — identical structure, artifacts, and format
- **Workflow sequence** — research → plan → execute → verify
- **MCP tools** — same `gsd_*` tool names and parameters
- **Config system** — same `.planning/config.json` schema
- **Git integration** — same commit conventions and branch strategies
- **All planning artifacts** — STATE.md, ROADMAP.md, PLAN.md, SUMMARY.md formats unchanged

## Coexistence

You can have both Claude Code GSD and VS Code Copilot GSD installed simultaneously:
- Claude Code uses `.claude/` and `.agents/`
- VS Code Copilot uses `.gsd/` and `.github/`
- Both share `.planning/` — they read/write the same project state

This means you can use Claude Code for some tasks and VS Code Copilot for others within the same project.

## Migration Steps

1. Install the Copilot version: `npx gsd-copilot@latest`
2. Your `.planning/` directory is preserved — no project data migration needed
3. Open VS Code with Copilot and use `/gsd-help` to verify
4. Optionally keep the Claude Code version for parallel use
