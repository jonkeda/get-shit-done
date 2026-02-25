---
name: gsd-debug
description: "Scientific debugging with persistent sessions — hypothesis → experiment → conclusion"
---

# /gsd-debug

Systematic debugging using scientific method with persistent session files. Supports new investigations and resuming prior sessions across context resets.

## Invocation

```
/gsd-debug [issue description]
```

- Issue description is optional — will prompt if not provided
- `$ARGUMENTS` contains the symptom description (if given)

## Process

### Step 1: Check for Active Sessions

Look for active debug session files:
```
Check .planning/debug/*.md files (exclude resolved/ subdirectory)
```

**If active sessions exist AND no `$ARGUMENTS`:**
- List sessions with status, current hypothesis, and next action
- Let user pick a session number to resume OR describe a new issue

**If `$ARGUMENTS` provided OR user describes new issue:**
- Continue to Step 2 (symptom gathering)

**If resuming an existing session:**
- Read the debug file
- Parse frontmatter for `status`
- Read "Current Focus" for where investigation left off
- Read "Eliminated" to know what NOT to retry
- Read "Evidence" for accumulated findings
- Skip to Step 4 (delegate to debugger) with continuation context

### Step 2: Gather Symptoms (New Issue Only)

Ask 5 focused questions to build a complete symptom profile:

1. **Expected behavior** — What should happen?
2. **Actual behavior** — What happens instead?
3. **Error messages** — Any errors? (paste or describe)
4. **Timeline** — When did this start? What changed recently?
5. **Reproduction** — Steps to trigger the issue?

After gathering all 5, confirm with the user:
> Ready to investigate. Here's what I understand: [summary]. Correct?

### Step 3: Create Debug Session File

Create `.planning/debug/{timestamp}-{slug}.md` from the template at `.github/skills/gsd-debug/templates/debug-session.md`.

- `{timestamp}` — ISO date (e.g., `2026-02-24`)
- `{slug}` — kebab-case from symptom summary (e.g., `auth-screen-dark`)

Populate:
- `status: investigating`
- `trigger:` verbatim user input
- Symptoms section with gathered answers
- Current Focus: `next_action: begin investigation`

### Step 4: Delegate to Debugger Agent

Read `.github/agents/gsd-debugger.agent.md` and follow its instructions.

**Acting as the debugger, follow the scientific method:**

1. **Form hypothesis** — based on symptoms and codebase knowledge
2. **Make prediction** — what evidence would confirm or deny this?
3. **Run experiment** — read code, run tests, check logs
4. **Observe result** — what actually happened?
5. **Conclude** — hypothesis confirmed, refuted, or needs refinement

**Update the debug session file throughout:**
- OVERWRITE "Current Focus" with each new hypothesis
- APPEND to "Evidence" with each finding
- APPEND to "Eliminated" when a hypothesis is disproved
- Update `status` in frontmatter as investigation progresses

### Step 5: Handle Outcomes

**ROOT CAUSE FOUND:**
- Display root cause with evidence summary
- Update debug file: `status: resolved`, fill Resolution section
- Move file to `.planning/debug/resolved/`
- Offer options:
  - **Fix now** → `/gsd-quick "fix: {description}"` — immediate fix
  - **Plan fix** → `/gsd-plan-phase --gaps` — structured fix if complex
  - **Manual fix** → user handles it

**CHECKPOINT REACHED** (needs user input):
- Present findings so far and what's needed from the user
- Types: `need-info` (more context needed), `human-verify` (user must test something), `permission` (destructive action approval)
- After user responds, continue investigation with fresh context:
  - Re-read debug file for full state
  - Apply user's response
  - Resume from `next_action`

**INVESTIGATION INCONCLUSIVE:**
- Show what was checked and eliminated
- Offer options:
  - **Continue investigating** — provide additional context, try different angle
  - **Different approach** — reframe the problem, check different area
  - **Manual investigation** — user takes over

### Step 6: Commit Session

If the debug session produced meaningful findings (root cause found or significant evidence gathered):

```
Call gsd_commit with message: "docs(debug): {slug} — {outcome}"
Include the debug session file.
```

## Key Principles

- **The debug file IS the debugging brain.** It persists across context resets. Write to it continuously.
- **Never re-investigate eliminated hypotheses.** Always check "Eliminated" section first.
- **Scientific method is non-negotiable.** No guessing — hypothesis → prediction → experiment → observe → conclude.
- **Keep evidence entries brief.** 1-2 lines each, structured data, no narrative prose.
- **Symptoms are immutable.** Once gathered, the Symptoms section never changes.
