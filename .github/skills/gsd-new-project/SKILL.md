---
name: gsd-new-project
description: "Initialize a new GSD project with questioning, research, requirements, and roadmap"
---

# New Project Skill

Initialize a new project through a unified flow: questioning → research (optional) → requirements → roadmap.

**Creates:**
- `.planning/PROJECT.md` — project context
- `.planning/config.json` — workflow preferences
- `.planning/research/` — domain research (optional)
- `.planning/REQUIREMENTS.md` — scoped requirements
- `.planning/ROADMAP.md` — phase structure
- `.planning/STATE.md` — project memory

**After this command:** Run `/gsd-discuss-phase 1` or `/gsd-plan-phase 1`.

## Steps

### 1. Check preconditions

Check if `.planning/PROJECT.md` already exists. If it does, error:

```
Error: Project already initialized. Use /gsd-progress to check status.
```

Parse `$ARGUMENTS` for:
- `--auto` flag → store as `$AUTO_MODE`
- `@` referenced idea docs → store as `$IDEA_DOC`

If `$AUTO_MODE` and no idea document provided, error:
```
Error: --auto requires an idea document.

Usage:
  /gsd-new-project --auto @your-idea.md
  /gsd-new-project --auto [paste or write your idea here]

The document should describe what you want to build.
```

Set up progress tracking:

```
use_tool(manage_todo_list, {
  todos: [
    { id: "config", title: "Configure workflow preferences", status: "not_started" },
    { id: "discover", title: "Discovery questioning", status: "not_started" },
    { id: "project", title: "Write PROJECT.md", status: "not_started" },
    { id: "research", title: "Research domain", status: "not_started" },
    { id: "requirements", title: "Define requirements", status: "not_started" },
    { id: "roadmap", title: "Create roadmap", status: "not_started" },
    { id: "state", title: "Initialize STATE.md", status: "not_started" },
    { id: "commit", title: "Final commit", status: "not_started" }
  ]
})
```

### 2. Brownfield detection

**If `$AUTO_MODE`:** Skip to Step 4.

Check if existing code is present (look for `src/`, `package.json`, `*.py`, etc. in workspace root). If code exists but no `.planning/codebase/` directory:

```
use_tool(vscode_askQuestions, {
  questions: [{
    header: "Codebase",
    question: "I detected existing code. Map the codebase first?",
    options: [
      { label: "Map codebase first", description: "Run /gsd-map-codebase to understand existing architecture", recommended: true },
      { label: "Skip mapping", description: "Proceed with project initialization" }
    ]
  }]
})
```

If "Map codebase first": Tell user to run `/gsd-map-codebase` first, then return. Exit.

### 3. Configuration

