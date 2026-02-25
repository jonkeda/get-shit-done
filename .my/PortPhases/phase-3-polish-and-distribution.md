# Phase 3: Polish & Distribution — Production-Ready Release

**Goal:** Make GSD-for-Copilot distributable, discoverable, and polished enough for external users.

**Depends on:** Phase 2 (all workflows, agents, skills, MCP server functional).  
**Validates:** End users can install, configure, and use GSD in their own projects.

---

## Step 1: Build the Installer

Create a distribution mechanism that sets up `.github/` and `.gsd/` in any project.

### Step 1a: Design the install approach

Two-tier strategy:
1. **Quick install:** `npx gsd-copilot@latest` — copies files into workspace
2. **Future:** VS Code extension with proper settings UI

### Step 1b: Create the npm package

```
gsd-copilot/
├── package.json
├── bin/
│   └── install.js
├── github/              ← files that go to .github/
│   ├── copilot-instructions.md
│   ├── instructions/
│   ├── prompts/
│   ├── agents/
│   ├── skills/
│   └── hooks/
└── gsd/                 ← files that go to .gsd/
    ├── tools/
    ├── hooks/
    └── references/
```

### Step 1c: Write `install.js`

**Source pattern:** Adapt from `bin/install.js` in the Claude Code version.

Installer behavior:
1. **Detect workspace** — must be in a git repo or project directory
2. **Check for existing installation** — offer update/clean-install/cancel
3. **Prompt for scope:**
   - Local install (`.github/` + `.gsd/` in current project)
   - User-level install (`%APPDATA%/.../User/prompts/` for prompts/agents that roam)
