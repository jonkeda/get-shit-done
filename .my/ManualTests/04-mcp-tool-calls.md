# Manual Test: MCP Tool Calls

**Tests that key MCP tools work correctly when invoked through Copilot.**

Prerequisite: MCP server running, project has `.planning/` directory with STATE.md.

---

## MT-19: State tools

1. Ask Copilot: "Load the current GSD state"
2. **Expected:** Copilot calls `gsd_state_load` and shows parsed STATE.md content
3. **Pass/Fail:** ___

## MT-20: Config tools

1. Ask Copilot: "Show the GSD configuration"
2. **Expected:** Copilot calls `gsd_config_load` and shows config.json content
3. **Pass/Fail:** ___

## MT-21: Roadmap tools

1. Ask Copilot: "Analyze the project roadmap"
2. **Expected:** Copilot calls `gsd_roadmap_analyze` and shows phase listing
3. **Pass/Fail:** ___

## MT-22: Find phase tool

1. Ask Copilot: "Find phase 1 directory"
2. **Expected:** Copilot calls `gsd_find_phase` with phase number 1, returns phase directory path
3. **Pass/Fail:** ___

## MT-23: Frontmatter tools

1. Ask Copilot: "Read the frontmatter of STATE.md"
2. **Expected:** Copilot calls `gsd_frontmatter_get` on `.planning/STATE.md`, returns parsed YAML
3. **Pass/Fail:** ___

## MT-24: Validate health tool

1. Ask Copilot: "Run a health check on this project"
2. **Expected:** Copilot calls `gsd_validate_health`, returns structured report of issues/passes
3. **Pass/Fail:** ___

## MT-25: History digest tool (Phase 4 addition)

1. Ask Copilot: "Give me a history digest of past phases"
2. **Expected:** Copilot calls `gsd_history_digest`, returns summary of completed phase decisions and outcomes
3. **Pass/Fail:** ___

## MT-26: Milestone stats tool (Phase 4 addition)

1. Ask Copilot: "Show milestone statistics"
2. **Expected:** Copilot calls `gsd_milestone_stats`, returns phase/plan/requirement counts
3. **Pass/Fail:** ___