Mark config in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "config", status: "in_progress" }] })
```

**If `$AUTO_MODE`:** YOLO mode is implicit. Collect remaining settings:

**Round 1 — Core settings (3 questions, no Mode question):**

```
use_tool(vscode_askQuestions, {
  questions: [
    {
      header: "Depth",
      question: "How thorough should planning be?",
      options: [
        { label: "Quick", description: "Ship fast (3-5 phases, 1-3 plans each)", recommended: true },
        { label: "Standard", description: "Balanced scope and speed (5-8 phases, 3-5 plans each)" },
        { label: "Comprehensive", description: "Thorough coverage (8-12 phases, 5-10 plans each)" }
      ]
    },
    {
      header: "Execution",
      question: "Run plans in parallel?",
      options: [
        { label: "Parallel", description: "Independent plans run simultaneously", recommended: true },
        { label: "Sequential", description: "One plan at a time" }
      ]
    },
    {
      header: "Git Tracking",
      question: "Commit planning docs to git?",
      options: [
        { label: "Yes", description: "Planning docs tracked in version control", recommended: true },
        { label: "No", description: "Keep .planning/ local-only (add to .gitignore)" }
      ]
    }
  ]
})
```

**If NOT `$AUTO_MODE` (interactive):**

**Round 1 — Core settings (4 questions):**

```
use_tool(vscode_askQuestions, {
  questions: [
    {
      header: "Mode",
      question: "How do you want to work?",
      options: [
        { label: "YOLO", description: "Auto-approve, just execute", recommended: true },
        { label: "Interactive", description: "Confirm at each step" }
      ]
    },
    {
      header: "Depth",
      question: "How thorough should planning be?",
      options: [
        { label: "Quick", description: "Ship fast (3-5 phases, 1-3 plans each)" },
        { label: "Standard", description: "Balanced scope and speed (5-8 phases, 3-5 plans each)" },
        { label: "Comprehensive", description: "Thorough coverage (8-12 phases, 5-10 plans each)" }
      ]
    },
    {
      header: "Execution",
      question: "Run plans in parallel?",
      options: [
        { label: "Parallel", description: "Independent plans run simultaneously", recommended: true },
        { label: "Sequential", description: "One plan at a time" }
      ]
    },
    {
      header: "Git Tracking",
      question: "Commit planning docs to git?",
      options: [
        { label: "Yes", description: "Planning docs tracked in version control", recommended: true },
        { label: "No", description: "Keep .planning/ local-only (add to .gitignore)" }
      ]
    }
  ]
})
```

**Round 2 — Workflow agents (both modes):**

```
use_tool(vscode_askQuestions, {
  questions: [
    {
      header: "Research",
      question: "Research before planning each phase? (adds tokens/time)",
      options: [
        { label: "Yes", description: "Investigate domain, find patterns, surface gotchas", recommended: true },
        { label: "No", description: "Plan directly from requirements" }
      ]
    },
    {
      header: "Plan Check",
      question: "Verify plans will achieve their goals? (adds tokens/time)",
      options: [
        { label: "Yes", description: "Catch gaps before execution starts", recommended: true },
        { label: "No", description: "Execute plans without verification" }
      ]
    },
    {
      header: "Verifier",
      question: "Verify work satisfies requirements after each phase? (adds tokens/time)",
      options: [
        { label: "Yes", description: "Confirm deliverables match phase goals", recommended: true },
        { label: "No", description: "Trust execution, skip verification" }
      ]
    },
    {
      header: "AI Models",
      question: "Which AI models for planning agents?",
      options: [
        { label: "Balanced", description: "Sonnet for most agents — good quality/cost ratio", recommended: true },
        { label: "Quality", description: "Opus for research/roadmap — higher cost, deeper analysis" },
        { label: "Budget", description: "Haiku where possible — fastest, lowest cost" }
      ]
    }
  ]
})
```

**Write config.json** using template at `.github/skills/gsd-new-project/templates/config.json`. Populate with user selections.

If commit_docs = No: Add `.planning/` to `.gitignore`.

**Commit config:**
```
use_tool(gsd_commit, { message: "chore: add project config", files: [".planning/config.json"] })
```

If `$AUTO_MODE`, also persist auto-advance:
```
use_tool(gsd_config_set, { key: "workflow.auto_advance", value: true })
```

Mark config complete:
```
use_tool(manage_todo_list, { todos: [{ id: "config", status: "complete" }] })
```

### 4. Discovery (Interactive Questioning)

Mark discover in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "discover", status: "in_progress" }] })
```

**If `$AUTO_MODE`:** Extract project context from the provided idea document. Skip interactive questioning. Proceed to Step 5 (Write PROJECT.md).

**If interactive:** Follow the questioning workflow detailed in `.github/skills/gsd-new-project/references/questioning-workflow.md`.

**Open the conversation:** Ask inline (freeform): "What do you want to build?"

Wait for response. Then follow the thread — dig into what they said.

**Question approach:**
- Follow energy — whatever they emphasized, explore deeper
- Challenge vagueness — "Good" means what? "Users" means who?
- Make abstract concrete — "Walk me through using this"
- Surface assumptions — find edges and reveal motivation
- Use `vscode_askQuestions` with concrete options to help users think

**Context checklist (background, not out loud):**
- [ ] What they're building (concrete enough to explain to a stranger)
- [ ] Why it needs to exist (the problem or desire driving it)
- [ ] Who it's for (even if just themselves)
- [ ] What "done" looks like (observable outcomes)

**Decision gate:** When you could write a clear PROJECT.md:

