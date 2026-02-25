# Phase 1 Supplementary Specs

These specs fill the gaps identified in the Phase 1 plan. Read these alongside `phase-1-core-foundation.md`.

---

## Supplement A: Tool Name Mapping Table

Explicit mapping from Claude Code tool names to VS Code Copilot equivalents. Every agent and workflow file uses the left column; the port must substitute the right column.

### Core Tool Mapping

| Claude Code Tool | Copilot Equivalent | Notes |
|---|---|---|
| `Read` / `Read(path)` | `read_file` (built-in) | Same semantics. Copilot's version requires line ranges; agents should read generously. |
| `Write(path, content)` | `create_file` (built-in) | For new files only. Use `replace_string_in_file` for existing files. |
| `Edit(path, old, new)` | `replace_string_in_file` (built-in) | Same semantics — exact string match replacement. |
| `Bash(command)` | `run_in_terminal` (built-in) | **Key difference:** Copilot's terminal is persistent (shared CWD). Commands aren't isolated. Agent instructions must not assume fresh shell per call. |
| `Glob(pattern)` | `file_search` (built-in) | Copilot uses glob patterns, not full glob expansion. Pattern syntax differs slightly. |
| `Grep(pattern, path?)` | `grep_search` (built-in) | Copilot's version supports `includePattern` for file filtering. Regex syntax is the same. |
| `WebFetch(url)` | `fetch_webpage` (deferred tool) | Must load via `tool_search_tool_regex` before use. Returns rendered text, not raw HTML. |
| `WebSearch(query)` | Not available natively | Use `fetch_webpage` with a search engine URL, or drop this dependency. The planner uses this for API docs — substitute with `semantic_search` on local context or skip. |
| `Task(prompt, subagent_type, model)` | **See Supplement B** | No direct equivalent. This is the architectural crux. |
| `AskUserQuestion(header, question)` | Chat follow-up prompting | Copilot agents can ask questions by outputting text and waiting for user response. There is no structured `AskUserQuestion` API. Agent instructions should say: "Ask the user: {question}" and expect the next message to be the answer. |
| `TodoRead` / `TodoWrite` | `manage_todo_list` (built-in) | Copilot has a native todo tool for tracking in-progress work. Same concept, different API shape. |
| `mcp__context7__*` | Drop or replace with MCP | The planner uses Context7 for external library docs. Options: (a) configure Context7 MCP in `.vscode/mcp.json` if the user has it, (b) fall back to `fetch_webpage` for docs, (c) remove — most plans don't strictly need it. **Recommendation:** Make it optional. If `mcp__context7__resolve-library-id` is available, use it. Otherwise skip. |

### Tool Declaration Mapping

Claude Code agents declare tools in YAML frontmatter:
```yaml
tools: Read, Write, Edit, Bash, Grep, Glob
```

Copilot agents declare tools differently:
```yaml
tools: [read, edit, execute, search, createFile]
```

**Translation table for frontmatter `tools:` values:**

| Claude `tools:` value | Copilot `tools:` value |
|---|---|
| `Read` | `read` |
| `Write` | `createFile` |
| `Edit` | `edit` |
| `Bash` | `execute` |
| `Glob` | `search` |
| `Grep` | `search` |
| `WebFetch` | `web` |
| `Task` | `agent` |
| `AskUserQuestion` | (implicit — all agents can prompt) |
| `mcp__context7__*` | (omit — optional MCP) |

### MCP Tool Prefix Change

