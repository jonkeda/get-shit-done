# GSD → GitHub Copilot (VS Code) Porting Analysis

**Date:** 2026-02-24  
**Subject:** Can GSD (Get Shit Done) be ported to GitHub Copilot in VS Code? Full feasibility analysis.

---

## Executive Summary

**Verdict: Yes, with significant architectural adaptation.** ~70% of GSD's functionality maps cleanly to Copilot's customization primitives (agents, prompts, skills, hooks, MCP). The remaining ~30% — parallel subagent orchestration, explicit context budget management, and the npm-based distribution model — requires either rethinking the architecture or building a companion VS Code extension.

The port is not a 1:1 transliteration. GSD is deeply coupled to Claude Code's `Task` tool (isolated subagent spawning with model selection), its hook I/O contract (stdin JSON with context metrics), and its slash-command registration system. A Copilot port would use different primitives to achieve the same goals.

---

## Table of Contents

1. [What GSD Is](#1-what-gsd-is)
2. [GSD Architecture Summary](#2-gsd-architecture-summary)
3. [Copilot Customization Primitives](#3-copilot-customization-primitives)
4. [Component-by-Component Mapping](#4-component-by-component-mapping)
5. [Critical Gaps & Blockers](#5-critical-gaps--blockers)
6. [Recommended Copilot Architecture](#6-recommended-copilot-architecture)
7. [Migration Strategy](#7-migration-strategy)
8. [Effort Estimate](#8-effort-estimate)
9. [What Gets Better in Copilot](#9-what-gets-better-in-copilot)
10. [What Gets Worse in Copilot](#10-what-gets-worse-in-copilot)
11. [Conclusion](#11-conclusion)

---

## 1. What GSD Is

GSD is a **meta-prompting, context engineering, and spec-driven development system** that turns AI coding assistants into reliable software engineering pipelines. It was built for Claude Code but also supports OpenCode, Gemini CLI, and Codex.

**Core problem it solves:** Context rot — the quality degradation that happens as an LLM fills its context window. GSD prevents this by:

- Breaking work into atomic plans that execute in **fresh context windows** (subagents)
- Using file-based state (`.planning/` directory) as persistent memory between sessions
- Orchestrating 11 specialized agents through a structured lifecycle: research → plan → verify plan → execute → verify results

**The workflow:**
```
new-project → [discuss → plan → execute → verify] per phase → audit → complete milestone
```

Each step is a slash command (`/gsd:plan-phase 3`) that orchestrates subagents with fresh context, produces structured markdown artifacts, and advances project state.

---

## 2. GSD Architecture Summary

### Layers

| Layer | Components | Purpose |
|-------|-----------|---------|
| **Distribution** | `bin/install.js` (npm) | Installs files into `~/.claude/` |
| **Commands** | 25 markdown files in `commands/gsd/` | Slash commands with YAML frontmatter |
| **Workflows** | ~33 markdown files in `workflows/` | Step-by-step orchestration procedures |
| **Agents** | 11 markdown files in `agents/` | Specialized persona definitions |
| **Tools** | `gsd-tools.cjs` (~100 subcommands) | State management, git, config, templates |
| **Hooks** | 3 JavaScript hooks | Statusline, context monitoring, update checks |
| **Templates** | 25 markdown/JSON templates | File scaffolding for `.planning/` |
| **References** | 14 reference docs | Shared knowledge (model profiles, UI branding, patterns) |
| **State** | `.planning/` directory tree | File-based project database |

### Key Claude Code Dependencies

| Feature | How GSD Uses It | Copilot Equivalent Exists? |
|---------|----------------|---------------------------|
| Slash commands from `.md` files | Command registration | Yes — `.prompt.md` files |
| `Task()` tool — subagent spawning | Fresh 200K isolation per agent | Partial — `runSubagent` exists but different |
| `allowed-tools` in command frontmatter | Per-command tool permissions | Yes — `tools:` in agent/prompt YAML |
| `@file` references in context | Auto-load files into context | Yes — `#file:` or skill references |
| `$ARGUMENTS` variable | User input from command invocation | Yes — prompt `mode: agent` or input |
| `AskUserQuestion` tool | Interactive questioning flows | Yes — `vscode_askQuestions` tool |
| `SlashCommand` tool | Chaining commands | Partial — handoffs between agents |
| Model selection per `Task()` | Route subagents to Opus/Sonnet/Haiku | Yes — `model:` frontmatter |
| Lifecycle hooks (stdin JSON) | Context metrics, statusline, update check | Partial — hooks exist, different contract |
| `Bash` tool unrestricted | Run `gsd-tools.cjs`, git commands | Yes — `execute` tool alias |

### The 11 Agents

| Agent | Role | Invoked By |
|-------|------|------------|
| `gsd-planner` | Creates atomic PLAN.md files with task breakdown | `plan-phase`, `quick` |
| `gsd-executor` | Executes plans, commits per task, writes SUMMARY.md | `execute-phase`, `quick` |
| `gsd-plan-checker` | Verifies plans meet phase goals (8 dimensions) | `plan-phase` |
| `gsd-verifier` | Goal-backward verification of actual codebase | `verify-work`, `execute-phase` |
| `gsd-phase-researcher` | Domain research before planning | `plan-phase`, `research-phase` |
| `gsd-project-researcher` | Ecosystem research during project init | `new-project` |
| `gsd-research-synthesizer` | Merges parallel research outputs | `new-project` |
| `gsd-roadmapper` | Creates ROADMAP.md from requirements | `new-project` |
| `gsd-debugger` | Scientific method debugging | `debug` |
| `gsd-codebase-mapper` | Analyzes existing codebase (4 focus areas) | `map-codebase` |
| `gsd-integration-checker` | Cross-phase integration wiring checks | `audit-milestone` |

---

## 3. Copilot Customization Primitives

VS Code GitHub Copilot offers these customization mechanisms:

| Primitive | Location | Purpose |
|-----------|----------|---------|
| **Workspace Instructions** | `.github/copilot-instructions.md` | Always-on project conventions |
| **File Instructions** | `.github/instructions/*.instructions.md` | Per-file-type guidelines with `applyTo` globs |
| **Prompts** | `.github/prompts/*.prompt.md` | Reusable single-task templates (appear as `/` commands) |
| **Custom Agents** | `.github/agents/*.agent.md` | Personas with tool restrictions, model selection, handoffs |
| **Skills** | `.github/skills/<name>/SKILL.md` | Multi-step workflows with bundled assets |
| **Hooks** | `.github/hooks/*.json` | Lifecycle shell scripts (PreToolUse, PostToolUse, SessionStart, Stop) |
| **MCP Servers** | VS Code settings | External tool APIs |
| **Subagent invocation** | `agents:` frontmatter + `agent` tool alias | Parent→child delegation with context isolation |
| **Model selection** | `model:` frontmatter with fallback arrays | Per-agent/prompt model routing |
| **Handoffs** | `handoffs:` frontmatter | Agent→agent workflow chaining |
| **Memory** | `/memories/`, `/memories/session/`, `/memories/repo/` | Persistent, session, and repo-scoped notes |
| **Todo list** | `manage_todo_list` tool | Task tracking and progress visibility |
| **VS Code Extension API** | `vscode.chat.createChatParticipant()` | Fully programmatic participants |

---

## 4. Component-by-Component Mapping

### 4.1 Commands → Prompts + Skills

| GSD Command | Complexity | Copilot Target |
|-------------|-----------|----------------|
| `/gsd:help` | Simple display | `.prompt.md` |
| `/gsd:progress` | State read + display | `.prompt.md` |
| `/gsd:join-discord` | URL display | `.prompt.md` |
| `/gsd:settings` | Config read/write | `.prompt.md` |
| `/gsd:set-profile` | Config update | `.prompt.md` |
| `/gsd:check-todos` | File read + display | `.prompt.md` |
| `/gsd:add-todo` | File append | `.prompt.md` |
| `/gsd:add-phase` | Roadmap mutation | `.prompt.md` |
| `/gsd:remove-phase` | Roadmap mutation | `.prompt.md` |
| `/gsd:insert-phase` | Roadmap mutation | `.prompt.md` |
| `/gsd:pause-work` | State snapshot | `.prompt.md` |
| `/gsd:resume-work` | State restore | `.prompt.md` |
| `/gsd:quick` | Plan + execute (no research/verify) | `SKILL.md` (light) |
| `/gsd:discuss-phase` | Interactive questioning | `SKILL.md` |
| `/gsd:debug` | Multi-step scientific debugging | `SKILL.md` |
| `/gsd:plan-phase` | Research → plan → verify loop | `SKILL.md` (complex) |
| `/gsd:execute-phase` | Wave orchestration, parallel execution | `SKILL.md` (complex) |
| `/gsd:verify-work` | Goal-backward verification + UAT | `SKILL.md` |
| `/gsd:new-project` | Full project init (questions → research → requirements → roadmap) | `SKILL.md` (most complex) |
| `/gsd:map-codebase` | Parallel codebase analysis | `SKILL.md` |
| `/gsd:new-milestone` | Milestone init cycle | `SKILL.md` |
| `/gsd:audit-milestone` | Integration checking | `SKILL.md` |
| `/gsd:complete-milestone` | Archival + tagging | `SKILL.md` |
| `/gsd:research-phase` | Deep research only | `SKILL.md` |

**Mapping quality: HIGH.** Simple commands map 1:1 to `.prompt.md` files. Complex orchestration commands map to skills that delegate to agents. The `/` command mechanism in Copilot is the direct equivalent.

### 4.2 Agents → Custom Agents (.agent.md)

Each GSD agent maps to a Copilot `.agent.md` file:

```yaml
# .github/agents/gsd-executor.agent.md
---
description: "Executes PLAN.md files atomically — per-task git commits, deviation handling, SUMMARY.md production"
tools: [read, edit, execute, search, todo]
model: [claude-sonnet-4, gpt-4.1]
user-invocable: false
agents: []
---

<system instructions from agents/gsd-executor.md go here>
```

| GSD Agent | `tools:` | `user-invocable` | Notes |
|-----------|---------|-------------------|-------|
| `gsd-planner` | `read, edit, execute, search, web` | `false` | Complex: needs web for research refs |
| `gsd-executor` | `read, edit, execute, search, todo` | `false` | Needs terminal for git, test runs |
| `gsd-plan-checker` | `read, execute, search` | `false` | Read-only + bash for tool verification |
| `gsd-verifier` | `read, execute, search` | `false` | Read-only + bash for grep/verification |
| `gsd-phase-researcher` | `read, search, web, execute` | `false` | Web search + Context7 MCP |
| `gsd-project-researcher` | `read, search, web, execute` | `false` | Same as phase-researcher |
| `gsd-research-synthesizer` | `read, edit, execute` | `false` | Read research, write summary |
| `gsd-roadmapper` | `read, edit, execute` | `false` | Writes ROADMAP.md, STATE.md |
| `gsd-debugger` | `read, edit, execute, search, web` | `true` | User-facing for `/gsd:debug` |
| `gsd-codebase-mapper` | `read, execute, search` | `false` | Read-only codebase analysis |
| `gsd-integration-checker` | `read, execute, search` | `false` | Import/export wiring checks |

**Mapping quality: HIGH.** The `.agent.md` format directly supports tool restrictions, model selection, and non-user-invocable agents. The prompt engineering content from `agents/*.md` transfers directly into the agent body.

### 4.3 Workflows → Skill References

GSD workflows (~33 files, 200-500 lines each) are step-by-step orchestration procedures. In Copilot, these become:

- **Skill body** (`SKILL.md`) — top-level workflow steps with progressive loading
- **Skill references** (`references/*.md`) — detailed substep procedures loaded on demand
- **Skill assets** (`templates/*.md`, `assets/`) — templates and shared resources

Example mapping:
```
GSD:
  workflows/execute-phase.md (orchestrator)
  workflows/execute-plan.md (per-plan steps)
  workflows/wave-coordinator.md (wave logic)

Copilot:
  skills/gsd-execute-phase/
    SKILL.md                    ← orchestrator, references wave steps
    references/execute-plan.md  ← detailed per-plan workflow
    references/wave-logic.md    ← wave grouping algorithm
    templates/summary.md        ← SUMMARY.md template
```

**Mapping quality: HIGH.** Skills with references provide the same progressive-loading pattern that GSD uses with `@` file references.

### 4.4 gsd-tools.cjs → MCP Server + Hook Scripts

`gsd-tools.cjs` is a ~100-subcommand Node.js CLI that agents invoke via Bash. It handles:

| Category | Subcommands | Copilot Approach |
|----------|-------------|-----------------|
| **State management** | `state load`, `state update`, `state patch` | MCP server |
| **Phase operations** | `find-phase`, `phase add/insert/remove/complete` | MCP server |
| **Roadmap operations** | `roadmap analyze`, `roadmap get-phase`, `roadmap update-*` | MCP server |
| **Verification** | `verify plan-structure`, `verify artifacts`, `verify key-links` | MCP server |
| **Init (context loading)** | `init execute-phase`, `init plan-phase`, `init quick` | MCP server |
| **Frontmatter** | `frontmatter get/set/merge/validate` | MCP server |
| **Templates** | `template fill summary/plan/context` | MCP server or file references |
| **Git** | `commit` (staging + conventional msg) | Hook scripts or MCP server |
| **Model resolution** | `resolve-model <agent>` | `model:` frontmatter (native) |
| **Progress display** | `progress json/table/bar` | MCP server |
| **Config** | `config get/set/toggle` | MCP server |

**Recommended approach:** Package `gsd-tools.cjs` as an **MCP server** that exposes these operations as callable tools. Copilot agents would call MCP tools instead of `Bash(node gsd-tools.cjs ...)`:

```json
// .vscode/mcp.json
{
  "servers": {
    "gsd-tools": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/.gsd/tools/gsd-mcp-server.js"]
    }
  }
}
```

**Mapping quality: MODERATE.** The functionality transfers cleanly, but requires rewriting `gsd-tools.cjs` from a CLI to an MCP server (tool definitions with JSON schemas instead of argv parsing). The core logic (`lib/*.cjs`) can be reused.

### 4.5 Hooks

| GSD Hook | Trigger | Copilot Equivalent |
|----------|---------|-------------------|
| `gsd-statusline.js` | Every status render | **No equivalent.** VS Code has its own statusbar. Could build a status bar extension item. |
| `gsd-context-monitor.js` | PostToolUse | **Hooks** (`.github/hooks/PostToolUse.json`) with `systemMessage` output. |
| `gsd-check-update.js` | SessionStart | **Hooks** (`.github/hooks/SessionStart.json`). |

Context monitor hook mapping:
```json
// .github/hooks/context-monitor.json
{
  "event": "PostToolUse",
  "command": "node .gsd/hooks/context-monitor.js",
  "systemMessage": "{{stdout}}"
}
```

**Challenge:** The context monitor depends on Claude Code exposing `context_window.remaining_tokens` via stdin JSON. Copilot's hook contract may not expose equivalent metrics. This needs investigation — if Copilot hooks don't provide context usage data, this feature cannot be ported directly.

**Mapping quality: PARTIAL.** Context monitoring may be blocked by missing metrics. Update checking maps well. Statusline has no equivalent.

### 4.6 Templates → Skill Assets

GSD templates (25 files) are markdown/JSON scaffolds that agents copy into `.planning/`. These map directly to **skill assets**:

```
skills/gsd-new-project/
  templates/
    project.md
    requirements.md
    roadmap.md
    state.md
    config.json
    discovery.md
```

Agents reference them as `./templates/project.md` relative to the skill.

**Mapping quality: HIGH.** Direct 1:1 mapping.

### 4.7 References → Skill References / Instructions

GSD reference docs (model profiles, UI branding, verification patterns, etc.) map to:

- **Skill references** for workflow-specific docs: `skills/gsd-execute-phase/references/git-integration.md`
- **.instructions.md** for always-applicable docs: `.github/instructions/gsd-conventions.instructions.md`

**Mapping quality: HIGH.**

### 4.8 State Management (.planning/)

GSD uses `.planning/` as a file-system database. This approach **works identically in Copilot** — agents read/write files using standard file tools. No change needed.

The `STATE.md` cold-start pattern (every session starts by reading STATE.md) can be enforced via:
- `.github/instructions/gsd-state.instructions.md` with `applyTo: ".planning/**"`
- Or a `copilot-instructions.md` rule: "Always read `.planning/STATE.md` first when working on GSD-managed projects"

**Mapping quality: HIGH.**

### 4.9 Subagent Orchestration

This is the **most significant architectural difference**.

**GSD's model:**
```
Orchestrator (lean, ~15% context)
  └── Task(gsd-planner, model=opus)     ← fresh 200K context
  └── Task(gsd-executor, model=sonnet)  ← fresh 200K context
  └── Task(gsd-executor, model=sonnet)  ← fresh 200K context (parallel!)
  └── Task(gsd-verifier, model=sonnet)  ← fresh 200K context
```

**Copilot's model:**
```
Parent agent
  └── runSubagent(gsd-planner)    ← fresh context, returns text
  └── runSubagent(gsd-executor)   ← fresh context, returns text
  └── runSubagent(gsd-executor)   ← sequential (no parallel spawning)
  └── runSubagent(gsd-verifier)   ← fresh context, returns text
```

**Key differences:**

| Aspect | Claude Code `Task` | Copilot `runSubagent` |
|--------|-------------------|----------------------|
| Context isolation | ✅ Fresh 200K per agent | ✅ Fresh context per agent |
| Parallel execution | ✅ Multiple `Task()` in same wave | ❌ Sequential only |
| Model selection | ✅ Per-task model parameter | ✅ `model:` frontmatter |
| Structured output | ✅ Agent writes files + returns status | ⚠️ Agent returns text to parent |
| Orchestrator-to-agent I/O | Prompt string with `<files_to_read>` | Prompt string |
| Agent-to-file writes | ✅ Agent writes directly to disk | ✅ Agent writes directly to disk |

**Impact of no parallel execution:** GSD's wave-based execution (`execute-phase`) runs independent plans simultaneously within a wave. In Copilot, plans within a wave would execute sequentially. For a 3-plan wave, this means 3× the wall-clock time. However, the quality and isolation guarantees remain identical.

**Mapping quality: MODERATE.** Core isolation works. Parallelism is lost. Sequential execution is a quality-neutral but time-increasing tradeoff.

### 4.10 Model Profile Resolution

GSD routes agents to different model tiers (Opus/Sonnet/Haiku) based on a config profile.

In Copilot, this maps to `model:` frontmatter with fallback arrays:

```yaml
# gsd-planner.agent.md (quality profile)
model: [claude-opus-4, claude-sonnet-4]

# gsd-codebase-mapper.agent.md (budget profile)
model: [claude-haiku-3.5, claude-sonnet-4]
```

**Challenge:** The profile system (quality/balanced/budget) dynamically selects models. Copilot's `model:` is static per agent file. To support profiles, you'd need **3 variants of each agent file** (one per profile) or use the MCP server to dynamically generate agent configs.

**Pragmatic solution:** Pick one profile (balanced) and hardcode it. Users who want different profiles edit agent files.

**Mapping quality: MODERATE.** Single profiles work great. Dynamic profiles need workarounds.

### 4.11 Interactive Questioning

GSD uses `AskUserQuestion` for structured interactive flows (project init questions, discuss-phase decisions).

Copilot offers `vscode_askQuestions` which supports multi-question, multi-select, and freeform inputs.

**Mapping quality: HIGH.** Direct equivalent.

### 4.12 Distribution / Installation

GSD distributes via npm: `npx get-shit-done-cc@latest` installs files into `~/.claude/`.

Copilot customization is workspace-scoped (`.github/`) or user-scoped (`%APPDATA%/.../User/prompts/`).

**Options for distribution:**

| Approach | Pros | Cons |
|----------|------|------|
| **Git repo template** | Simple, users clone/copy `.github/` folder | Manual updates, no versioning |
| **npm + install script** | Same as current, writes to `.github/` | Overwrites user customizations |
| **VS Code extension** | Native install, update, settings UI | Significant development effort |
| **GitHub template repo** | Users create repos from template | Only for new projects |
| **degit / tiged** | `npx degit gsd/.github .github` | One-liner, no git history |

**Recommended:** Start with a **git repo template + degit** for simplicity. Graduate to a **VS Code extension** if adoption warrants it.

**Mapping quality: LOW.** Requires new distribution strategy.

---

## 5. Critical Gaps & Blockers

### 5.1 Blocker: No Parallel Subagent Execution

**Impact:** HIGH  
**GSD behavior:** `execute-phase` runs plans in dependency-ordered waves. Independent plans within a wave execute simultaneously.  
**Copilot behavior:** `runSubagent` is sequential.  
**Mitigation:** Accept sequential execution. Quality is identical; only wall-clock time increases. For a typical 3-plan phase, execution goes from ~10min (parallel) to ~30min (sequential).  
**Status:** **Workable.** Not a blocker — just slower.

### 5.2 Gap: Context Budget Awareness

**Impact:** MEDIUM  
**GSD behavior:** The context monitor hook injects WARNING/CRITICAL messages when context is running low, telling the agent to stop and save state.  
**Copilot behavior:** Hook scripts may not receive context usage metrics on stdin.  
**Mitigation:** Investigate Copilot hook capabilities. If metrics are available, port directly. If not, use a heuristic (count tool calls, estimate tokens from file sizes) or rely on Copilot's native context management.  
**Status:** **Needs investigation.**

### 5.3 Gap: No Statusline

**Impact:** LOW  
**GSD behavior:** Custom terminal statusline showing model, task, context usage, update indicator.  
**Copilot behavior:** No custom statusline hook point.  
**Mitigation:** Build a VS Code status bar extension item. Or accept the loss — VS Code already shows the active model in its UI.  
**Status:** **Nice-to-have, not critical.**

### 5.4 Gap: Dynamic Model Profiles

**Impact:** LOW-MEDIUM  
**GSD behavior:** `config.json` profile (quality/balanced/budget) dynamically selects models per agent.  
**Copilot behavior:** `model:` frontmatter is static per agent file.  
**Mitigation:** Ship with the `balanced` profile baked into agent files. Provide a script or MCP tool that rewrites agent files to switch profiles.  
**Status:** **Workable.**

### 5.5 Gap: npm-style Distribution

**Impact:** MEDIUM  
**GSD behavior:** `npx get-shit-done-cc` installs and updates the system.  
**Copilot behavior:** No equivalent package manager for Copilot customizations.  
**Mitigation:** degit for quick install, VS Code extension for proper distribution.  
**Status:** **Workable but different UX.**

### 5.6 Gap: Cross-Hook Communication (Bridge Files)

**Impact:** LOW  
**GSD behavior:** Statusline writes temp JSON files that the context monitor reads.  
**Copilot behavior:** Similar pattern possible if both hooks exist.  
**Mitigation:** If context monitor can't get metrics from Copilot, bridge files are moot. If it can, the same pattern works.  
**Status:** **Dependent on 5.2.**

---

## 6. Recommended Copilot Architecture

```
project-root/
├── .github/
│   ├── copilot-instructions.md              # Always-on: GSD conventions, STATE.md read-first rule
│   │
│   ├── instructions/
│   │   ├── planning-docs.instructions.md    # applyTo: ".planning/**" — doc conventions
│   │   └── gsd-state.instructions.md        # applyTo: ".planning/STATE.md" — state format rules
│   │
│   ├── prompts/
│   │   ├── gsd-help.prompt.md               # Simple: display help
│   │   ├── gsd-progress.prompt.md           # Simple: read STATE.md + display
│   │   ├── gsd-pause-work.prompt.md         # Simple: save continue-here.md
│   │   ├── gsd-resume-work.prompt.md        # Simple: read continue-here.md + restore
│   │   ├── gsd-add-todo.prompt.md           # Simple: append to todos
│   │   ├── gsd-check-todos.prompt.md        # Simple: list todos
│   │   ├── gsd-add-phase.prompt.md          # Simple: roadmap mutation
│   │   ├── gsd-remove-phase.prompt.md       # Simple: roadmap mutation
│   │   ├── gsd-insert-phase.prompt.md       # Simple: roadmap mutation
│   │   ├── gsd-settings.prompt.md           # Simple: config read/write
│   │   ├── gsd-set-profile.prompt.md        # Simple: config update
│   │   └── gsd-update.prompt.md             # Simple: version check
│   │
│   ├── agents/
│   │   ├── gsd-orchestrator.agent.md        # Master orchestrator with handoffs to all agents
│   │   ├── gsd-planner.agent.md             # tools: [read, edit, execute, search, web, agent]
│   │   ├── gsd-executor.agent.md            # tools: [read, edit, execute, search, todo]
│   │   ├── gsd-plan-checker.agent.md        # tools: [read, execute, search]
│   │   ├── gsd-verifier.agent.md            # tools: [read, execute, search]
│   │   ├── gsd-phase-researcher.agent.md    # tools: [read, search, web, execute]
│   │   ├── gsd-project-researcher.agent.md  # tools: [read, search, web, execute]
│   │   ├── gsd-research-synthesizer.agent.md# tools: [read, edit, execute]
│   │   ├── gsd-roadmapper.agent.md          # tools: [read, edit, execute]
│   │   ├── gsd-debugger.agent.md            # tools: [read, edit, execute, search, web]
│   │   ├── gsd-codebase-mapper.agent.md     # tools: [read, execute, search]
│   │   └── gsd-integration-checker.agent.md # tools: [read, execute, search]
│   │
│   ├── skills/
│   │   ├── gsd-new-project/
│   │   │   ├── SKILL.md                     # Full project init orchestration
│   │   │   ├── references/
│   │   │   │   ├── questioning.md
│   │   │   │   ├── research-workflow.md
│   │   │   │   ├── requirements-workflow.md
│   │   │   │   └── roadmap-workflow.md
│   │   │   └── templates/
│   │   │       ├── project.md
│   │   │       ├── requirements.md
│   │   │       ├── roadmap.md
│   │   │       ├── state.md
│   │   │       ├── config.json
│   │   │       └── discovery.md
│   │   │
│   │   ├── gsd-plan-phase/
│   │   │   ├── SKILL.md                     # Research → plan → verify loop
│   │   │   ├── references/
│   │   │   │   ├── research-workflow.md
│   │   │   │   ├── planning-workflow.md
│   │   │   │   ├── plan-checking.md
│   │   │   │   └── validation-patterns.md
│   │   │   └── templates/
│   │   │       ├── phase-prompt.md
│   │   │       ├── context.md
│   │   │       └── research.md
│   │   │
│   │   ├── gsd-execute-phase/
│   │   │   ├── SKILL.md                     # Wave orchestration (sequential in Copilot)
│   │   │   ├── references/
│   │   │   │   ├── execute-plan.md
│   │   │   │   ├── git-integration.md
│   │   │   │   ├── verification-patterns.md
│   │   │   │   └── deviation-rules.md
│   │   │   └── templates/
│   │   │       ├── summary.md
│   │   │       └── verification-report.md
│   │   │
│   │   ├── gsd-verify-work/
│   │   │   ├── SKILL.md                     # UAT + goal-backward verification
│   │   │   ├── references/
│   │   │   │   └── verification-patterns.md
│   │   │   └── templates/
│   │   │       └── UAT.md
│   │   │
│   │   ├── gsd-discuss-phase/
│   │   │   ├── SKILL.md                     # Interactive preference capture
│   │   │   └── templates/
│   │   │       └── context.md
│   │   │
│   │   ├── gsd-debug/
│   │   │   ├── SKILL.md                     # Scientific method debugging
│   │   │   └── templates/
│   │   │       └── debug-session.md
│   │   │
│   │   ├── gsd-map-codebase/
│   │   │   ├── SKILL.md                     # Parallel codebase analysis
│   │   │   └── templates/
│   │   │       └── codebase/
│   │   │
│   │   ├── gsd-quick/
│   │   │   ├── SKILL.md                     # Quick plan + execute
│   │   │   └── templates/
│   │   │       ├── plan.md
│   │   │       └── summary.md
│   │   │
│   │   ├── gsd-milestone/
│   │   │   ├── SKILL.md                     # new/audit/complete milestone
│   │   │   └── references/
│   │   │       └── milestone-workflow.md
│   │   │
│   │   └── gsd-research-phase/
│   │       └── SKILL.md                     # Standalone deep research
│   │
│   └── hooks/
│       ├── context-monitor.json             # PostToolUse context warning
│       └── session-start.json               # Update check
│
├── .gsd/                                    # GSD runtime (installed tooling)
│   ├── tools/
│   │   └── gsd-mcp-server.js               # MCP server wrapping gsd-tools.cjs logic
│   ├── hooks/
│   │   ├── context-monitor.js               # Hook script
│   │   └── check-update.js                  # Hook script
│   └── references/
│       ├── model-profiles.md
│       ├── ui-brand.md
│       └── phase-argument-parsing.md
│
├── .vscode/
│   └── mcp.json                             # MCP server registration
│
└── .planning/                               # Project state (unchanged from GSD)
    ├── PROJECT.md
    ├── REQUIREMENTS.md
    ├── ROADMAP.md
    ├── STATE.md
    ├── config.json
    ├── research/
    ├── phases/
    ├── quick/
    ├── debug/
    └── todos/
```

---

## 7. Migration Strategy

### Phase 1: Core Foundation (Minimal Viable Port)

**Goal:** Get the basic workflow working in Copilot.

1. **Create `copilot-instructions.md`** — Port the top-level GSD conventions
2. **Port simple commands** as `.prompt.md` files (help, progress, pause/resume, add-todo)
3. **Port 4 core agents** as `.agent.md` files:
   - `gsd-planner` — planning
   - `gsd-executor` — execution
   - `gsd-verifier` — verification
   - `gsd-debugger` — debugging
4. **Port `gsd-tools.cjs` as MCP server** — expose state, roadmap, phase, config, and commit operations as MCP tools
5. **Port templates** as skill assets
6. **Create `gsd-quick` skill** — simplest orchestration (plan + execute, no research/verify)

**Deliverable:** Users can run `/gsd-quick` to plan and execute ad-hoc tasks.

### Phase 2: Full Orchestration

**Goal:** Port the complete project lifecycle.

1. **Port remaining agents** (7 more `.agent.md` files)
2. **Create complex skills:**
   - `gsd-new-project` — full init workflow
   - `gsd-plan-phase` — research → plan → verify loop
   - `gsd-execute-phase` — sequential wave execution
   - `gsd-verify-work` — UAT + verification
3. **Port workflow files** as skill references
4. **Port hooks** — context monitor (PostToolUse), session start (update check)
5. **Create `gsd-map-codebase` skill** — codebase analysis with sequential mapper calls

**Deliverable:** Full GSD lifecycle works in Copilot (sequentially).

### Phase 3: Polish & Distribution

**Goal:** Production-ready distribution.

1. **Create installer** — `npx gsd-copilot` or degit-based install script
2. **Build VS Code extension** (optional) — status bar, GSD Explorer tree view, one-click profile switching
3. **Add `.instructions.md` files** with `applyTo` patterns for planning docs
4. **Test all workflows** end-to-end
5. **Write migration guide** for existing GSD/Claude Code users

---

## 8. Effort Estimate

| Component | Files | Effort | Notes |
|-----------|-------|--------|-------|
| Simple prompts (12) | 12 `.prompt.md` | Small | Near-mechanical translation |
| Agent definitions (11) | 11 `.agent.md` | Medium | Translate prompt engineering, adapt tool refs |
| Complex skills (10) | 10 `SKILL.md` + refs | Large | Rethink orchestration for sequential execution |
| MCP server | 1 server + schemas | Large | Rewrite gsd-tools CLI as MCP tool provider |
| Hooks | 2 hooks | Small-Medium | Depends on Copilot hook capability |
| Templates | 25 files | Small | Copy + path adjustments |
| References | 14 files | Small | Copy + remove Claude Code-specific refs |
| Instructions | 3-5 files | Small | New — GSD-aware file instructions |
| Installer | 1 script | Medium | New distribution mechanism |
| Testing | — | Medium | End-to-end workflow validation |

**Overall: Medium-Large project.** The bulk of the work is in the MCP server and the complex skill orchestration files.

---

## 9. What Gets Better in Copilot

| Aspect | Why |
|--------|-----|
| **IDE integration** | Copilot runs inside VS Code — file navigation, error squiggles, inline chat, and editor integration are native |
| **Multi-model support** | Copilot supports GPT-4.1, Claude, Gemini, and more — GSD is currently Claude-centric |
| **Visual feedback** | VS Code UI (tree views, notifications, webviews) is far richer than terminal output |
| **Extension ecosystem** | Can build a proper extension with settings UI, tree views, and keyboard shortcuts |
| **No `--dangerously-skip-permissions`** | Copilot's tool approval system is more granular and less scary |
| **Memory system** | Built-in persistent/session/repo memory — GSD built its own with STATE.md |
| **Todo tracking** | Native `manage_todo_list` — GSD built its own with TodoWrite |
| **Web search** | Built-in web + fetch tools — GSD requires Brave API configuration |
| **MCP ecosystem** | Rich ecosystem of MCP servers (GitHub, databases, etc.) |
| **Broader user base** | VS Code + Copilot has 10x+ the user base of Claude Code |

---

## 10. What Gets Worse in Copilot

| Aspect | Why |
|--------|-----|
| **No parallel subagents** | Wave-based parallel execution (GSD's killer feature for speed) is lost |
| **No context budget control** | Can't measure or inject warnings about context usage (may be possible via hooks — needs testing) |
| **No terminal statusline** | GSD's rich status display has no equivalent |
| **Model selection less dynamic** | Can't switch profiles without editing agent files |
| **Distribution** | No `npx` equivalent for Copilot customizations |
| **Hooks less capable** | Copilot hooks may not expose context metrics or support the same I/O contract |
| **Agent output parsing** | GSD agents return structured statuses; Copilot subagent returns are text blobs |
| **Subagent-to-orchestrator communication** | Less defined contract — needs convention enforcement |
| **Maturity** | GSD's orchestration patterns are battle-tested for Claude Code; Copilot agent orchestration is newer |

---

## 11. Conclusion

### Can it be ported? **Yes.**

The core GSD concepts — file-based state, agent specialization, goal-backward verification, context isolation via subagents — all have Copilot equivalents. The `.planning/` directory and markdown artifact pipeline work identically regardless of the AI runtime.

### Should it be ported? **Yes, with caveats.**

The port makes GSD accessible to the much larger VS Code + Copilot user base. The main tradeoff is losing parallel execution, which affects speed but not quality. The context engineering benefits (fresh subagent windows, structured state, verification loops) transfer fully.

### What's the recommended approach?

1. **Start with the MCP server** — it's the foundation. Port `gsd-tools.cjs` to an MCP tool provider.
2. **Port agents first, skills second** — agents are 1:1 translations; skills require orchestration redesign.
3. **Ship Phase 1 quickly** — `gsd-quick` alone provides immediate value.
4. **Accept sequential execution** — don't try to hack parallel subagents. The quality guarantees are what matter.
5. **Invest in the VS Code extension later** — status bar, tree views, profile switching UI. This is where Copilot can surpass Claude Code.

### The bottom line

GSD's innovation isn't in Claude Code integration — it's in the **workflow design**: atomic plans, fresh context per task, goal-backward verification, file-based persistent state. These patterns are platform-agnostic. The port is an architecture adaptation, not a ground-up rewrite.