```
use_tool(vscode_askQuestions, {
  questions: [{
    header: "Ready?",
    question: "I think I understand what you're after. Ready to create PROJECT.md?",
    options: [
      { label: "Create PROJECT.md", description: "Let's move forward" },
      { label: "Keep exploring", description: "I want to share more / ask me more" }
    ]
  }]
})
```

Loop until "Create PROJECT.md" selected.

Mark discover complete:
```
use_tool(manage_todo_list, { todos: [{ id: "discover", status: "complete" }] })
```

### 5. Write PROJECT.md

Mark project in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "project", status: "in_progress" }] })
```

Synthesize all context into `.planning/PROJECT.md` using the template at `.github/skills/gsd-new-project/templates/project.md`.

**For greenfield projects:** Initialize requirements as hypotheses (Active = unvalidated).

**For brownfield projects** (`.planning/codebase/` exists):
- Read `ARCHITECTURE.md` and `STACK.md`
- Infer Validated requirements from existing code
- New requirements go to Active

**Include Key Decisions** from questioning phase.

**Commit PROJECT.md:**
```
use_tool(gsd_commit, { message: "docs: initialize project", files: [".planning/PROJECT.md"] })
```

Mark project complete:
```
use_tool(manage_todo_list, { todos: [{ id: "project", status: "complete" }] })
```

### 6. Research (if enabled)

Check `config.json` — if `workflow.research` is false, skip this step.

**If `$AUTO_MODE`:** Default to research enabled.

**If interactive:**
```
use_tool(vscode_askQuestions, {
  questions: [{
    header: "Research",
    question: "Research the domain ecosystem before defining requirements?",
    options: [
      { label: "Research first", description: "Discover standard stacks, expected features, architecture patterns", recommended: true },
      { label: "Skip research", description: "I know this domain well, go straight to requirements" }
    ]
  }]
})
```

If "Skip research": Mark as skipped, proceed to Step 7.

Mark research in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "research", status: "in_progress" }] })
```

Follow the research workflow in `.github/skills/gsd-new-project/references/research-workflow.md`.

Create `.planning/research/` directory.

**Execute 4 research tasks sequentially with progress updates:**

For each focus area [stack, features, architecture, pitfalls]:
1. Read `.github/agents/gsd-project-researcher.agent.md` to load the researcher role
2. Acting as the project-researcher with the current focus:
   - Read `.planning/PROJECT.md` for context
   - Research the domain for that focus area
   - Write output to `.planning/research/{FOCUS}.md`
3. Report progress: "Research complete: {focus} ({N} lines)"

After all 4 research tasks complete:
1. Read `.github/agents/gsd-research-synthesizer.agent.md` to load the synthesizer role
2. Acting as the synthesizer:
   - Read all 4 research files
   - Produce `.planning/research/SUMMARY.md`

**Commit research:**
```
use_tool(gsd_commit, { message: "docs: research domain ecosystem", files: [".planning/research/STACK.md", ".planning/research/FEATURES.md", ".planning/research/ARCHITECTURE.md", ".planning/research/PITFALLS.md", ".planning/research/SUMMARY.md"] })
```

Display key findings from SUMMARY.md.

Mark research complete:
```
use_tool(manage_todo_list, { todos: [{ id: "research", status: "complete" }] })
```

### 7. Define requirements

Mark requirements in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "requirements", status: "in_progress" }] })
```

Follow the requirements workflow in `.github/skills/gsd-new-project/references/requirements-workflow.md`.

**Load context:**
- Read PROJECT.md — extract core value, constraints, scope boundaries
- If research exists — read `research/FEATURES.md` for feature categories

**If `$AUTO_MODE`:**
- Auto-include all table stakes features
- Include features mentioned in idea document
- Defer unmentioned differentiators
- Skip per-category questions and approval gate
- Generate REQUIREMENTS.md directly

**If interactive:**
- Present features by category
- For each category, ask user to scope v1/v2/out-of-scope via `vscode_askQuestions` (multiSelect: true)
- Ask about additions research may have missed
- Cross-check against Core Value for gaps
- Present full requirements list for confirmation

**Generate REQUIREMENTS.md** using template at `.github/skills/gsd-new-project/templates/requirements.md`:
- v1 Requirements grouped by category with REQ-IDs (`[CATEGORY]-[NUMBER]`)
- v2 Requirements (deferred)
- Out of Scope (explicit exclusions with reasoning)
- Traceability section (empty, filled by roadmap)

**Requirement quality:** Specific, testable, user-centric, atomic, independent.

**Commit requirements:**
```
use_tool(gsd_commit, { message: "docs: define v1 requirements", files: [".planning/REQUIREMENTS.md"] })
```

Mark requirements complete:
```
use_tool(manage_todo_list, { todos: [{ id: "requirements", status: "complete" }] })
```

### 8. Create roadmap

Mark roadmap in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "roadmap", status: "in_progress" }] })
```

