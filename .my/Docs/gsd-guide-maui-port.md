# Getting Started with GSD for the MAUI Port Project

## Project Context

You are porting two native mobile apps (iOS + Android) from **Bouw7** to a single **.NET MAUI** app called **Exact.Construction**. The MAUI app follows the architecture of an existing MAUI app (**Exact.Online**). The Exact.Construction project is already scaffolded but needs fixing, there is existing documentation for the architecture and features, and you want to use the **Brinell** UI testing framework.

This is a **brownfield** scenario — you have existing codebases on both the source (Bouw7 native apps) and target (Exact.Construction scaffold) sides.

Everything lives in a **single repo with sub-repos**:

```
repo-root/
├── Bouw7/                  ← Native iOS + Android source apps
├── Exact-Construction/     ← Target MAUI app (scaffolded, needs fixing)
├── Exact-Online/           ← Reference MAUI app (architecture template)
├── Brinell/                ← UI testing framework
└── docs/                   ← Existing architecture & feature documentation
```

This is ideal for GSD — all source code, the reference architecture, test framework, and documentation are directly accessible in one workspace.

---

## Prerequisites

1. **VS Code** with GitHub Copilot (agent mode)
2. **GSD installed** — run `npx gsd-copilot@latest` in the repo root
3. **Git** configured in the workspace

---

## Step-by-Step Guide

### Step 1: Map the Existing Codebase (Per Technology)

Run three separate mapping passes, one per sub-repo, using the `--output` flag to write each map into its own subdirectory. This keeps the three codebases separate and prevents each run from overwriting the previous one.

**Run 1 — Exact.Construction (the target app):**

```
/gsd-map-codebase Focus on the Exact-Construction/ sub-repo. This is the target .NET MAUI app — it's scaffolded but needs fixing. Document its current state, architecture, what's broken, and what patterns are already in place. --output exact-construction
```

**Run 2 — Exact.Online (the architecture reference):**

```
/gsd-map-codebase Focus on the MauiCore/ sub-repo. This is the reference .NET MAUI app whose architecture Exact.Construction must follow. Document its patterns (MVVM, DI, navigation, services, data layer) as the target architecture template. --output exact-online
```

**Run 3 — Bouw7 (the source apps to port):**

```
/gsd-map-codebase Focus on the Bouw7/ sub-repos. These are the native iOS and Android apps being ported to MAUI. Document the feature inventory, API contracts, business logic, and platform-specific patterns — this is the source functionality we need to replicate. --output bouw7
```

**Files created:**

```
.planning/codebase/
├── exact-construction/   ← Target MAUI app analysis
│   ├── STACK.md
│   ├── INTEGRATIONS.md
│   ├── ARCHITECTURE.md
│   ├── STRUCTURE.md
│   ├── CONVENTIONS.md
│   ├── TESTING.md
│   └── CONCERNS.md
├── exact-online/         ← Reference MAUI app analysis
│   └── ... (same 7 files)
└── bouw7/                ← Native source apps analysis
    └── ... (same 7 files)
```

Each subdirectory holds the 7 structured documents scoped to that codebase alone.

### Step 2: Set the Model Profile

Use quality profile for a project of this complexity:

```
/gsd-set-profile quality
```

This switches all agents to Claude Opus 4.6 as primary model.**Files modified:**

```
.planning/config.json     ← profile field updated to "quality"
```

### Step 3: Initialize the Project

```
/gsd-new-project
```

GSD will interview you. This is where you provide the critical context. When asked, explain:

- **Goal:** "Port Bouw7 native iOS/Android features to Exact.Construction (.NET MAUI)"
- **Architecture reference:** "The Exact-Online/ sub-repo is the reference MAUI app — follow its patterns (MVVM, dependency injection, navigation, etc.)"
- **Current state:** "Exact-Construction/ is scaffolded but has issues that need fixing first"
- **Source apps:** "Bouw7/ contains the native iOS and Android apps — same functionality, different implementations"
- **Testing:** "Brinell/ is our UI testing framework — it's in the workspace, use its patterns and docs"
- **Existing docs:** "The docs/ folder has architecture and feature documentation for the port"
- **Constraints:** .NET MAUI target platforms, minimum OS versions, shared codebase requirements, any Exact platform conventions

**Files created:**

```
.planning/
├── PROJECT.md            ← Project definition & vision
├── config.json           ← Workflow configuration (profile, flags)
├── REQUIREMENTS.md       ← Requirements with REQ-IDs & traceability
├── ROADMAP.md            ← Phased execution plan
├── STATE.md              ← Current position & session context
└── research/             ← (optional, if domain research was run)
    ├── STACK.md          ← Technology research
    ├── FEATURES.md       ← Feature research
    ├── ARCHITECTURE.md   ← Architecture research
    ├── PITFALLS.md       ← Known pitfalls & risks
    └── SUMMARY.md        ← Research synthesis
```

