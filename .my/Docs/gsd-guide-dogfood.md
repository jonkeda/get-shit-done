# GSD Dogfooding & Manual Testing Guide

How to use GSD (Get Shit Done) on itself — or on any test project — for manual testing and dogfooding.

---

## Prerequisites

- **VS Code** with GitHub Copilot extension (agent mode enabled)
- **Node.js** 16.7+
- **Git** with `user.name` and `user.email` configured

---

## 1. Creating a New GSD Project

### 1a. Fresh / Greenfield Project

1. Open (or create) a folder for your test project in VS Code.
2. Install GSD into the workspace:

   ```
   npx gsd-copilot@latest
   ```

   This copies agents, skills, prompts to `.github/`, sets up the MCP server in `.gsd/`, and configures `.vscode/mcp.json`.

3. Open Copilot Chat (agent mode) and run:

   ```
   /gsd-new-project
   ```

   GSD interviews you about: project goals, tech stack, constraints, scope. After the interview it runs research, generates requirements, and builds a phased roadmap.

4. After completion, check that these files were created:

   | File | Purpose |
   |------|---------|
   | `.planning/PROJECT.md` | Project definition & vision |
   | `.planning/REQUIREMENTS.md` | Requirement specs with REQ-IDs |
   | `.planning/ROADMAP.md` | Phased execution roadmap |
   | `.planning/STATE.md` | Current position & context tracker |
   | `.planning/config.json` | Workflow configuration |

5. Proceed to the phase workflow (see section 3).

### 1b. Brownfield / Existing Codebase

If you already have code in the workspace:

1. Install GSD (`npx gsd-copilot@latest`).
2. Map the existing codebase first:

   ```
   /gsd-map-codebase
   ```

   This spawns parallel mapper agents that analyse your code and produce structured docs in `.planning/codebase/`:

   | File | Content |
   |------|---------|
   | `STACK.md` | Languages, frameworks, dependencies |
   | `ARCHITECTURE.md` | Structure, patterns, data flow |
   | `CONVENTIONS.md` | Coding style, naming, patterns in use |
   | `CONCERNS.md` | Tech debt, risks, fragile areas |
   | + additional docs | Per-subsystem analyses if applicable |

3. Then run `/gsd-new-project` — GSD incorporates the codebase analysis into its questions and planning.

### 1c. Auto Mode (From a Document)

If you have a PRD or idea document:

```
/gsd-new-project --auto @idea.md
```

After config questions, it runs research → requirements → roadmap without further interaction.

---

## 2. Files You Can See

### `.planning/` Directory (the brain)

After project init and as you work through phases, the `.planning/` directory accumulates:

```
.planning/
├── STATE.md                          ← Current position, blockers, decisions
├── PROJECT.md                        ← Project definition & vision
├── REQUIREMENTS.md                   ← Requirement specs (REQ-001, REQ-002, …)
├── ROADMAP.md                        ← Phase breakdown with status
├── config.json                       ← Workflow settings
├── codebase/                         ← (brownfield only) Codebase analysis
│   ├── STACK.md
│   ├── ARCHITECTURE.md
│   ├── CONVENTIONS.md
│   └── CONCERNS.md
├── research/                         ← Domain research from new-project
│   └── *.md
├── phases/
│   ├── 01-some-phase/
│   │   ├── 01-CONTEXT.md             ← User decisions for this phase
│   │   ├── 01-RESEARCH.md            ← Research findings
│   │   ├── 01-01-PLAN.md             ← Execution plan (task-by-task)
│   │   ├── 01-01-SUMMARY.md          ← Execution results
│   │   ├── 01-VALIDATION.md          ← Automated test mapping
│   │   ├── 01-VERIFICATION.md        ← Post-execution verification
│   │   └── 01-UAT.md                 ← User acceptance testing results
│   ├── 02-another-phase/
│   │   └── ...
│   └── ...
├── quick/                            ← Quick task plans & summaries
│   └── *.md
└── milestones/                       ← Archived completed milestones
    └── *.md
```

### `.gsd/` Directory (the engine)

Contains the MCP server and tool library. Normally you don't edit these, but useful to know:

```
.gsd/
├── tools/
│   └── lib/                          ← MCP tool implementations (JS)
└── mcp-server/                       ← MCP server entry point
```

### `.github/` Additions

GSD adds its agent definitions, skills, and prompt commands here:

```
.github/
├── copilot-instructions.md           ← Project-level Copilot instructions
├── agents/                           ← Agent definitions (executor, planner, etc.)
├── skills/                           ← Skill definitions (per-workflow)
├── instructions/                     ← Instruction files for planning docs
└── prompts/                          ← Slash command definitions
```

### `.vscode/mcp.json`

Configures Copilot to connect to the GSD MCP server.

---

## 3. Phase-by-Phase Workflow

This is the core loop you repeat for each phase:

### Step 1: Check Progress

```
/gsd-progress
```

Shows current milestone, phase status, and routes you to the next action.

### Step 2: Discuss the Phase (Optional but Recommended)

```
/gsd-discuss-phase 1
```

GSD asks targeted questions about your preferences for this phase (libraries, patterns, trade-offs). Saves answers to `{NN}-CONTEXT.md`. The planner will respect these decisions.

### Step 3: Plan the Phase

```
/gsd-plan-phase 1
```

Spawns parallel researchers, then a planner, then a plan-checker. Produces:
- `{NN}-RESEARCH.md` — findings
- `{NN}-{MM}-PLAN.md` — one or more execution plans with task breakdowns
- `{NN}-VALIDATION.md` — test coverage mapping

