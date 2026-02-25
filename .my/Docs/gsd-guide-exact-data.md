# Getting Started with GSD for Understanding Exact.Data

## Project Context

You want to understand the **Exact.Data** project within the **Exact.Online** web application. This is a **codebase exploration** scenario — before making changes, you need GSD to analyze and document what exists.

---

## Prerequisites

1. **VS Code** with GitHub Copilot (agent mode)
2. **GSD installed** — run `npx gsd-copilot@latest` in the Exact.Data workspace (or the Exact.Online workspace containing Exact.Data)
3. **Git** configured in the workspace
4. The Exact.Data source code accessible in the workspace

---

## Step-by-Step Guide

### Step 1: Map the Codebase

Open the workspace containing Exact.Data and run:

```
/gsd-map-codebase
```

GSD spawns 4 parallel analyzers that produce structured documentation:

| Output | What It Tells You |
|--------|-------------------|
| `.planning/codebase/STACK.md` | Tech stack, frameworks, dependencies, build system |
| `.planning/codebase/ARCHITECTURE.md` | Project structure, layers, component relationships, data flow |
| `.planning/codebase/CONVENTIONS.md` | Coding patterns, naming conventions, common abstractions |
| `.planning/codebase/CONCERNS.md` | Technical debt, complexity hotspots, potential issues |

**This is your primary tool for understanding Exact.Data.** The output gives you a structured, navigable overview of the entire project.

### Step 2: Ask Targeted Questions

After mapping, use Copilot chat to ask specific questions. GSD now has the codebase documentation as context:

- "How does the data layer in Exact.Data work?"
- "What are the main entry points?"
- "How does Exact.Data integrate with the rest of Exact.Online?"
- "What patterns does the API layer follow?"
- "Where is the business logic for X feature?"

### Step 3: Deep-Dive with Research (Optional)

If you want GSD to research a specific aspect in depth before any work begins:

```
/gsd-research-phase 1
```

This runs focused parallel researchers that investigate:
- Stack details and dependencies
- Feature architecture
- Integration patterns
- Potential pitfalls

The output is a detailed `RESEARCH.md` covering the specific area you're interested in.

### Step 4: Initialize a Project (When Ready to Make Changes)

Once you understand Exact.Data and are ready to work on it:

```
/gsd-new-project
```

During the interview, explain:
- **What you learned** from the codebase mapping
- **What you want to change** — new features, refactoring, bug fixes
- **Constraints** — existing patterns to follow, integration points to preserve

GSD will generate a roadmap that respects the existing architecture it already mapped.

---

## Tips for Understanding a Large Web Project

### Focus the Mapping

If Exact.Data is part of a larger Exact.Online monorepo, open just the Exact.Data subfolder as your workspace. This focuses the codebase mapper on the relevant code instead of the entire solution.

If that's not possible, tell GSD during mapping: "Focus on the Exact.Data project within this solution."

### Build on the Mapping Output

The `.planning/codebase/` files are living documents. After the initial mapping:
- Read through each file to validate GSD's understanding
- Use `/gsd-quick "Add details about X to ARCHITECTURE.md"` to extend documentation on areas that need more depth
- Reference these files when starting any actual development work

### Trace Data Flows

For a project called "Exact.Data", understanding data flow is likely critical. After mapping, ask specifically:
- "Trace the data flow from API request to database and back"
- "What data models and entities exist?"
- "How is data validation handled?"
- "What caching layers exist?"

### Understand Integration Points

Exact.Data likely integrates with other Exact.Online modules. Ask:
- "What external APIs does Exact.Data call?"
- "What APIs does Exact.Data expose to other modules?"
- "How does authentication/authorization work?"
- "What shared libraries or packages does it depend on?"

### Use Debug for Runtime Understanding

If you need to understand runtime behavior:

```
/gsd-debug "How does feature X process data?"
```

GSD's scientific debugging workflow can trace through code paths, set up experiments, and document findings.

---

## Quick Reference

| What | Command |
|------|---------|
| Map the codebase | `/gsd-map-codebase` |
| Deep-dive research | `/gsd-research-phase N` |
| Quick investigation | `/gsd-quick "investigate X"` |
| Debug/trace behavior | `/gsd-debug "description"` |
| Start a project | `/gsd-new-project` |
| Check status | `/gsd-progress` |
