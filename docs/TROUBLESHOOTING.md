# Troubleshooting Guide

Common issues and solutions for GSD-for-Copilot.

## MCP Server Won't Start

**Symptom:** "GSD-tools MCP server was unable to start" in VS Code

**Common causes:**
1. **Node.js not installed** — run `node -v` in terminal. Install Node 18+ if missing.
2. **`.gsd/` directory missing** — the GSD runtime files aren't installed. Run `npx gsd-copilot@latest` to install.
3. **Wrong workspace** — open the project folder directly in VS Code (not a parent folder).
4. **mcp.json misconfigured** — check `.vscode/mcp.json` has the gsd-tools entry.

**Diagnostic:** Open a terminal in VS Code and run:
```bash
node .gsd/tools/gsd-mcp-server.js
```
The server should print its version and workspace path. If it shows "(fallback: cwd)", the `GSD_WORKSPACE` env var isn't being set — check your `.vscode/mcp.json`.

---

## MCP Server Not Connecting

**Symptoms:** MCP tools (`gsd_state_load`, etc.) fail or are not available in Copilot chat.

**Solutions:**
1. Check `.vscode/mcp.json` exists and contains the `gsd-tools` server entry:
   ```json
   {
     "servers": {
       "gsd-tools": {
         "type": "stdio",
         "command": "node",
         "args": ["${workspaceFolder}/.gsd/tools/gsd-mcp-server.js"],
         "env": { "GSD_WORKSPACE": "${workspaceFolder}" }
       }
     }
   }
   ```
2. Verify Node.js is installed: `node --version` (requires 16.7+)
3. Check the MCP server file exists: `.gsd/tools/gsd-mcp-server.js`
4. Restart VS Code to reload MCP servers
5. Check the Output panel (View → Output → select "MCP") for error messages

## Commands Not Showing

**Symptoms:** Typing `/gsd-` in Copilot chat doesn't show GSD commands.

**Solutions:**
1. Verify `.github/prompts/` contains `gsd-*.prompt.md` files
2. Verify `.github/skills/` contains `gsd-*/` directories with `SKILL.md` files
3. Reload VS Code window: `Ctrl+Shift+P` → "Developer: Reload Window"
4. Check that GitHub Copilot extension is active and signed in

## Agents Not Found

**Symptoms:** Skills reference agents (e.g., `@gsd-planner`) but they aren't invoked.

**Solutions:**
1. Verify `.github/agents/` contains `gsd-*.agent.md` files
2. Check agent frontmatter has valid `model:` field with available models
3. Ensure agent files have proper YAML frontmatter with `---` delimiters
4. Reload VS Code window

## Research Not Working

**Symptoms:** `/gsd-plan-phase` or `/gsd-research-phase` skips research or produces empty results.

**Solutions:**
1. Check `workflow.research` is `true` in `.planning/config.json`
2. Verify the research agent has web access (check model capabilities)
3. If using Context7 MCP, verify it's configured in `.vscode/mcp.json`
4. Check the Output panel for MCP errors during research

## Commits Failing

**Symptoms:** The executor reports git commit errors.

**Solutions:**
1. Verify git is configured: `git config user.name` and `git config user.email`
2. Check you're in a git repository: `git status`
3. Verify `.planning/config.json` has `git.auto_commit: true`
4. Check for git hooks that might reject commits
5. Ensure the working directory is clean before starting execution

## State File Corruption

**Symptoms:** GSD commands fail with state parsing errors.

**Solutions:**
1. Run `/gsd-health` to diagnose and repair
2. If STATE.md is corrupted, the health command will create a backup and regenerate
3. Manual recovery: check `.planning/STATE.md` has valid YAML frontmatter
4. Last resort: delete STATE.md and run `/gsd-progress` to regenerate from ROADMAP.md

## Plan Verification Failures

**Symptoms:** `/gsd-verify-work` reports failures after execution.

**Solutions:**
1. Review the verification report for specific failures
2. Run `/gsd-plan-milestone-gaps` to create remediation plans
3. Re-execute failed plans: `/gsd-execute-phase N` (it will pick up from where it left off)
4. If verification criteria are wrong (not the code), update the plan's `must_haves` frontmatter

## Performance Issues

**Symptoms:** GSD commands are slow or time out.

**Solutions:**
1. Check MCP server startup: should be <200ms (check Output panel timing)
2. Large `.planning/` directories can slow file operations — archive completed milestones with `/gsd-complete-milestone`
3. Reduce agent model tier: `/gsd-set-profile budget` for faster responses
4. Disable optional workflow steps: set `workflow.research: false` or `workflow.plan_check: false`