### Step 4: Execute the Phase

```
/gsd-execute-phase 1
```

Executes plans in dependency-ordered waves. Each task gets an atomic commit. Produces:
- `{NN}-{MM}-SUMMARY.md` — what was done per plan
- `{NN}-VERIFICATION.md` — automated verification results

### Step 5: Verify the Work

```
/gsd-verify-work 1
```

Interactive UAT — walks you through each deliverable one by one. If issues are found, diagnoses them and creates fix plans. Produces:
- `{NN}-UAT.md` — test results

### Step 6: Next Phase

Repeat from Step 1. When all phases are done:

```
/gsd-audit-milestone       ← Check cross-phase integration
/gsd-complete-milestone    ← Archive and tag
```

---

## 4. Dogfooding & Manual Test Scenarios

### Quick Smoke Test

Run through the minimum viable workflow to verify core functionality:

1. Create a throwaway folder, install GSD.
2. `/gsd-new-project` — answer questions, verify all 5 output files created.
3. `/gsd-plan-phase 1` — verify RESEARCH.md and PLAN.md produced.
4. `/gsd-execute-phase 1` — verify code committed, SUMMARY.md produced.
5. `/gsd-verify-work 1` — run through UAT flow.
6. `/gsd-progress` — confirm state is accurate.

### Testing Specific Commands

| What to Test | Command | What to Check |
|---|---|---|
| Project init | `/gsd-new-project` | All `.planning/` files created, STATE.md accurate |
| Codebase mapping | `/gsd-map-codebase` | `.planning/codebase/` docs created |
| Phase discussion | `/gsd-discuss-phase 1` | CONTEXT.md written with your decisions |
| Phase planning | `/gsd-plan-phase 1` | RESEARCH.md, PLAN.md, VALIDATION.md created |
| Phase execution | `/gsd-execute-phase 1` | Code committed, SUMMARY.md accurate |
| Verification | `/gsd-verify-work 1` | UAT.md created, issues diagnosed if any |
| Quick task | `/gsd-quick "add X"` | Task planned, executed, committed, STATE.md updated |
| Debugging | `/gsd-debug "symptom"` | Debug session created, hypothesis tracked |
| Pause/resume | `/gsd-pause-work` then `/gsd-resume-work` | Context restored accurately |
| Health check | `/gsd-health` | No false positives, detects real issues |
| Phase management | `/gsd-add-phase "desc"` | Phase appended to ROADMAP.md |
| Phase insertion | `/gsd-insert-phase 2 "urgent fix"` | Decimal phase inserted correctly |
| Phase removal | `/gsd-remove-phase 3` | Phase removed, renumbered |
| Milestone audit | `/gsd-audit-milestone` | Cross-phase integration checked |
| Milestone complete | `/gsd-complete-milestone` | Archived to `.planning/milestones/` |

### Configuration Variations to Test

Try different `config.json` settings:

```
/gsd-settings
```

| Setting | Values to Try | Effect |
|---|---|---|
| `workflow.research` | `true` / `false` | Skip/include research in plan-phase |
| `workflow.plan_check` | `true` / `false` | Skip/include plan verification |
| `workflow.verifier` | `true` / `false` | Skip/include post-execution verification |
| `workflow.gates.plan_approval` | `"auto"` / `"manual"` | Auto-proceed vs pause for review |
| `git.auto_commit` | `true` / `false` | Auto-commit vs leave uncommitted |
| `git.branch_strategy` | `"none"` / `"phase"` / `"plan"` | Branching behavior |
| `model_profile` | `"quality"` / `"balanced"` / `"budget"` | Model tier for agents |

### Edge Cases to Exercise

- **Mid-phase abort:** Cancel during `/gsd-execute-phase`, then `/gsd-resume-work`
- **Empty codebase:** Run `/gsd-map-codebase` on an empty project
- **Long sessions:** Use `/gsd-pause-work` and `/gsd-resume-work` across sessions
- **Multiple plans per phase:** Ensure wave ordering and dependencies work
- **Decimal phases:** `/gsd-insert-phase 2 "hotfix"` creates phase 2.1
- **Concurrent changes:** Manually edit a file, then run `/gsd-execute-phase` — check conflict handling
- **State corruption:** Manually break STATE.md, then run `/gsd-health` — check repair

### MCP Tool Verification

The MCP server exposes tools prefixed with `gsd_`. Key ones to test directly:

| Tool | What it Does |
|---|---|
| `gsd_state_load` | Load current STATE.md |
| `gsd_state_update` | Update state fields |
| `gsd_config_load` | Read config.json |
| `gsd_config_set` | Modify config settings |
| `gsd_roadmap_analyze` | Get roadmap summary |
| `gsd_commit` | Atomic commit with planning docs |
| `gsd_find_phase` | Resolve phase directory path |
| `gsd_progress` | Get progress summary |
| `gsd_validate_health` | Run health checks |

---

## 5. Tips

- **Always check `/gsd-progress` first** when returning to a project — it shows where you are and what to do next.
- **STATE.md is the source of truth.** If something seems off, read it directly.
- **Use `/gsd-pause-work` before closing VS Code** to preserve context for next session.
- **`/gsd-quick` is your friend** for small fixes that don't need full planning ceremony.
- **Watch git history** during execution — each task should be a clean atomic commit with a conventional commit message.
- **Check `.planning/` after each command** to verify files were created/updated correctly.
