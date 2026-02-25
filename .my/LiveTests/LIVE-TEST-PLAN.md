# Live Copilot Integration Tests

Manual test plan for validating GSD commands work correctly through VS Code Copilot.

## Prerequisites

- [ ] Fresh test workspace (empty folder or small project)
- [ ] GSD installed: `npx gsd-copilot init` in the test workspace
- [ ] MCP server running (green indicator in Copilot chat)
- [ ] VS Code reloaded after install

---

## Test 1: MCP Server Connectivity

**Goal:** Confirm the MCP server starts and tools are discoverable.

**Steps:**
1. Open Command Palette → "MCP: List Servers"
2. Verify `gsd-tools` shows as "Running"
3. Select `gsd-tools` → "Show Output"
4. Confirm startup log: `GSD MCP Server v2.0.0 - workspace: ...`

**Pass criteria:**
- [ ] Server status is "Running"
- [ ] No errors in output log
- [ ] Tools are listed when you click "Configure Tools" in chat

---

## Test 2: Project Initialization (`/gsd-new-project`)

**Goal:** Create a new GSD project from scratch.

**Steps:**
1. In the test workspace, run `/gsd-new-project`
2. When prompted, describe a small test project (e.g., "A CLI tool that converts CSV to JSON")
3. Answer any follow-up questions about tech stack, scope, etc.

**Pass criteria:**
- [ ] Agent creates `.planning/` directory structure
- [ ] `STATE.md` exists with correct frontmatter (milestone, phase, plan fields)
- [ ] `PROJECT.md` exists with project description
- [ ] `REQUIREMENTS.md` exists with REQ-IDs
- [ ] `ROADMAP.md` exists with numbered phases
- [ ] `config.json` exists with valid settings
- [ ] MCP tools were used (check chat for tool invocations: `gsd_init_new_project`, `gsd_scaffold`, `gsd_commit`)

---

## Test 3: Progress Check (`/gsd-progress`)

**Goal:** Verify progress routing works after project init.

**Steps:**
1. Run `/gsd-progress`

**Pass criteria:**
- [ ] Shows current milestone, phase, and plan position
- [ ] Shows progress bar or percentage
- [ ] Suggests next action (e.g., "research phase 1" or "plan phase 1")
- [ ] Uses `gsd_state_load` or `gsd_init_progress` MCP tool

---

## Test 4: Phase Research (`/gsd-research-phase 1`)

**Goal:** Verify research agent activates and produces research docs.

**Steps:**
1. Run `/gsd-research-phase 1`
2. Answer any clarifying questions

**Pass criteria:**
- [ ] Routes to `@gsd-phase-researcher` or `@gsd-project-researcher` agent
- [ ] Creates `.planning/phases/01-*/01-RESEARCH.md`
- [ ] Research doc has YAML frontmatter
- [ ] Uses MCP tools: `gsd_find_phase`, `gsd_roadmap_get_phase`
- [ ] Commits research with `gsd_commit`

---

## Test 5: Phase Discussion (`/gsd-discuss-phase 1`)

**Goal:** Verify interactive Q&A captures decisions.

**Steps:**
1. Run `/gsd-discuss-phase 1`
2. Answer the questions posed by the agent
3. Confirm when done

**Pass criteria:**
- [ ] Agent asks relevant technical questions about the phase
- [ ] Creates `.planning/phases/01-*/01-CONTEXT.md` with decisions
- [ ] CONTEXT.md has YAML frontmatter
- [ ] Decisions are structured (numbered or bulleted)

---

## Test 6: Phase Planning (`/gsd-plan-phase 1`)

**Goal:** Verify planner creates executable plans.

**Steps:**
1. Run `/gsd-plan-phase 1`

**Pass criteria:**
- [ ] Routes to `@gsd-planner` agent
- [ ] Creates `.planning/phases/01-*/01-01-PLAN.md`
- [ ] Plan has numbered tasks with clear deliverables
- [ ] Plan has YAML frontmatter with status field
- [ ] `STATE.md` updated with current phase/plan position
- [ ] Uses MCP tools: `gsd_init_plan_phase`, `gsd_state_update`

---

## Test 7: Phase Execution (`/gsd-execute-phase 1`)

**Goal:** Verify executor implements the plan.

**Steps:**
1. Run `/gsd-execute-phase 1`
2. Approve any file creation/edit confirmations

**Pass criteria:**
- [ ] Routes to `@gsd-executor` agent
- [ ] Actually creates/modifies code files per the plan
- [ ] Creates `.planning/phases/01-*/01-01-SUMMARY.md` after completion
- [ ] Summary references actual files changed
- [ ] `STATE.md` progress updated
- [ ] Uses MCP tools: `gsd_init_execute_phase`, `gsd_state_advance_plan`, `gsd_commit`

---

## Test 8: Work Verification (`/gsd-verify-work 1`)

**Goal:** Verify the verifier checks completed work.

**Steps:**
1. Run `/gsd-verify-work 1`

**Pass criteria:**
- [ ] Routes to `@gsd-verifier` agent
- [ ] Creates `.planning/phases/01-*/01-VERIFICATION.md`
- [ ] Checks actual code against plan claims
- [ ] Reports pass/fail for each verification item
- [ ] Uses MCP tools: `gsd_init_verify_work`, `gsd_verify_*`

---

## Test 9: Quick Task (`/gsd-quick "add a README"`)

