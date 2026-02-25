# Manual Test: Copilot Commands & Prompts

**Tests that GSD slash commands work in VS Code Copilot chat.**

Prerequisite: Open `e:\repos\Private\get-shit-done2` in VS Code with Copilot active and MCP server running.

---

## MT-12: `/gsd-help` command

1. Open Copilot chat
2. Type: `/gsd-help`
3. **Expected:** Lists all available `/gsd-` commands with descriptions
4. **Pass/Fail:** ___

## MT-13: `/gsd-progress` command

1. Type: `/gsd-progress`
2. **Expected:** Shows current project state from STATE.md (or reports no `.planning/` directory)
3. Should call `gsd_state_load` or `gsd_init_progress` MCP tool
4. **Pass/Fail:** ___

## MT-14: `/gsd-settings` command

1. Type: `/gsd-settings`
2. **Expected:** Shows current GSD configuration. Reads from `.planning/config.json` if present.
3. **Pass/Fail:** ___

## MT-15: `/gsd-check-todos` command

1. Type: `/gsd-check-todos`
2. **Expected:** Lists pending todos from STATE.md (or reports none)
3. **Pass/Fail:** ___

## MT-16: `/gsd-health` command

1. Type: `/gsd-health`
2. **Expected:** Runs health check on `.planning/` directory. Reports any issues found.
3. Should call `gsd_validate_health` MCP tool.
4. **Pass/Fail:** ___

## MT-17: Agent invocation — `@gsd-debugger`

1. Type: `@gsd-debugger I'm getting a TypeError in my code`
2. **Expected:** The debugger agent activates, asks for more details, follows systematic debug protocol
3. Check that it has `user-invocable: true` frontmatter (should be directly invocable)
4. **Pass/Fail:** ___

## MT-18: `/gsd-set-profile balanced`

1. Type: `/gsd-set-profile balanced`
2. **Expected:** Calls `gsd_switch_profile` MCP tool, reports model configuration for all agents
3. **Pass/Fail:** ___
