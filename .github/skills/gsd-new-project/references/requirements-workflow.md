# Requirements Workflow Reference

Requirements extraction and categorization protocol for `/gsd-new-project`.

## Overview

Transform PROJECT.md context + research findings into a structured REQUIREMENTS.md with REQ-IDs, categorization, and traceability.

## Inputs

- `.planning/PROJECT.md` — Core value, constraints, scope boundaries
- `.planning/research/FEATURES.md` — Feature categories (if research was done)
- User responses from questioning phase

## Process

### 1. Load context

Read PROJECT.md and extract:
- Core value (the ONE thing that must work)
- Stated constraints (budget, timeline, tech limitations)
- Explicit scope boundaries

If research exists, read `research/FEATURES.md` for feature categories.

### 2. Present features (interactive mode)

For each feature category from research:

```
## {Category}

**Table stakes:**
- {feature 1}
- {feature 2}

**Differentiators:**
- {feature 3}
- {feature 4}

**Research notes:** {relevant notes}
```

If no research: gather requirements through conversation. Ask "What are the main things users need to be able to do?" and probe for specifics.

### 3. Scope each category (interactive mode)

For each category:

```
use_tool(vscode_askQuestions, {
  questions: [{
    header: "{Category}",
    question: "Which {category} features are in v1?",
    multiSelect: true,
    options: [
      { label: "{Feature 1}", description: "{brief description}" },
      { label: "{Feature 2}", description: "{brief description}" },
      { label: "None for v1", description: "Defer entire category" }
    ]
  }]
})
```

Track:
- Selected features → v1 requirements
- Unselected table stakes → v2 (users expect these)
- Unselected differentiators → out of scope

### 4. Identify gaps

```
use_tool(vscode_askQuestions, {
  questions: [{
    header: "Additions",
    question: "Any requirements research missed? (Specific to your vision)",
    options: [
      { label: "No, research covered it", description: "Proceed" },
      { label: "Yes, let me add some", description: "Capture additions" }
    ],
    allowFreeformInput: true
  }]
})
```

### 5. Validate core value

Cross-check requirements against Core Value from PROJECT.md. If gaps detected (core value not covered by any requirement), surface them.

### 6. Generate REQUIREMENTS.md

Use template at `.github/skills/gsd-new-project/templates/requirements.md`.

**REQ-ID format:** `[CATEGORY]-[NUMBER]` (e.g., AUTH-01, CONTENT-02)

**Requirement quality criteria:**
- **Specific and testable:** "User can reset password via email link" (not "Handle password reset")
- **User-centric:** "User can X" (not "System does Y")
- **Atomic:** One capability per requirement
- **Independent:** Minimal dependencies on other requirements

Reject vague requirements. Push for specificity.

### 7. Present and confirm (interactive mode)

Show every requirement for user confirmation:

```
## v1 Requirements

### Authentication
- [ ] **AUTH-01**: User can create account with email/password
- [ ] **AUTH-02**: User can log in and stay logged in across sessions
...

Does this capture what you're building? (yes / adjust)
```

If "adjust": return to scoping.

### 8. Auto mode behavior

When `$AUTO_MODE`:
- Auto-include all table stakes features
- Include features explicitly mentioned in idea document
- Auto-defer differentiators not mentioned
- Skip per-category questions
- Skip approval gate
- Generate REQUIREMENTS.md directly

## Output

`.planning/REQUIREMENTS.md` with:
- v1 Requirements grouped by category (checkboxes, REQ-IDs)
- v2 Requirements (deferred)
- Out of Scope (explicit exclusions with reasoning)
- Traceability section (empty — filled during roadmap creation)