Claude Code calls gsd-tools via Bash:
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs state load
```

Copilot calls gsd-tools via MCP tool invocation:
```
gsd_state_load()
```

**In agent/workflow text, replace all instances of:**
- `node ~/.claude/get-shit-done/bin/gsd-tools.cjs <command> <subcommand> [args]` → `gsd_{command}_{subcommand}({args as JSON})`
- `INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs init ...)` → "Call `gsd_init_*` MCP tool and use the returned JSON"
- `$(node gsd-tools.cjs ...)` → equivalent MCP tool call

### Path Reference Changes

| Claude Code Path | Copilot Path | Notes |
|---|---|---|
| `~/.claude/get-shit-done/` | `.gsd/` (workspace-local) | Runtime files installed per-workspace |
| `~/.claude/agents/gsd-*.md` | `.github/agents/gsd-*.agent.md` | Agent definitions |
| `~/.claude/get-shit-done/workflows/*.md` | Referenced inline in skills/prompts | Workflows are inlined into skill SKILL.md files or prompt.md files, not separate |
| `~/.claude/get-shit-done/references/*.md` | `.gsd/references/*.md` | Same content, local path |
| `~/.claude/get-shit-done/templates/*.md` | `.gsd/templates/*.md` | Same content, local path |
| `./CLAUDE.md` | `.github/copilot-instructions.md` | Project-wide instructions |
| `.agents/skills/` | `.github/skills/` | Project skills directory |

---

## Supplement B: Subagent Invocation Mechanism

### The Problem

Claude Code's `Task()` API spawns an independent agent with:
- Its own context window
- A specific agent type (loads that agent's system prompt)
- A specific model
- A prompt
- Returns a result string when done

VS Code Copilot has **no equivalent**. There is no API to programmatically spawn a new agent chat, wait for it, and capture results.

### The Solution: Inline Agent Instructions via Skill Orchestration

Instead of spawning subagents, the orchestrating skill (e.g., `gsd-quick`) **sequentially invokes agent behavior by inlining their instructions** into the current conversation context.

**Architecture:**

```
User runs /gsd-quick "Add health check"
    │
    ▼
SKILL.md (gsd-quick) orchestrates the full flow in ONE conversation:
    │
    ├── Phase 1: Load context (MCP tools)
    │
    ├── Phase 2: PLAN (inline gsd-planner instructions)
    │   └── Read .github/agents/gsd-planner.agent.md
    │   └── Follow its instructions to produce PLAN.md
    │
    ├── Phase 3: CHECK (inline gsd-plan-checker instructions)  [if --full]
    │   └── Read .github/agents/gsd-plan-checker.agent.md
    │   └── Follow its instructions to verify the plan
    │
    ├── Phase 4: EXECUTE (inline gsd-executor instructions)
    │   └── Read .github/agents/gsd-executor.agent.md
    │   └── Follow its instructions to implement + commit
    │
    └── Phase 5: VERIFY (inline gsd-verifier instructions)  [if --full]
        └── Read .github/agents/gsd-verifier.agent.md
        └── Follow its instructions to verify results
```

### How It Works in Practice

The skill's `SKILL.md` will contain orchestration steps like:

```markdown
## Step 5: Plan the Task

Read the file `.github/agents/gsd-planner.agent.md` to load the planner's 
role, constraints, and methodology.

Then, acting as the planner, create a plan following those instructions:
- Mode: quick
- Directory: {task_dir}
- Description: {description}
- Constraints: Single plan, 1-3 tasks, no research phase

Write the plan to `{task_dir}/{num}-PLAN.md`.

## Step 6: Execute the Plan

Read the file `.github/agents/gsd-executor.agent.md` to load the executor's
role, constraints, and methodology.

Then, acting as the executor, implement the plan following those instructions:
- Plan file: `{task_dir}/{num}-PLAN.md`
- Commit each task atomically using `gsd_commit` MCP tool
- Write summary to `{task_dir}/{num}-SUMMARY.md`
```

### Key Design Decisions

1. **Single conversation context** — Unlike Claude Code which gives each subagent a fresh context window, Copilot runs everything in one conversation. This means:
   - Context accumulates. The planner's output is visible to the executor.
   - This is actually **better** for quick tasks (less context setup overhead).
   - For large phase execution, context pressure is higher. Mitigate by keeping agent instructions focused.

2. **Agent .md files become reference documents** — The `.agent.md` files are still written as standalone agent personas, but they're consumed as instruction sets read mid-conversation rather than as agent system prompts.

3. **`user-invocable: false` still matters** — Setting this prevents users from directly `@gsd-planner`-ing in chat. The agents are only activated via skill orchestration.

4. **No parallel subagents** — Claude Code's `run_in_background=true` for parallel subagent execution (used in `new-project`, `map-codebase`) has no equivalent. Phase 1 doesn't need this (quick tasks are sequential). Later phases can explore:
   - Sequential execution with progress updates
   - VS Code tasks API for parallel terminal commands
   - Multiple MCP tool calls (but not for agent-like work)

5. **Model selection is advisory** — The `.agent.md` frontmatter lists `model: [claude-sonnet-4, gpt-4.1]` as preferences. Copilot uses whatever model the user has selected. The model profile system (`core.cjs` MODEL_PROFILES) becomes informational — it tells the user which model tier is recommended, but can't enforce it.

### What Changes from Claude Code Workflows

| Claude Code Pattern | Copilot Pattern |
|---|---|
| `Task(prompt, subagent_type="gsd-planner")` | "Read `.github/agents/gsd-planner.agent.md` and follow its instructions to..." |
| `Task(prompt, model="{planner_model}")` | (model is whatever user selected; note recommended model in output) |
| `run_in_background=true` for parallel agents | Sequential execution only |
| Subagent returns result string | Plan/summary files on disk serve as the "return value" |
| Each subagent has fresh context | Shared context — agents see each other's work |
| `subagent_type="general-purpose"` for revision | "Revise the plan following the planner instructions from Step 5" |

### Impact on Agent File Content

Agent `.md` files need these adaptations:

1. **Remove `Bash(node gsd-tools.cjs ...)` patterns** — Replace with MCP tool call instructions
2. **Remove `Read ~/.claude/agents/...` self-references** — The agent is already loaded
3. **Remove `Read ./CLAUDE.md`** — This is `.github/copilot-instructions.md` and is auto-loaded
4. **Replace `<files_to_read>` blocks** — Instead of "read these files before starting", use: "The following files contain your context: ..." (the skill pre-reads them)
5. **Keep all prompt engineering** — Goal-backward methodology, deviation rules, verification dimensions, etc. are portable as-is
6. **Keep structured output formats** — `## PLANNING COMPLETE`, `## EXECUTION COMPLETE` markers are used by the orchestrating skill to detect phase completion

---

## Supplement C: MCP Server Internal Architecture

### Decision: Port, Don't Rewrite

The existing `gsd-tools.cjs` lib code is well-structured and tested. Porting it directly into the MCP server minimizes bugs and preserves battle-tested behavioral details (regex patterns, edge cases, defaults).

**Strategy:** The MCP server imports the existing lib modules and wraps them as MCP tool handlers.

### Architecture

```
.gsd/tools/
├── gsd-mcp-server.js          ← Entry point: MCP JSON-RPC stdio server
├── lib/
│   ├── core.js                 ← Port of core.cjs (shared utils, config, phase finding)
│   ├── state.js                ← Port of state.cjs (STATE.md CRUD)
│   ├── config.js               ← Port of config.cjs (config.json CRUD)
│   ├── init.js                 ← Port of init.cjs (context assembly)
│   ├── roadmap.js              ← Port of roadmap.cjs (ROADMAP.md parsing)
│   ├── phase.js                ← Port of phase.cjs (phase CRUD + renumbering)
│   ├── frontmatter.js          ← Port of frontmatter.cjs (YAML frontmatter engine)
│   ├── commands.js             ← Port of commands.cjs (git, progress, summary)
│   └── template.js             ← Port of template.cjs (variable substitution)
└── package.json                ← { "type": "module" } or keep CJS
```

### Port Approach Per Module

#### `core.js` (from `core.cjs`, 359 lines) — **Port fully, adapt output**

This is the foundation. Every other module depends on it.

**Port as-is:**
- `loadConfig(cwd)` — config.json loading with defaults and nested field resolution
- `findPhaseInternal(cwd, phase)` — phase directory discovery with archive search
- `searchPhaseInDir(baseDir, relBase, normalized)` — directory scanning and plan/summary inventory
- `normalizePhaseName(phase)` — phase number normalization (e.g., "1" → "01", "12A.1" → "12A.1")
- `comparePhaseNum(a, b)` — phase number comparison for sorting
- `getRoadmapPhaseInternal(cwd, phase)` — extract phase section from ROADMAP.md
- `resolveModelInternal(cwd, agentType)` — model profile resolution
- `getMilestoneInfo(cwd)` — milestone version/name extraction
- `getArchivedPhaseDirs(cwd)` — archived phase directory listing
- `generateSlugInternal(text)` — URL-safe slug generation
- `pathExistsInternal(cwd, relPath)` — file existence check
- `safeReadFile(filePath)` — safe file read returning null on error
- `escapeRegex(value)` — regex escaping
- `isGitIgnored(cwd, targetPath)` — git ignore check
- `execGit(cwd, args)` — safe git command execution

**Adapt:**
- `output(result, raw, rawValue)` → **Remove.** MCP handlers return JSON directly, no stdout writing.
- `error(message)` → **Remove.** MCP handlers throw errors or return error responses.
- `MODEL_PROFILES` table → **Keep but make informational.** Copilot doesn't enforce model per agent.
- File path: `~/.claude/` references → workspace-relative `.gsd/` paths
- Large payload tmpfile hack (>50KB) → **Remove.** MCP has no buffer limit.
- `execGit` shell escaping → **Review for Windows compatibility.** The current escaping uses single quotes which don't work in PowerShell/cmd. Use `child_process.execFileSync` with args array instead of string concatenation.

**Windows compatibility note:** The existing `execGit` uses shell string concatenation with single-quote escaping that only works on Unix. For the MCP server running on Windows, use:
```js
const { execFileSync } = require('child_process');
function execGit(cwd, args) {
  try {
    const stdout = execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: 'pipe' });
    return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    return { exitCode: err.status ?? 1, stdout: (err.stdout ?? '').toString().trim(), stderr: (err.stderr ?? '').toString().trim() };
  }
}
```

#### `frontmatter.js` (from `frontmatter.cjs`, 270 lines) — **Port fully**

Used by state, roadmap, plan verification, template filling. It's a dependency of multiple modules.

**Port as-is:**
- `extractFrontmatter(content)` — YAML frontmatter parser (custom, no external deps)
- `reconstructFrontmatter(obj)` — YAML serialization
- `spliceFrontmatter(content, newObj)` — replace frontmatter in content
- `parseMustHavesBlock(content, blockName)` — specialized must_haves parser

**Port the CRUD commands as MCP tools:**

| MCP Tool | Source Function | Input | Output |
|---|---|---|---|
| `gsd_frontmatter_get` | `cmdFrontmatterGet` | `{file, field?}` | Frontmatter JSON |
| `gsd_frontmatter_set` | `cmdFrontmatterSet` | `{file, field, value}` | `{updated: true}` |
| `gsd_frontmatter_merge` | `cmdFrontmatterMerge` | `{file, data}` | `{updated: true}` |
| `gsd_frontmatter_validate` | `cmdFrontmatterValidate` | `{file, schema}` | `{valid, errors[]}` |

#### `state.js` (from `state.cjs`, 440 lines) — **Port fully**

**MCP tools from this module:**

| MCP Tool | Source Function | Complexity | Notes |
|---|---|---|---|
| `gsd_state_load` | `cmdStateLoad` | Low | Reads STATE.md + config, returns JSON blob |
| `gsd_state_get` | `cmdStateGet` | Low | Extract field or section from STATE.md |
| `gsd_state_update` | `cmdStateUpdate` | Low | Update single `**Field:**` value |
| `gsd_state_patch` | `cmdStatePatch` | Low | Batch update multiple fields |
| `gsd_state_snapshot` | `cmdStateSnapshot` | Medium | Full structured parse of STATE.md |
| `gsd_state_advance_plan` | `cmdStateAdvancePlan` | Medium | Increment current plan, handle phase completion |
| `gsd_state_record_metric` | `cmdStateRecordMetric` | Low | Append row to performance metrics table |
| `gsd_state_update_progress` | `cmdStateUpdateProgress` | Medium | Recount plans/summaries, update progress bar |
| `gsd_state_add_decision` | `cmdStateAddDecision` | Low | Append to decisions section |
| `gsd_state_add_blocker` | `cmdStateAddBlocker` | Low | Append to blockers section |
| `gsd_state_resolve_blocker` | `cmdStateResolveBlocker` | Low | Remove from blockers section |
| `gsd_state_record_session` | `cmdStateRecordSession` | Low | Update session timestamps |

**Note:** The original Phase 1 plan listed only 4 state tools (`load`, `update`, `patch`, `snapshot`). The full module has 12 commands. For Phase 1, prioritize:
- **Must have:** `load`, `update`, `patch`, `snapshot`, `advance_plan`, `update_progress`
- **Can defer:** `record_metric`, `add_decision`, `add_blocker`, `resolve_blocker`, `record_session` (these are used by agents but the agent instructions can be adapted to use `gsd_state_update` directly)

#### `config.js` (from `config.cjs`, 141 lines) — **Port fully**

Simplest module. Three tools:
- `gsd_config_ensure` — creates `.planning/config.json` with defaults
- `gsd_config_set` — set a config value (supports dot notation)
- `gsd_config_load` — actually in `core.js` as `loadConfig()`

**Adaptation:** The Brave Search detection (`~/.gsd/brave_api_key`) and global defaults (`~/.gsd/defaults.json`) are Claude Code-specific paths. Change to:
- Environment variable `BRAVE_API_KEY` only (drop the file check)
- Global defaults from `~/.gsd/defaults.json` → keep same path (GSD global config)

#### `init.js` (from `init.cjs`, 587 lines) — **Port the 6 Phase-1 functions**

Each "init" function is a context assembler that calls 3-5 core functions and returns a fat JSON blob.

**Phase 1 functions to port:**

| MCP Tool | Source Function | Depends On | Lines |
|---|---|---|---|
| `gsd_init_quick` | `cmdInitQuick` | `loadConfig`, `resolveModelInternal`, `generateSlugInternal`, `pathExistsInternal` | ~40 |
| `gsd_init_progress` | `cmdInitProgress` | `loadConfig`, `findPhaseInternal`, `getRoadmapPhaseInternal` | ~50 |
| `gsd_init_resume` | `cmdInitResume` | `loadConfig`, `pathExistsInternal` | ~25 |
| `gsd_init_todos` | `cmdInitTodos` | `loadConfig`, `pathExistsInternal` | ~50 |
| `gsd_init_phase_op` | `cmdInitPhaseOp` | `loadConfig`, `findPhaseInternal`, `getRoadmapPhaseInternal`, `pathExistsInternal` | ~60 |
| `gsd_init_execute_phase` | `cmdInitExecutePhase` | `loadConfig`, `findPhaseInternal`, `getRoadmapPhaseInternal`, `resolveModelInternal`, `getMilestoneInfo`, `generateSlugInternal`, `pathExistsInternal` | ~65 |

**Defer to Phase 2+:**
- `cmdInitNewProject` — brownfield detection uses Unix `find` command
- `cmdInitNewMilestone`
- `cmdInitMapCodebase`
- `cmdInitPlanPhase`
- `cmdInitVerifyWork`
- `cmdInitMilestoneOp`

**Adaptation:** `cmdInitNewProject` uses `execSync('find ...')` for brownfield detection — this is Unix-only. The MCP port needs Windows support. Replace with `fs.readdirSync` recursive scan or `glob` pattern.

#### `roadmap.js` (from `roadmap.cjs`, 249 lines) — **Port analyze + get-phase**

| MCP Tool | Source Function | Notes |
|---|---|---|
| `gsd_roadmap_analyze` | `cmdRoadmapAnalyze` | Parses ROADMAP.md, cross-references disk for plan/summary counts |
| `gsd_roadmap_get_phase` | `cmdRoadmapGetPhase` | Thin wrapper around `getRoadmapPhaseInternal` in core |
| `gsd_roadmap_update_progress` | `cmdRoadmapUpdateProgress` | Updates progress table row — **defer, not needed Phase 1** |

#### `phase.js` (from `phase.cjs`, 731 lines) — **Port add/remove/insert**

| MCP Tool | Source Function | Complexity | Notes |
|---|---|---|---|
| `gsd_phase_add` | `cmdPhaseAdd` | Medium | Appends phase to ROADMAP.md + creates directory |
| `gsd_phase_remove` | `cmdPhaseRemove` | High | Removes phase, renumbers all subsequent dirs + ROADMAP entries |
| `gsd_phase_insert` | `cmdPhaseInsert` | Medium | Calculates decimal phase number, creates directory |
| `gsd_phase_complete` | `cmdPhaseComplete` | Medium | Marks done, updates state + roadmap — **defer if not needed for quick** |

**Note:** Phase renumbering (`cmdPhaseRemove`) is the most complex operation — it renames directories and rewrites ROADMAP.md section headers. Port carefully and test thoroughly.

#### `commands.js` (from `commands.cjs`, 466 lines) — **Port 4 utilities**

| MCP Tool | Source Function | Notes |
|---|---|---|
| `gsd_commit` | `cmdCommit` | Stages files + commits with message. Core to every workflow. |
| `gsd_progress_bar` | `cmdProgress` | ASCII progress rendering |
| `gsd_summary_extract` | `cmdSummaryExtract` | Extracts structured data from SUMMARY.md files |
| `gsd_generate_slug` | utility in core | URL-safe slug generation |
| `gsd_current_timestamp` | utility | ISO timestamp in various formats |

#### `template.js` (from `template.cjs`, 204 lines) — **Defer to Phase 2**

Template variable substitution is used by scaffold commands (`scaffold context`, `scaffold uat`). Phase 1 doesn't need it — the quick skill creates files directly.

### MCP Server Entry Point Design

```js
// gsd-mcp-server.js — stdio MCP server
//
// Protocol: JSON-RPC 2.0 over stdin/stdout
// Follows: Model Context Protocol specification
//
// Lifecycle:
// 1. VS Code starts this process when mcp.json is loaded
// 2. Server responds to `initialize` with capabilities + tool list
// 3. Server handles `tools/call` requests
// 4. Server exits when stdin closes

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Import ported lib modules
import * as state from './lib/state.js';
import * as config from './lib/config.js';
import * as init from './lib/init.js';
import * as roadmap from './lib/roadmap.js';
import * as phase from './lib/phase.js';
import * as commands from './lib/commands.js';
import * as frontmatter from './lib/frontmatter.js';

const server = new Server({ name: 'gsd-tools', version: '1.0.0' }, {
  capabilities: { tools: {} }
});

// Tool registry: name → { schema, handler }
const tools = {
  gsd_state_load: {
    description: 'Load project state (STATE.md + config)',
    inputSchema: { type: 'object', properties: {} },
    handler: (args) => state.load(process.cwd())
  },
  gsd_state_update: {
    description: 'Update a field in STATE.md',
    inputSchema: {
      type: 'object',
      properties: {
        field: { type: 'string', description: 'The **Field:** name to update' },
        value: { type: 'string', description: 'New value' }
      },
      required: ['field', 'value']
    },
    handler: (args) => state.update(process.cwd(), args.field, args.value)
  },
  // ... register all tools following this pattern
};

// Handle tools/list
server.setRequestHandler('tools/list', () => ({
  tools: Object.entries(tools).map(([name, t]) => ({
    name,
    description: t.description,
    inputSchema: t.inputSchema
  }))
}));

// Handle tools/call
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  const tool = tools[name];
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  const result = await tool.handler(args || {});
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});

// Start
const transport = new StdioServerTransport();
await server.connect(transport);
```

### CWD Resolution

**Important:** The MCP server runs as a child process of VS Code. Its `process.cwd()` may not be the workspace root. The server must:

1. Accept `cwd` from client via tool arguments, OR
2. Use an environment variable set in `mcp.json`: `"env": { "GSD_WORKSPACE": "${workspaceFolder}" }`

**Recommendation:** Use option 2. In `mcp.json`:
```json
{
  "servers": {
    "gsd-tools": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/.gsd/tools/gsd-mcp-server.js"],
      "env": {
        "GSD_WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
```

Then in server: `const cwd = process.env.GSD_WORKSPACE || process.cwd();`

### Dependencies

The MCP server needs one npm dependency:
- `@modelcontextprotocol/sdk` — MCP protocol handling

Everything else is Node built-ins (`fs`, `path`, `child_process`).

Install strategy: `.gsd/tools/package.json` with `npm install` during GSD setup. Or bundle the SDK.

### Phase 1 Tool Count

| Module | Tools | Priority |
|---|---|---|
| state | 6 (of 12) | Must have |
| config | 3 | Must have |
| init | 6 | Must have |
| roadmap | 2 | Must have |
| phase | 3 | Must have |
| commands | 5 | Must have |
| frontmatter | 4 | Nice to have |
| **Total** | **29** | |

---

## Supplement D: Hook Mechanism Feasibility

### Claude Code Hooks vs. Copilot Chat Hooks

**Claude Code** supports three hook events:
- `PreToolUse` — runs before each tool call
- `PostToolUse` — runs after each tool call
- `Notification` — runs on status changes

The GSD context monitor uses `PostToolUse` to inject warnings when context usage is high.

**VS Code Copilot** (as of Feb 2026) supports:
- `.github/hooks/` directory with JSON hook definitions
- Event types vary by Copilot version

### Assessment

The context monitor hook depends on two things:
1. **Context window metrics** — Claude Code passes `remaining_percentage` in the hook input. Copilot may or may not expose this.
2. **`PostToolUse` event** — hooks fire after every tool call.

### Recommendation: Defer to Phase 2

The context monitor is a **nice-to-have**, not a blocker. The existing Claude Code implementation also depends on a statusline bridge file (`/tmp/claude-ctx-{session}.json`) written by a separate `Statusline` hook — an event type that doesn't exist in Copilot.

**For Phase 1:**
- Skip the context monitor hook entirely
- Add a manual context note in `copilot-instructions.md`: "If the conversation is getting long, consider using `/gsd-pause-work` to save state"
- Revisit in Phase 2 when Copilot's hook API is better understood

**If hooks ARE available in Copilot** (verify at implementation time):
- Port the context monitor as-is
- Replace the statusline bridge with direct hook input parsing
- The core logic (threshold checking, debouncing, message crafting) ports 1:1

### What to Verify at Implementation Time

1. Does `.github/hooks/` work? Create a simple test hook and check if it fires.
2. What data does the hook input JSON contain? Log it to a file and inspect.
3. Is `PostToolUse` a valid event name? Or is it something else like `onToolResult`?

---

## Supplement E: Missing MCP Tools Not in Original Plan

The Phase 1 plan's Step 3 listed tools organized by module but missed several that agents actively use. These are additional tools needed for Phase 1 completeness:

### State Tools (missed)

| Tool | Used By | Reason |
|---|---|---|
| `gsd_state_get` | progress, resume, pause-work | Reading specific STATE.md fields |
| `gsd_state_advance_plan` | executor | Moving to next plan after completion |
| `gsd_state_update_progress` | executor, quick | Recalculating progress bar |

### Frontmatter Tools (missed entirely)

| Tool | Used By | Reason |
|---|---|---|
| `gsd_frontmatter_get` | planner, executor, verifier | Reading plan/summary metadata |
| `gsd_frontmatter_set` | executor | Marking plan `completed: true` |
| `gsd_frontmatter_merge` | executor | Batch-updating summary frontmatter |
| `gsd_frontmatter_validate` | plan-checker | Validating plan structure |

### Init Tools (missed)

| Tool | Used By | Reason |
|---|---|---|
| `gsd_init_execute_phase` | executor skill | Loading execution context (models, paths, plan inventory) |

### Utility Tools (clarification)

| Tool | Source | Used By |
|---|---|---|
| `gsd_verify_path_exists` | `core.pathExistsInternal` | Multiple workflows for file checks |
| `gsd_list_todos` | `init.cmdInitTodos` subset | check-todos, add-todo prompts |
| `gsd_todo_complete` | `commands.js` | Moving todo from pending to completed |

---

## Supplement F: Recommended Implementation Order

Given dependencies, implement Phase 1 in this order:

```
Step 1  → Scaffold                    (no deps, 15 min)
Step 2  → copilot-instructions.md     (no deps, 30 min)
Step 9  → .instructions.md files      (no deps, 15 min)
Step 7  → Templates                   (no deps, 30 min)
Step 8  → References                  (no deps, 30 min)
Step 3a → MCP server scaffold         (no deps, 1-2 hrs)
Step 3  → core.js (MUST BE FIRST LIB) (need scaffold)
         → frontmatter.js             (needs core)
         → config.js                  (needs core)
         → state.js                   (needs core)
         → commands.js                (needs core)
         → roadmap.js                 (needs core)
         → phase.js                   (needs core)
         → init.js                    (needs ALL above)
Step 3i → Register MCP in mcp.json   (needs server)
         → Test MCP tools manually
Step 4  → Simple .prompt.md files     (needs MCP working)
Step 5  → Agent .agent.md files       (needs tool mapping done)
Step 6  → gsd-quick SKILL.md          (needs agents + MCP)
Step 10 → Hook (defer or skip)
Step 11 → Integration test
```

**Critical path:** `core.js → [all lib modules] → init.js → MCP server working → skill orchestration`