Follow the roadmap workflow in `.github/skills/gsd-new-project/references/roadmap-workflow.md`.

Read `.github/agents/gsd-roadmapper.agent.md` (if available) to load the roadmapper role. Then, acting as the roadmapper:

**Context to read:**
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/research/SUMMARY.md` (if exists)
- `.planning/config.json` (depth setting)

**Create ROADMAP.md** using template at `.github/skills/gsd-new-project/templates/roadmap.md`:
1. Derive phases from requirements (don't impose structure)
2. Map every v1 requirement to exactly one phase
3. Derive 2-5 success criteria per phase (observable user behaviors)
4. Validate 100% requirement coverage
5. Phase count matches depth setting (quick: 3-5, standard: 5-8, comprehensive: 8-12)

**Present roadmap** to user as a summary table.

**If `$AUTO_MODE`:** Auto-approve. Skip gate.

**If interactive:**
```
use_tool(vscode_askQuestions, {
  questions: [{
    header: "Roadmap",
    question: "Does this roadmap structure work for you?",
    options: [
      { label: "Approve", description: "Commit and continue" },
      { label: "Adjust phases", description: "Tell me what to change" },
      { label: "Review full file", description: "Show raw ROADMAP.md" }
    ]
  }]
})
```

If "Adjust phases": Get feedback, revise roadmap, re-present. Loop until approved.
If "Review full file": Show raw content, then re-ask.

Mark roadmap complete:
```
use_tool(manage_todo_list, { todos: [{ id: "roadmap", status: "complete" }] })
```

### 9. Initialize STATE.md

Mark state in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "state", status: "in_progress" }] })
```

Create `.planning/STATE.md` using template at `.github/skills/gsd-new-project/templates/state.md`:
- Reference PROJECT.md
- Set position to "Phase 1 of {N} ({Phase 1 Name})"
- Status: "Ready to plan"
- Initialize empty accumulated context sections

Update REQUIREMENTS.md traceability — fill in phase mappings.

**Commit all:**
```
use_tool(gsd_commit, {
  message: "docs: create roadmap ({N} phases)",
  files: [".planning/ROADMAP.md", ".planning/STATE.md", ".planning/REQUIREMENTS.md"]
})
```

Mark state complete:
```
use_tool(manage_todo_list, { todos: [{ id: "state", status: "complete" }] })
```

### 10. Present completion and route next step

Mark commit complete:
```
use_tool(manage_todo_list, { todos: [{ id: "commit", status: "complete" }] })
```

Display summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PROJECT INITIALIZED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**{Project Name}**

| Artifact       | Location                    |
|----------------|-----------------------------|
| Project        | .planning/PROJECT.md        |
| Config         | .planning/config.json       |
| Research       | .planning/research/         |
| Requirements   | .planning/REQUIREMENTS.md   |
| Roadmap        | .planning/ROADMAP.md        |

**{N} phases** | **{X} requirements** | Ready to build ✓
```

**If `$AUTO_MODE`:**
```
╔══════════════════════════════════════════╗
║  AUTO-ADVANCING → DISCUSS PHASE 1        ║
╚══════════════════════════════════════════╝
```
Invoke `/gsd-discuss-phase 1 --auto`.

**If interactive:**
```
## ▶ Next Up

**Phase 1: {Phase Name}** — {Goal from ROADMAP.md}

/gsd-discuss-phase 1 — gather context and clarify approach
/gsd-plan-phase 1 — skip discussion, plan directly
```
