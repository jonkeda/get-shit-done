# Phase 5: Fix Plan

**Goal:** Resolve all remaining issues from Phase 5 review, fix MCP server startup, and validate everything works end-to-end.

**Depends on:** Phase 4 (all items except Step 9).  
**Validates:** Zero open issues, MCP server starts reliably, manual test plans pass.

**Audit source:** `.my/phase-5-review.md`

---

## Step 1: Fix MCP Server Startup (P0)

**Problem:** Users report "GSD-tools MCP server was unable to start." The server hard-exits with code 1 when `GSD_WORKSPACE` env var is not set — no fallback, no helpful guidance.

**Root cause:** The `${workspaceFolder}` variable in `.vscode/mcp.json` must be resolved by VS Code. If resolution fails (workspace not open, multi-root workspace ambiguity, or VS Code restart race), the env var arrives empty and the server immediately exits.

**File:** `.gsd/tools/gsd-mcp-server.js` (lines 28–35)

### Step 1a: Add `cwd` fallback

Replace the hard exit with a fallback to `process.cwd()`:

```js
// --- Workspace Resolution ---
const GSD_WORKSPACE = process.env.GSD_WORKSPACE || process.cwd();
const cwd = path.resolve(GSD_WORKSPACE);
```

Remove the `process.exit(1)` block entirely. The server should always start — `process.cwd()` is a safe fallback since VS Code spawns MCP servers with the workspace as cwd.

### Step 1b: Add startup diagnostic logging

After workspace resolution, write a diagnostic line to stderr (MCP servers use stderr for logging — stdout is reserved for JSON-RPC):

```js
process.stderr.write('GSD MCP Server v' + SERVER_INFO.version + 
  ' - workspace: ' + cwd + 
  (process.env.GSD_WORKSPACE ? '' : ' (fallback: cwd)') + '\n');
```

This replaces the existing startup log at the bottom of the file and adds a fallback indicator.

### Step 1c: Validate `.planning/` existence on startup

After resolving `cwd`, check if `.planning/` exists and log a warning if not:

```js
if (!fs.existsSync(path.join(cwd, '.planning'))) {
  process.stderr.write('GSD MCP Server: WARNING - no .planning/ directory found in ' + cwd + '\n');
}
```

This helps diagnose "tools return empty results" issues when the server starts in the wrong directory.

**Validation:** 
- `node .gsd/tools/gsd-mcp-server.js` (no env var) → starts with fallback, logs "(fallback: cwd)"
- `GSD_WORKSPACE=. node .gsd/tools/gsd-mcp-server.js` → starts normally
- MCP handshake returns valid initialize response in both cases

---

## Step 2: Add Missing Templates (P1)

### Step 2a: Add missing codebase mapping templates to skill bundle

**Problem:** `gsd-map-codebase` skill expects 7 output files but only has 4 templates. 3 templates exist in `.gsd/templates/codebase/` (lowercase) but not in `.github/skills/gsd-map-codebase/templates/codebase/`.

**Action:** Copy the 3 missing templates from `.gsd/templates/codebase/` to `.github/skills/gsd-map-codebase/templates/codebase/`, adjusting filename casing to match the skill's convention (UPPERCASE — matching the existing STACK.md, ARCHITECTURE.md, CONVENTIONS.md, CONCERNS.md):

| Source | Destination |
|--------|-------------|
| `.gsd/templates/codebase/integrations.md` | `.github/skills/gsd-map-codebase/templates/codebase/INTEGRATIONS.md` |
| `.gsd/templates/codebase/structure.md` | `.github/skills/gsd-map-codebase/templates/codebase/STRUCTURE.md` |
| `.gsd/templates/codebase/testing.md` | `.github/skills/gsd-map-codebase/templates/codebase/TESTING.md` |

### Step 2b: Add missing research-project templates

**Problem:** `gsd-project-researcher` agent references COMPARISON.md and FEASIBILITY.md output formats but no templates exist for these in `.gsd/templates/research-project/`.

**Action:** Create 2 template files from the collapsed content in the Claude Code source agent (`agents/gsd-project-researcher.md` lines 422–493):

| File | Source Lines | Content |
|------|-------------|---------|
| `.gsd/templates/research-project/COMPARISON.md` | L422–460 | Competitor comparison table template |
| `.gsd/templates/research-project/FEASIBILITY.md` | L463–493 | Technical feasibility assessment template |

**Validation:** All 7 expected codebase templates exist in both locations. All 7 research-project templates exist.

---

## Step 3: Fix Installer to Copy `.gsd/templates/` (P1)

**Problem:** `bin/copilot-install.js` copies `.gsd/tools/`, `.gsd/hooks/`, `.gsd/references/` but **not** `.gsd/templates/`. The `gsd_template_select` MCP tool returns path strings like `templates/summary-standard.md` that reference `.gsd/templates/`. Skills also reference `.gsd/templates/` paths (planner-subagent-prompt.md, debug-subagent-prompt.md, etc.).

**File:** `bin/copilot-install.js`

**Action:** Add a `.gsd/templates/` copy block after the references block (~line 553), mirroring the existing pattern:

```js
// Templates
const srcTemplates = path.join(srcGsd, 'templates');
const destTemplates = path.join(cwd, '.gsd', 'templates');
if (fs.existsSync(srcTemplates)) {
  const count = copyDirRecursive(srcTemplates, destTemplates);
  logAction('Copied', `.gsd/templates/ (${count} files)`);
}
```