4. **Copy files:**
   - `.github/copilot-instructions.md` — MERGE with existing (append GSD section, don't overwrite)
   - `.github/instructions/` — copy, skip existing with same name
   - `.github/prompts/` — copy all
   - `.github/agents/` — copy all
   - `.github/skills/` — copy all skill directories
   - `.github/hooks/` — copy, merge into existing hook JSONs if present
   - `.gsd/` — copy entirely (runtime tooling)
5. **Create `.vscode/mcp.json`** — add `gsd-tools` server entry (merge with existing)
6. **Add `.gsd/` to `.gitignore`** (if not already there)
7. **Verify installation** — check key files exist
8. **Print success** with quick-start instructions

### Step 1d: Handle updates

```bash
npx gsd-copilot@latest --update
```

- Compare installed version with package version
- Show changelog/diff summary
- Preserve user customizations:
  - `copilot-instructions.md` — only update the GSD section marker
  - Agent/prompt files — replace entirely (user shouldn't edit these)
  - Config files — merge (don't overwrite user settings)
  - `.gsd/` — replace entirely (runtime tooling)

### Step 1e: Handle uninstall

```bash
npx gsd-copilot@latest --uninstall
```

- Remove all `gsd-*` files from `.github/prompts/`, `.github/agents/`, `.github/skills/`
- Remove GSD section from `copilot-instructions.md`
- Remove GSD hooks from `.github/hooks/`
- Remove `.gsd/` directory
- Remove `gsd-tools` entry from `.vscode/mcp.json`
- Do NOT remove `.planning/` (user data)

**Validation:** `npx gsd-copilot` → full install in test project. `npx gsd-copilot --update` → clean update. `npx gsd-copilot --uninstall` → clean removal.

---

## Step 2: Adapt Agent Files for Multi-Model Support

The balanced profile is hardcoded in Phase 2. Now add proper model fallback chains.

### Step 2a: Define model fallback arrays per agent

| Agent | Primary | Fallback 1 | Fallback 2 |
|-------|---------|------------|------------|
| `gsd-planner` | `claude-sonnet-4` | `gpt-4.1` | `gemini-2.5-pro` |
| `gsd-executor` | `claude-sonnet-4` | `gpt-4.1` | `gemini-2.5-pro` |
| `gsd-plan-checker` | `claude-sonnet-4` | `gpt-4.1` | `gemini-2.5-pro` |
| `gsd-verifier` | `claude-sonnet-4` | `gpt-4.1` | `gemini-2.5-pro` |
| `gsd-phase-researcher` | `claude-sonnet-4` | `gpt-4.1` | `gemini-2.5-pro` |
| `gsd-project-researcher` | `claude-sonnet-4` | `gpt-4.1` | `gemini-2.5-pro` |
| `gsd-research-synthesizer` | `claude-sonnet-4` | `gpt-4.1` | `gemini-2.5-pro` |
| `gsd-roadmapper` | `claude-sonnet-4` | `gpt-4.1` | `gemini-2.5-pro` |
| `gsd-debugger` | `claude-sonnet-4` | `gpt-4.1` | `gemini-2.5-pro` |
| `gsd-codebase-mapper` | `claude-haiku-3.5` | `claude-sonnet-4` | `gpt-4.1-mini` |
| `gsd-integration-checker` | `claude-sonnet-4` | `gpt-4.1` | `gemini-2.5-pro` |

### Step 2b: Create profile switching MCP tool

Add `gsd_switch_profile` to MCP server:
- Input: `{profile: "quality"|"balanced"|"budget"}`
- Action: Reads all `.agent.md` files, rewrites `model:` frontmatter based on profile map
- Output: List of updated agents

### Step 2c: Create profile switching prompt

`gsd-set-profile.prompt.md` — calls `gsd_switch_profile` MCP tool.

**Validation:** `/gsd-set-profile quality` → all agent files updated to Opus-tier models.

---

## Step 3: Build VS Code Status Bar Extension (Optional)

The statusline has no direct Copilot equivalent, but a VS Code extension can add a status bar item.

### Step 3a: Extension scaffold

```
gsd-copilot-extension/
├── package.json
├── src/
│   └── extension.ts
└── tsconfig.json
```

### Step 3b: Status bar features

- **GSD icon** in status bar (left side)
- **Current phase/plan** — reads STATE.md
- **Progress** — computed from ROADMAP.md (e.g., "Phase 3/7 | Plan 2/3")
- Click → quick-pick menu with common GSD commands
- Color-coded by status:
  - Green: executing
  - Yellow: planned, not executing
  - Blue: needs planning
  - Red: has blockers

### Step 3c: Tree view (GSD Explorer)

Add a sidebar tree view:
```
GSD EXPLORER
├── 📋 Project: My App
├── 📊 Progress: 42% (3/7 phases)
├── 🎯 Current: Phase 3 - Comments
│   ├── 📝 Plan 1: Data model ✅
│   ├── 📝 Plan 2: API layer 🔄
│   └── 📝 Plan 3: UI components ⏳
├── 📌 Todos (5)
│   ├── Add rate limiting
│   └── ...
└── 🐛 Debug Sessions (1)
    └── Login timeout issue
```

### Step 3d: Command palette integration

Register commands:
- `GSD: New Project` → runs `/gsd-new-project` in Copilot chat
- `GSD: Plan Phase` → asks for phase number, runs `/gsd-plan-phase N`
- `GSD: Execute Phase` → asks for phase number, runs `/gsd-execute-phase N`
- `GSD: Quick Task` → asks for description, runs `/gsd-quick`
- `GSD: Progress` → runs `/gsd-progress`
- `GSD: Switch Profile` → quick-pick quality/balanced/budget

### Step 3e: Settings UI

VS Code settings contributions:
```json
{
  "gsd.modelProfile": {
    "type": "string",
    "enum": ["quality", "balanced", "budget"],
    "default": "balanced"
  },
  "gsd.workflow.research": {
    "type": "boolean",
    "default": true
  },
  "gsd.workflow.planCheck": {
    "type": "boolean", 
    "default": true
  },
  "gsd.workflow.verifier": {
    "type": "boolean",
    "default": true
  }
}
```

**Validation:** Install extension, see GSD status bar + tree view. Click commands → Copilot chat processes them.

---

## Step 4: Add Advanced `.instructions.md` Files

Create specialized instruction files that activate based on file context.

### Step 4a: Planning state instructions

```yaml
# .github/instructions/gsd-state.instructions.md
---
applyTo: ".planning/STATE.md"
---
```

Content: "This is the GSD project state file. It tracks current position, decisions, blockers, and session continuity. Update via MCP tools, not direct editing. Sections: Position, Progress, Decisions, Todos, Blockers, Session."

### Step 4b: Plan file instructions

```yaml
# .github/instructions/gsd-plans.instructions.md
---
applyTo: ".planning/phases/**/*-PLAN.md"
---
```

Content: "This is a GSD execution plan. YAML frontmatter defines wave, dependencies, files modified, requirements, must-haves. Tasks are ordered by dependency. Execute via `/gsd-execute-phase`. Never modify manually during execution."

### Step 4c: Summary file instructions

```yaml
# .github/instructions/gsd-summaries.instructions.md
---
applyTo: ".planning/phases/**/*-SUMMARY.md"
---
```

Content: "This is a GSD execution summary. YAML frontmatter tracks commits, dependencies, patterns, and decisions. Body records what was built, git hashes, and deviations. Read-only after creation."

### Step 4d: Research file instructions

```yaml
# .github/instructions/gsd-research.instructions.md
---
applyTo: ".planning/phases/**/*-RESEARCH.md"
---
```

Content: "This is GSD phase research. Contains ecosystem knowledge, architecture patterns, common pitfalls. Source confidence levels (HIGH/MEDIUM/LOW) are documented. Consumed by the planner — do not modify after planning begins."

### Step 4e: Quick task instructions

```yaml
# .github/instructions/gsd-quick.instructions.md
---
applyTo: ".planning/quick/**"
---
```

Content: "These are GSD quick task artifacts. Each subfolder is a standalone task with PLAN.md and SUMMARY.md."

---

## Step 5: Write Documentation

### Step 5a: README.md

Create a README for the `gsd-copilot` package:
- What is GSD? (adapted from original README)
- How to install
- Quick start (3-step)
- Command reference (adapted for Copilot — `/gsd-` prefix instead of `/gsd:`)
- Architecture overview (agents, skills, MCP server)
- Configuration guide
- Differences from Claude Code version
- Migration guide for Claude Code users

### Step 5b: Migration guide

`MIGRATION.md` — for users coming from the Claude Code version:
- Command mapping table (`/gsd:plan-phase` → `/gsd-plan-phase`)
- What's different: sequential execution, no statusline, Copilot-native features
- What's the same: `.planning/` directory, artifacts, workflow, agents
- Coexistence: can have both Claude Code and Copilot GSD installed simultaneously

### Step 5c: Configuration reference

`CONFIGURATION.md`:
- config.json schema
- Model profiles explained
- Workflow toggles
- Gate system
- Git branching strategies

### Step 5d: Troubleshooting guide

`TROUBLESHOOTING.md`:
- "MCP server not connecting" — check `.vscode/mcp.json`, verify Node.js
- "Commands not showing in `/`" — verify `.github/prompts/` structure
- "Agents not found" — verify `.github/agents/` structure
- "Research not working" — check web tool access, Context7 MCP setup
- "Commits failing" — verify git config, check `.planning/config.json` commit_docs

---

## Step 6: Testing & Quality Assurance

### Step 6a: Unit tests for MCP server

Test each MCP tool in isolation:
- State load/update/patch with various STATE.md contents
- Config load/set with various config.json shapes
- Phase add/remove/insert with various ROADMAP.md states
- Frontmatter get/set/validate with various PLAN.md files
- Commit tool with mock git repo
- Edge cases: missing files, malformed frontmatter, concurrent access

### Step 6b: Integration tests

Test tool chains:
- `init_quick` → `commit` → `state_update` → verify state consistency
- `phase_add` → `roadmap_analyze` → verify phase appears
- `phase_remove` → verify renumbering
- `phase_insert` → verify decimal calculation

### Step 6c: End-to-end workflow tests

Run each Copilot command with representative inputs:
- Fresh project: `/gsd-new-project` through `/gsd-complete-milestone`
- Brownfield: `/gsd-map-codebase` → `/gsd-new-project`
- Quick mode: `/gsd-quick "Add health endpoint"`
- Debug: `/gsd-debug "Login broken"`
- Edge: pause/resume across simulated session boundaries

### Step 6d: Cross-model testing

Test with all supported models:
- Claude Sonnet 4
- GPT-4.1
- Gemini 2.5 Pro

Verify agents produce valid artifacts regardless of model.

---

## Step 7: Publish

### Step 7a: npm package

```json
{
  "name": "gsd-copilot",
  "version": "1.0.0",
  "description": "GSD (Get Shit Done) for GitHub Copilot in VS Code",
  "bin": {
    "gsd-copilot": "bin/install.js"
  },
  "keywords": ["copilot", "github-copilot", "vscode", "ai", "spec-driven-development"]
}
```

Publish: `npm publish`

### Step 7b: VS Code extension (if built)

Package and publish to VS Code Marketplace:
```bash
vsce package
vsce publish
```

### Step 7c: GitHub repository

Create `github.com/glittercowboy/gsd-copilot` (or `gsd-vscode`):
- Full source code
- CI/CD: lint + test on PRs
- Release workflow: auto-publish to npm on tag
- Issue templates for bug reports and feature requests

---

## Step 8: Post-Launch Optimization

### Step 8a: Performance profiling

Measure:
- MCP server startup time (should be <200ms)
- Tool call latency (should be <100ms per call)
- Full `/gsd-quick` wall-clock time vs Claude Code equivalent
- `/gsd-execute-phase` sequential vs parallel timing delta

### Step 8b: Prompt optimization

After real-world usage, tune:
- Agent prompt length (minimize without quality loss)
- Skill reference structure (what should be always-loaded vs progressive)
- MCP tool granularity (too many small tools vs too few large ones)
- Model selection (which models work well for which agents)

### Step 8c: User feedback integration

Track:
- Which commands are most/least used
- Common failure modes
- Model preference patterns
- Feature requests

---

## Phase 3 Deliverables

| Component | Count | Status |
|-----------|-------|--------|
| npm installer package | 1 | |
| VS Code extension (optional) | 1 | |
| Model profile switching | 1 MCP tool + script | |
| `.instructions.md` files | 5 (total: 7) | |
| Documentation files | 4 | |
| MCP server unit tests | ~35 | |
| Integration tests | ~15 | |
| E2E workflow tests | ~10 | |
| **Total new artifacts** | **~70** | |

---

## Complete Project Summary

| Phase | Focus | Key Deliverables | Files |
|-------|-------|-----------------|-------|
| **1** | Core Foundation | MCP server, 4 agents, 12 prompts, 1 skill, 1 hook | ~28 |
| **2** | Full Orchestration | +7 agents, +7 skills, +5 prompts, +15 MCP tools | ~60 |
| **3** | Polish & Distribution | Installer, extension, docs, tests, profiles | ~70 |
| **Total** | | Complete GSD-for-Copilot system | ~158 |
