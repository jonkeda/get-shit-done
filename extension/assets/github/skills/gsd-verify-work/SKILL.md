---
name: gsd-verify-work
description: "Interactive UAT verification — walk through deliverables, diagnose failures, create fix plans"
---

# Verify Work

Validate built features through conversational user acceptance testing. Walk through each deliverable one at a time, record pass/fail, diagnose failures, and create fix plans.

**Philosophy:** Show expected, ask if reality matches. User tests, Claude records.

## Invocation

```
/gsd-verify-work [phase]
```

## Steps

### 1. Initialize

1. Parse phase number from arguments
2. Call `gsd_state_load` to load project state
3. Check for active UAT sessions (`*-UAT.md` files across phases)

**If active sessions exist and no phase specified:** Display session list with progress, let user choose to resume or start new.
**If phase specified and session exists for that phase:** Offer resume or restart.
**If no sessions and no phase:** Prompt for phase number.

### 2. Extract Testable Deliverables

1. Call `gsd_find_phase` to locate the phase directory
2. Read all `*-SUMMARY.md` files in the phase directory
3. If VERIFICATION.md exists, incorporate its findings
4. Read PLAN.md `must_haves` and ROADMAP.md success criteria
5. Extract **user-observable** outcomes from accomplishments:
   - Focus on things the user can see, click, or interact with
   - Skip internal/non-observable items (refactors, type changes)

For each deliverable, create a test:
- **name:** Brief test name
- **expected:** What the user should see/experience (specific, observable)

### 3. Create UAT File

Write `{phase_dir}/{phase_num}-UAT.md` using the [UAT template](templates/UAT.md):
- Frontmatter: `status: testing`, phase, source SUMMARY files, timestamps
- Current Test section pointing to test 1
- All tests with `result: [pending]`
- Summary with counts
- Empty Gaps section

### 4. Walk Through Each Deliverable

Present one test at a time using checkpoint box format:

```
╔══════════════════════════════════════════════════════════════╗
║  CHECKPOINT: Verification Required                           ║
╚══════════════════════════════════════════════════════════════╝

**Test {N}: {name}**

{expected behavior}

──────────────────────────────────────────────────────────────
→ Type "pass" or describe what's wrong
──────────────────────────────────────────────────────────────
```

Wait for user response (plain text, no structured prompts).

### 5. Process Responses

| User Says | Action |
|-----------|--------|
| "yes", "y", "pass", "ok", "next", empty | Mark as **pass** |
| "skip", "can't test", "n/a" | Mark as **skipped** |
| Anything else | Mark as **issue**, infer severity |

**Severity inference** (never ask — always infer):

| User describes | Severity |
|----------------|----------|
| Crash, error, exception, fails, unusable | blocker |
| Doesn't work, nothing happens, wrong, missing | major |
| Works but..., slow, weird, minor | minor |
| Color, font, spacing, alignment, visual | cosmetic |
| Default if unclear | major |

For issues: append to Gaps section in YAML format for `/gsd-plan-phase --gaps` consumption.

Update Summary counts and `Current Test` section after each response.

### 6. Resume Support

UAT.md is designed to survive `/clear`:
1. Read frontmatter → know phase and status
2. Read Current Test → know where we are
3. Find first `[pending]` result → continue from there

### 7. Complete Session

When all tests processed:
1. Update frontmatter: `status: complete`
2. Clear Current Test: `[testing complete]`
3. Commit UAT.md via `gsd_commit`
4. Present summary with pass/fail counts

### 8. Handle Failures

**If issues found (issues > 0):**

Automatically proceed to diagnosis:
1. Read `.github/agents/gsd-debugger.agent.md` and follow its instructions
2. For each gap in UAT.md:
   - Investigate root cause using the [diagnosis workflow](references/diagnosis-workflow.md)
   - Debug agent reads code, forms hypotheses, tests them
   - Returns root cause with evidence and files involved
3. Update UAT.md gaps with diagnosis: `root_cause`, `artifacts`, `missing`, `debug_session`
4. Update UAT status to `diagnosed`
5. Commit updated UAT.md

### 9. Create Fix Plans (for diagnosed failures)

After diagnosis:
1. Create gap-closure PLAN.md files with `gap_closure: true` in frontmatter
2. Plans target specific root causes from diagnosis
3. Each plan has targeted fix tasks + verification

### 10. Route to Next Step

| Outcome | Suggestion |
|---------|------------|
| All passed | `/gsd-plan-phase {next}` or `/gsd-audit-milestone` |
| Failures with fix plans | `/gsd-execute-phase {N} --gaps-only` |
| Undiagnosable issues | Suggest manual investigation |
