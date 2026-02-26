---
name: gsd-map-codebase
description: "Analyze existing codebase and produce structured documentation in .planning/codebase/"
---

# Map Codebase Skill

Analyze existing codebase using parallel codebase-mapper agent invocations to produce structured documents in `.planning/codebase/`.

Each mapper call explores a focus area and writes documents directly. The orchestrator receives confirmations and verifies output.

**Output:** `.planning/codebase/` folder with 7 structured documents about the codebase state.

**When to use:**
- Brownfield projects before `/gsd-new-project` (understand existing code first)
- Refreshing codebase map after significant changes
- Onboarding to an unfamiliar codebase
- Before major refactoring

**Skip for:**
- Greenfield projects with no code yet
- Trivial codebases (<5 files)

## Steps

### 1. Check preconditions

Set up progress tracking:

```
use_tool(manage_todo_list, {
  todos: [
    { id: "check", title: "Check existing maps", status: "in_progress" },
    { id: "tech", title: "Map: tech stack & integrations", status: "not_started" },
    { id: "arch", title: "Map: architecture & structure", status: "not_started" },
    { id: "quality", title: "Map: conventions & testing", status: "not_started" },
    { id: "concerns", title: "Map: concerns & debt", status: "not_started" },
    { id: "verify", title: "Verify all documents", status: "not_started" },
    { id: "commit", title: "Commit codebase map", status: "not_started" }
  ]
})
```

Check if `.planning/codebase/` already has files.

**If files exist:**

```
use_tool(vscode_askQuestions, {
  questions: [{
    header: "Existing Map",
    question: ".planning/codebase/ already exists. What would you like to do?",
    options: [
      { label: "Refresh", description: "Delete existing and remap codebase" },
      { label: "Update", description: "Keep existing, only update specific documents" },
      { label: "Skip", description: "Use existing codebase map as-is" }
    ]
  }]
})
```

- **Refresh:** Delete `.planning/codebase/` contents, continue
- **Update:** Ask which documents to update, only map those focus areas
- **Skip:** Exit skill

**If no files exist:** Continue.

Mark check complete:
```
use_tool(manage_todo_list, { todos: [{ id: "check", status: "complete" }] })
```

### 2. Create codebase directory

Create `.planning/codebase/` directory.

**Expected output files:**
- `STACK.md` (from tech mapper)
- `INTEGRATIONS.md` (from tech mapper)
- `ARCHITECTURE.md` (from arch mapper)
- `STRUCTURE.md` (from arch mapper)
- `CONVENTIONS.md` (from quality mapper)
- `TESTING.md` (from quality mapper)
- `CONCERNS.md` (from concerns mapper)

### 3. Execute 4 codebase-mapper calls

For each focus area, read `.github/agents/gsd-codebase-mapper.agent.md` to load the mapper's role and methodology. Then, acting as the codebase-mapper with the specific focus, explore the codebase and write documents.

Execute sequentially with progress updates between each.

**Focus 1: Tech**

Mark in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "tech", status: "in_progress" }] })
```

Acting as the codebase-mapper with focus=tech:
- Analyze technology stack and external integrations
- Write `.planning/codebase/STACK.md` using template at `.github/skills/gsd-map-codebase/templates/codebase/STACK.md`
- Write `.planning/codebase/INTEGRATIONS.md`
- Report: "Tech mapping complete: STACK.md ({N} lines), INTEGRATIONS.md ({N} lines)"

```
use_tool(manage_todo_list, { todos: [{ id: "tech", status: "complete" }] })
```

**Focus 2: Architecture**

Mark in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "arch", status: "in_progress" }] })
```

Acting as the codebase-mapper with focus=arch:
- Analyze architecture patterns and directory structure
- Write `.planning/codebase/ARCHITECTURE.md` using template at `.github/skills/gsd-map-codebase/templates/codebase/ARCHITECTURE.md`
- Write `.planning/codebase/STRUCTURE.md`
- Report: "Architecture mapping complete: ARCHITECTURE.md ({N} lines), STRUCTURE.md ({N} lines)"

```
use_tool(manage_todo_list, { todos: [{ id: "arch", status: "complete" }] })
```

**Focus 3: Quality**

Mark in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "quality", status: "in_progress" }] })
```

Acting as the codebase-mapper with focus=quality:
- Analyze coding conventions and testing patterns
- Write `.planning/codebase/CONVENTIONS.md` using template at `.github/skills/gsd-map-codebase/templates/codebase/CONVENTIONS.md`
- Write `.planning/codebase/TESTING.md`
- Report: "Quality mapping complete: CONVENTIONS.md ({N} lines), TESTING.md ({N} lines)"

```
use_tool(manage_todo_list, { todos: [{ id: "quality", status: "complete" }] })
```

**Focus 4: Concerns**

Mark in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "concerns", status: "in_progress" }] })
```

Acting as the codebase-mapper with focus=concerns:
- Analyze technical debt, known issues, areas of concern
- Write `.planning/codebase/CONCERNS.md` using template at `.github/skills/gsd-map-codebase/templates/codebase/CONCERNS.md`
- Report: "Concerns mapping complete: CONCERNS.md ({N} lines)"

```
use_tool(manage_todo_list, { todos: [{ id: "concerns", status: "complete" }] })
```

### 4. Verify all documents exist

Mark verify in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "verify", status: "in_progress" }] })
```

Verify all 7 documents exist and are non-empty (each should have >20 lines):
- `.planning/codebase/STACK.md`
- `.planning/codebase/INTEGRATIONS.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/codebase/CONVENTIONS.md`
- `.planning/codebase/TESTING.md`
- `.planning/codebase/CONCERNS.md`

If any are missing or empty, note which focus areas may have failed and report.

**Security check:** Scan output files for accidentally leaked secrets before committing:
- Look for patterns like API keys, tokens, private keys in the generated documents
- If found, warn user and pause before commit

Mark verify complete:
```
use_tool(manage_todo_list, { todos: [{ id: "verify", status: "complete" }] })
```

### 5. Commit codebase map

Mark commit in progress:
```
use_tool(manage_todo_list, { todos: [{ id: "commit", status: "in_progress" }] })
```

```
use_tool(gsd_commit, {
  message: "docs: map existing codebase",
  files: [
    ".planning/codebase/STACK.md",
    ".planning/codebase/INTEGRATIONS.md",
    ".planning/codebase/ARCHITECTURE.md",
    ".planning/codebase/STRUCTURE.md",
    ".planning/codebase/CONVENTIONS.md",
    ".planning/codebase/TESTING.md",
    ".planning/codebase/CONCERNS.md"
  ]
})
```

Mark commit complete:
```
use_tool(manage_todo_list, { todos: [{ id: "commit", status: "complete" }] })
```

### 6. Present completion and suggest next step

```
Codebase mapping complete.

Created .planning/codebase/:
- STACK.md ({N} lines) - Technologies and dependencies
- ARCHITECTURE.md ({N} lines) - System design and patterns
- STRUCTURE.md ({N} lines) - Directory layout and organization
- CONVENTIONS.md ({N} lines) - Code style and patterns
- TESTING.md ({N} lines) - Test structure and practices
- INTEGRATIONS.md ({N} lines) - External services and APIs
- CONCERNS.md ({N} lines) - Technical debt and issues


---

## ▶ Next Up

**Initialize project** — use codebase context for planning

/gsd-new-project

---

**Also available:**
- Re-run mapping: /gsd-map-codebase
- Review specific file: read .planning/codebase/STACK.md
```