### Step 4: Review the Roadmap

```
/gsd-progress
```

Check the generated roadmap. For a port project like this, a typical phase structure might look like:

| Phase | Focus                                                       |
| ----- | ----------------------------------------------------------- |
| 1     | Fix scaffold issues / stabilize Exact.Construction          |
| 2     | Set up Brinell test infrastructure                          |
| 3     | Port core/shared features (authentication, data layer, API) |
| 4     | Port feature group A (e.g., project management)             |
| 5     | Port feature group B (e.g., time tracking)                  |
| ...   | Additional feature groups                                   |
| N     | Integration testing, polish, release prep                   |

**Files read (no new files):**

```
.planning/STATE.md        ← Current progress
.planning/ROADMAP.md      ← Phase listing & status
```

If phases need adjusting:

```
/gsd-add-phase "Port offline sync and local storage from Bouw7"
```

```
/gsd-remove-phase 6
```

```
/gsd-insert-phase 2 "Urgent: fix authentication flow before anything else"
```

**Files modified by phase management commands:**

```
.planning/ROADMAP.md      ← Phase added/removed/reordered
.planning/STATE.md        ← Updated to reflect changes
```

### Step 5: Discuss Phase Preferences (Recommended)

Before each phase, lock in your preferences so GSD doesn't guess:

**Phase 1 example:**

```
/gsd-discuss-phase 1
```

When GSD asks questions, give specific answers like:

- "The most critical scaffold issue is that the app doesn't build — start there"
- "Follow the same MVVM structure as Exact-Online/src/ViewModels/"
- "Use constructor injection everywhere, matching Exact.Online's DI registration pattern"
- "Platform-specific code should use MAUI's conditional compilation, not partial classes"

**Phase 2 example (Brinell setup):**

```
/gsd-discuss-phase 2
```

When asked:

- "Look at Brinell/examples/ for the test patterns to follow"
- "We need page object models for every screen"
- "Integration tests should run against a mock API, not production"

**Files created (per phase):**

```
.planning/phases/{NN}-{name}/
└── {NN}-CONTEXT.md       ← Your locked decisions for this phase
```

### Step 6: Plan the Phase

```
/gsd-plan-phase 1
```

GSD runs parallel researchers, creates detailed execution plans with task breakdowns, and validates them. The plans include:

- Concrete tasks with dependencies
- Wave assignments (what can run in parallel)
- Verification criteria for each task
- Automated test commands where applicable

**Files created (per phase):**

```
.planning/phases/{NN}-{name}/
├── {NN}-RESEARCH.md      ← Research findings (skipped with --skip-research)
├── {NN}-01-PLAN.md       ← First execution plan
├── {NN}-02-PLAN.md       ← Second plan (if phase is large enough)
├── ...                   ← Additional plans as needed
└── {NN}-VALIDATION.md    ← Plan verification results (pass/fail)
```

Review the generated plan files in `.planning/phases/01-*/`.

If you want to skip the built-in research (e.g., you already ran `/gsd-research-phase`):

```
/gsd-plan-phase 1 --skip-research
```

If you have a PRD or spec document to feed in:

```
/gsd-plan-phase 1 --prd docs/feature-spec.md
```

### Step 7: Execute the Phase

```
/gsd-execute-phase 1
```

GSD executes each plan — writing code, running tests, making atomic git commits, and producing summaries. Each executor gets a fresh context window for maximum accuracy.

**Files created (per phase):**

```
.planning/phases/{NN}-{name}/
├── {NN}-01-SUMMARY.md    ← Execution results for plan 01
├── {NN}-02-SUMMARY.md    ← Execution results for plan 02
├── ...                   ← One SUMMARY per PLAN
└── {NN}-VERIFICATION.md  ← Post-execution verification report
```

Plus the actual **source code changes** committed to git (atomic commits per task).

### Step 8: Verify the Work

```
/gsd-verify-work 1
```

Walk through the deliverables interactively. GSD checks verification criteria and helps diagnose any failures.

**Files created (per phase):**

```
.planning/phases/{NN}-{name}/
└── {NN}-UAT.md           ← User acceptance testing results
```

If gaps are found, GSD may also create fix plans (additional `*-PLAN.md` files).

### Step 9: Repeat for Each Phase

Continue the cycle: **discuss → plan → execute → verify** for each phase.

### Step 10: Complete the Milestone

When all phases are done:

```
/gsd-audit-milestone
```

**Files created by audit:**

```
.planning/
└── v{version}-MILESTONE-AUDIT.md  ← Audit report with scores & gaps
```

