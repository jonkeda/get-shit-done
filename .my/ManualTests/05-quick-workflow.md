# Manual Test: Skill Workflows (Quick)

**Tests the `/gsd-quick` skill end-to-end.**

Prerequisite: MCP server running. A project with `.planning/` and STATE.md.

---

## MT-27: Quick task — basic

1. Type: `/gsd-quick "Add a README badge for build status"`
2. **Expected flow:**
   - Copilot calls `gsd_init_quick`
   - Creates `.planning/quick/` task directory
   - Plans the task (planner delegation)
   - Executes the plan (executor delegation)
   - Updates STATE.md
   - Commits planning docs
3. **Expected output:** Task completed, badge added (or plan created for it)
4. Check `.planning/quick/` has new task files
5. **Pass/Fail:** ___

## MT-28: Quick task — full mode

1. Type: `/gsd-quick --full "Refactor the error handling in config.js"`
2. **Expected:** Same as MT-27 but additionally:
   - Plan-checker validates the plan (up to 2 revision iterations)
   - Verifier checks results after execution
3. **Pass/Fail:** ___