Also add `.gsd/templates/` cleanup in the uninstall path.

**Validation:** Run `node bin/copilot-install.js --dry-run` in a temp directory → verify `.gsd/templates/` appears in the output.

---

## Step 4: Add Template Test Coverage (P1)

**Problem:** `template.js` has 196 lines and 0 tests. It's the only lib module with no test coverage.

**File:** Create `tests/copilot-template.test.cjs`

**Tests to write (~15 tests):**

### `gsd_template_select` (5 tests)
1. Returns `summary-minimal` for a plan with ≤2 tasks, ≤3 files, no decisions
2. Returns `summary-standard` for a typical plan
3. Returns `summary-complex` for a plan with decisions and >6 files
4. Returns error when plan file doesn't exist
5. Handles empty plan file gracefully

### `gsd_template_fill` — summary type (5 tests)
6. Creates summary file with correct frontmatter for minimal template
7. Creates summary file with correct frontmatter for standard template
8. Creates summary file with correct frontmatter for complex template
9. Writes to correct path: `{phase-dir}/{NN}-{MM}-SUMMARY.md`
10. Returns error when phase directory doesn't exist

### `gsd_template_fill` — plan type (3 tests)
11. Creates plan file with task table structure
12. Writes correct wave/dependency headers
13. Returns error for invalid template type

### `gsd_template_fill` — verification type (2 tests)
14. Creates verification report with correct sections
15. Includes phase metadata in frontmatter

**Validation:** `npm test` → all new tests pass, total increases by ~15.

---

## Step 5: Add `manage_todo_list` to `gsd-milestone` Skill (P2)

**Problem:** The `gsd-milestone` skill (195 lines) has 3 complex sub-workflows (audit: 6 steps, complete: 11 steps, new: 8 steps) with no progress tracking.

**File:** `.github/skills/gsd-milestone/SKILL.md`

**Action:** Add `manage_todo_list` calls at the start of each sub-workflow (after determining which sub-command) and after each major step. Follow the pattern used in `gsd-new-project` (16 references) and `gsd-map-codebase` (14 references).

Example for audit sub-command:
```
Initialize manage_todo_list with:
1. Load state and config
2. Identify audit scope
3. Delegate to integration-checker
4. Review checker findings
5. Compile audit report
6. Commit audit results
```

**Validation:** Read SKILL.md → confirm `manage_todo_list` appears in all 3 sub-workflows.

---

## Step 6: Close Truncated Agent Items (P2)

Based on detailed analysis, the "truncation" is actually intentional condensation:

### Step 6a: `gsd-integration-checker.agent.md` — CLOSE AS-IS

**Finding:** All 26 source sections are present in the port. The 142-line difference is bash pseudocode replaced with equivalent prose instructions. The classification rubrics, output format, critical rules, and success criteria are **identical**. No functional content is lost.

**Action:** No changes needed. Mark as resolved in review.

### Step 6b: `gsd-project-researcher.agent.md` — Add template references

**Finding:** The 273-line difference breaks down as:
- Context7 section removed (intentional — Copilot-native)
- 4 output templates (STACK, FEATURES, ARCHITECTURE, PITFALLS) condensed to references to `.gsd/templates/research-project/` (which exist)
- 2 output templates (COMPARISON, FEASIBILITY) condensed to one-liners with **no external template** (fixed in Step 2b)

**Action:** After Step 2b creates the templates, update the agent's template reference section to include COMPARISON.md and FEASIBILITY.md in the pointer:

```
Output templates: See `.gsd/templates/research-project/` for STACK.md, FEATURES.md, 
ARCHITECTURE.md, PITFALLS.md, COMPARISON.md, and FEASIBILITY.md templates.
```

**Validation:** All 7 research output types have accessible template files.

---

## Step 7: Verify and Document MCP Server Startup (P2)

### Step 7a: Update `docs/TROUBLESHOOTING.md`

Add a section for MCP server startup issues:

```markdown
## MCP Server Won't Start

**Symptom:** "GSD-tools MCP server was unable to start" in VS Code

**Common causes:**
1. **Node.js not installed** — run `node -v` in terminal. Install Node 18+ if missing.
2. **`.gsd/` directory missing** — the GSD runtime files aren't installed. 
   Run `npx gsd-copilot@latest` to install.
3. **Wrong workspace** — open the project folder directly in VS Code (not a parent folder).
4. **mcp.json misconfigured** — check `.vscode/mcp.json` has the gsd-tools entry.

**Diagnostic:** Open a terminal in VS Code and run:
```bash
node .gsd/tools/gsd-mcp-server.js
```
The server should print its version and workspace path. If it shows 
"(fallback: cwd)", the GSD_WORKSPACE env var isn't being set — 
check your `.vscode/mcp.json`.
```

**Validation:** Docs render correctly, diagnostic command works.

---

## Execution Order

| Priority | Steps | Rationale |
|----------|-------|-----------|
| P0 | Step 1 (MCP server fix) | Blocks all MCP tool usage |
| P1 | Steps 2, 3, 4 (templates, installer, tests) | Functional completeness |
| P2 | Steps 5, 6, 7 (milestone skill, agents, docs) | Polish |

**Estimated test count after completion:** 376 + ~15 = ~391 tests, 0 failing.