**Goal:** Verify quick mode plans and executes in one shot.

**Steps:**
1. Run `/gsd-quick "add a README with usage instructions"`

**Pass criteria:**
- [ ] Creates `.planning/quick/` task directory
- [ ] Plans and executes without separate plan/execute steps
- [ ] Actually creates the README file
- [ ] Summary doc created
- [ ] Uses `gsd_init_quick` MCP tool

---

## Test 10: Pause and Resume

**Goal:** Verify context saves and restores across sessions.

**Steps:**
1. Run `/gsd-pause-work`
2. Note what it saves
3. Close and reopen the chat (or start a new session)
4. Run `/gsd-resume-work`

**Pass criteria:**
- [ ] Pause creates a continuation/session record in STATE.md
- [ ] Uses `gsd_state_record_session` MCP tool
- [ ] Resume restores context: milestone, phase, plan, blockers
- [ ] Uses `gsd_init_resume` MCP tool
- [ ] Agent knows where you left off without re-explaining

---

## Test 11: Roadmap Management

**Goal:** Verify phase add/remove/insert commands.

**Steps:**
1. Run `/gsd-add-phase "Add unit tests"`
2. Verify phase appears in ROADMAP.md
3. Run `/gsd-insert-phase 2 "Emergency security fix"`
4. Verify decimal phase (e.g., 1.1) inserted
5. Run `/gsd-remove-phase N` (pick a future phase)
6. Verify phase removed and numbering adjusted

**Pass criteria:**
- [ ] `/gsd-add-phase` appends to ROADMAP.md using `gsd_phase_add`
- [ ] `/gsd-insert-phase` creates decimal phase using `gsd_phase_insert`
- [ ] `/gsd-remove-phase` removes and renumbers using `gsd_phase_remove`
- [ ] ROADMAP.md is valid after each operation

---

## Test 12: Configuration (`/gsd-settings`)

**Goal:** Verify settings display and modification.

**Steps:**
1. Run `/gsd-settings`
2. Try toggling a setting (e.g., disable research)

**Pass criteria:**
- [ ] Shows current config values
- [ ] Uses `gsd_config_load` MCP tool
- [ ] Config changes saved via `gsd_config_set`
- [ ] Changes reflected in `config.json`

---

## Test 13: Health Check (`/gsd-health`)

**Goal:** Verify project health validation.

**Steps:**
1. Run `/gsd-health`

**Pass criteria:**
- [ ] Reports health status of project structure
- [ ] Uses `gsd_validate_health` MCP tool
- [ ] Identifies any missing files or inconsistencies
- [ ] Shows actionable recommendations if issues found

---

## Test 14: Todos (`/gsd-add-todo` + `/gsd-check-todos`)

**Goal:** Verify todo capture and listing.

**Steps:**
1. Run `/gsd-add-todo "Investigate caching strategy"`
2. Run `/gsd-add-todo "Write API docs"`
3. Run `/gsd-check-todos`

**Pass criteria:**
- [ ] Todos stored via `gsd_list_todos` / STATE.md
- [ ] `/gsd-check-todos` lists all pending todos
- [ ] Todos have timestamps

---

## Test 15: Profile Switching (`/gsd-set-profile balanced`)

**Goal:** Verify model profile changes.

**Steps:**
1. Run `/gsd-set-profile budget`
2. Verify config updated
3. Run `/gsd-set-profile quality`

**Pass criteria:**
- [ ] Uses `gsd_switch_profile` MCP tool
- [ ] Config.json updated with new profile
- [ ] Confirmation message shown

---

## Test 16: Help (`/gsd-help`)

**Goal:** Verify help output (already confirmed working).

**Steps:**
1. Run `/gsd-help`

**Pass criteria:**
- [x] Displays full command reference table
- [x] No MCP tools needed (static prompt output)

---

## Execution Order

Recommended sequence for a full validation run:

1. **Test 1** — MCP connectivity (gate: must pass before anything else)
2. **Test 16** — Help (sanity check, already confirmed)
3. **Test 2** — New project (creates the project structure everything else needs)
4. **Test 3** — Progress (reads state)
5. **Test 12** — Settings (config read/write)
6. **Test 15** — Profile switch (config mutation)
7. **Test 14** — Todos (simple CRUD)
8. **Test 13** — Health check (validation)
9. **Test 11** — Roadmap management (structural changes)
10. **Test 4** — Research phase (first planning step)
11. **Test 5** — Discuss phase (decisions)
12. **Test 6** — Plan phase (plan creation)
13. **Test 7** — Execute phase (code generation)
14. **Test 8** — Verify work (validation)
15. **Test 9** — Quick task (independent workflow)
16. **Test 10** — Pause/resume (session management)

## Results Tracking

| Test | Status | Date | Notes |
|------|--------|------|-------|
| 1. MCP Connectivity | | | |
| 2. New Project | | | |
| 3. Progress | | | |
| 4. Research Phase | | | |
| 5. Discuss Phase | | | |
| 6. Plan Phase | | | |
| 7. Execute Phase | | | |
| 8. Verify Work | | | |
| 9. Quick Task | | | |
| 10. Pause/Resume | | | |
| 11. Roadmap Mgmt | | | |
| 12. Settings | | | |
| 13. Health Check | | | |
| 14. Todos | | | |
| 15. Profile Switch | | | |
| 16. Help | PASS | 2026-02-25 | Confirmed working |