If clean:

```
/gsd-complete-milestone
```

**Files created/modified by completion:**

```
.planning/
├── MILESTONES.md                     ← Historical milestone record (created/appended)
├── STATE.md                          ← Reset for next milestone
└── milestones/
    ├── v{version}-ROADMAP.md         ← Archived roadmap
    ├── v{version}-REQUIREMENTS.md    ← Archived requirements
    ├── v{version}-MILESTONE-AUDIT.md ← Moved audit report
    └── v{version}-phases/            ← Archived phase directories (optional)
```

---

## Useful Commands During Development

### Quick fixes (skip full planning)

For small standalone changes that don't justify a full phase:

```
/gsd-quick Fix the navigation bar alignment issue in Exact-Construction/src/Views/MainPage.xaml
```

```
/gsd-quick Add null checks to the API client in Exact-Construction/src/Services/ApiClient.cs
```

**Files created (per quick task):**

```
.planning/quick/{N}-{slug}/
├── PLAN.md               ← Quick task plan
└── SUMMARY.md            ← Execution results
```

Plus source code changes committed to git.

### Debugging

When something breaks:

```
/gsd-debug The app crashes on startup after porting the authentication service from Bouw7
```

```
/gsd-debug Brinell tests timeout when navigating to the project list screen
```

**Files created (per debug session):**

```
.planning/debug/
├── {timestamp}-{slug}.md            ← Active debug session log
└── resolved/
    └── {timestamp}-{slug}.md        ← Moved here when resolved
```

### Deep research (standalone)

For complex decisions before planning, run standalone research:

```
/gsd-research-phase 3
```

This investigates the problem space in depth without creating plans.

**Files created:**

```
.planning/phases/{NN}-{name}/
└── {NN}-RESEARCH.md      ← Deep research findings
```

### Session management

Port projects are large. When stopping work:

```
/gsd-pause-work
```

**Files modified:** `.planning/STATE.md` ← session context saved

When starting a new session:

```
/gsd-resume-work
```

**Files read:** `.planning/STATE.md` ← session context restored

### Settings

Configure workflow options:

```
/gsd-settings
```

---

## Tips for This Specific Project

### Monorepo Advantage

With all sub-repos in one workspace, GSD can:

- Read Bouw7 source code directly when planning how to port a feature
- Reference Exact.Online patterns in real-time during execution
- Use Brinell source and tests as examples when writing new tests
- Cross-reference the docs/ folder for architecture decisions

You don't need to copy, summarize, or duplicate anything — just point GSD to the right sub-repo path.

### Handling Multiple Source Codebases

Since you're porting from two native apps (iOS + Android) that implement the same features differently:

- During `/gsd-new-project`, specify that both apps are in Bouw7/ and are feature-equivalent reference implementations
- When discussing phases, indicate which native app has the cleaner implementation for each feature area — GSD will prioritize that as the reference
- GSD can read both iOS and Android implementations directly from Bouw7/ to compare approaches

### Leveraging the Exact.Online Architecture

- Exact.Online is right there in the workspace — GSD will read it directly during research
- During phase discussions, be specific: "Follow the same navigation pattern as in Exact-Online/src/Navigation/" or "Use the same DI setup as Exact-Online"
- GSD's researchers will compare Exact.Construction's scaffold against Exact.Online automatically

### Fixing the Scaffold First

- Phase 1 should focus exclusively on stabilizing Exact.Construction — getting it to build, run, and pass basic smoke tests
- This gives GSD a working baseline before porting features

### Brinell Test Framework

- Brinell is already in the workspace — GSD can read its source, examples, and docs directly
- During `/gsd-new-project`, mention "Brinell/ is our UI testing framework" so it becomes a project requirement
- Consider an early phase dedicated to Brinell infrastructure setup before feature porting begins
- GSD's Nyquist validation layer will map requirements to Brinell test commands

### Session Management

Port projects are large. Use:

- `/gsd-pause-work` — saves full context when stopping
- `/gsd-resume-work` — restores context in a new session
- `/gsd-settings` — configure workflow options

---

## Complete File Tree

After a full project lifecycle (all phases completed + milestone archived), your `.planning/` directory looks like this:

```
.planning/
├── PROJECT.md                              ← Project definition & vision
├── config.json                             ← Workflow configuration
├── REQUIREMENTS.md                         ← Requirements with REQ-IDs
├── ROADMAP.md                              ← Current milestone's phase plan
├── STATE.md                                ← Current position & session context
├── MILESTONES.md                           ← Historical milestone records
│
├── codebase/                               ← Codebase analysis (from /gsd-map-codebase)
│   ├── exact-construction/                 ← Target app analysis (--output exact-construction)
│   │   ├── STACK.md
│   │   ├── INTEGRATIONS.md
│   │   ├── ARCHITECTURE.md
│   │   ├── STRUCTURE.md
│   │   ├── CONVENTIONS.md
│   │   ├── TESTING.md
│   │   └── CONCERNS.md
│   ├── exact-online/                       ← Reference app analysis (--output exact-online)
│   │   └── ... (same 7 files)
│   └── bouw7/                              ← Source apps analysis (--output bouw7)
│       └── ... (same 7 files)
│
├── research/                               ← Domain research (from /gsd-new-project)
│   ├── STACK.md
│   ├── FEATURES.md
│   ├── ARCHITECTURE.md
│   ├── PITFALLS.md
│   └── SUMMARY.md
│
├── phases/                                 ← Phase working directories
│   ├── 01-fix-scaffold/
│   │   ├── 01-CONTEXT.md                   ← User decisions (/gsd-discuss-phase)
│   │   ├── 01-RESEARCH.md                  ← Research findings (/gsd-plan-phase)
│   │   ├── 01-01-PLAN.md                   ← Execution plan 1 (/gsd-plan-phase)
│   │   ├── 01-02-PLAN.md                   ← Execution plan 2 (if needed)
│   │   ├── 01-VALIDATION.md                ← Plan verification (/gsd-plan-phase)
│   │   ├── 01-01-SUMMARY.md                ← Execution results (/gsd-execute-phase)
│   │   ├── 01-02-SUMMARY.md                ← Results for plan 2
│   │   ├── 01-VERIFICATION.md              ← Post-execution check (/gsd-execute-phase)
│   │   └── 01-UAT.md                       ← User acceptance (/gsd-verify-work)
│   ├── 02-brinell-setup/
│   │   └── ...                             ← Same structure per phase
│   └── .../
│
├── quick/                                  ← Quick tasks (/gsd-quick)
│   ├── 01-fix-nav-alignment/
│   │   ├── PLAN.md
│   │   └── SUMMARY.md
│   └── 02-api-null-checks/
│       ├── PLAN.md
│       └── SUMMARY.md
│
├── debug/                                  ← Debug sessions (/gsd-debug)
│   ├── 20260225-auth-crash.md              ← Active session
│   └── resolved/
│       └── 20260224-build-error.md         ← Resolved session
│
├── v1.0-MILESTONE-AUDIT.md                 ← Audit report (/gsd-audit-milestone)
│
└── milestones/                             ← Archived milestones (/gsd-complete-milestone)
    ├── v1.0-ROADMAP.md
    ├── v1.0-REQUIREMENTS.md
    ├── v1.0-MILESTONE-AUDIT.md
    └── v1.0-phases/                        ← Archived phase dirs (optional)
        └── .../
```

---

## Full Prompt Reference

Every command below is a complete, copy-pasteable prompt:

### Codebase Mapping (3 runs)

```
/gsd-map-codebase Focus on the Exact-Construction/ sub-repo. This is the target .NET MAUI app — it's scaffolded but needs fixing. Document its current state, architecture, what's broken, and what patterns are already in place. --output exact-construction
```

```
/gsd-map-codebase Focus on the Exact-Online/ sub-repo. This is the reference .NET MAUI app whose architecture Exact.Construction must follow. Document its patterns (MVVM, DI, navigation, services, data layer) as the target architecture template. --output exact-online
```

```
/gsd-map-codebase Focus on the Bouw7/ sub-repo. These are the native iOS and Android apps being ported to MAUI. Document the feature inventory, API contracts, business logic, and platform-specific patterns — this is the source functionality we need to replicate. --output bouw7
```

### Project Setup

```
/gsd-set-profile quality
```

```
/gsd-new-project
```

### Phase Cycle (repeat for each phase N)

```
/gsd-discuss-phase N
```

```
/gsd-plan-phase N
```

```
/gsd-execute-phase N
```

```
/gsd-verify-work N
```

### Phase Management

```
/gsd-add-phase "Port offline sync and local storage from Bouw7"
```

```
/gsd-insert-phase 2 "Urgent: fix authentication flow before anything else"
```

```
/gsd-remove-phase 6
```

### Milestone Completion

```
/gsd-audit-milestone
```

```
/gsd-complete-milestone
```

### Quick Tasks

```
/gsd-quick Fix the navigation bar alignment issue in Exact-Construction/src/Views/MainPage.xaml
```

### Debugging

```
/gsd-debug The app crashes on startup after porting the authentication service from Bouw7
```

### Session Management

```
/gsd-pause-work
```

```
/gsd-resume-work
```

### Status & Settings

```
/gsd-progress
```

```
/gsd-settings
```
