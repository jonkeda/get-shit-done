# Diagnosis Workflow

Protocol for investigating UAT failures and finding root causes before planning fixes.

## Core Principle

**Diagnose before planning fixes.**

UAT tells us WHAT is broken (symptoms). Diagnosis finds WHY (root cause). Then `/gsd-plan-phase --gaps` creates targeted fixes based on actual causes, not guesses.

Without diagnosis: "Comment doesn't refresh" → guess at fix → maybe wrong.
With diagnosis: "Comment doesn't refresh" → "useEffect missing dependency" → precise fix.

## Diagnosis Flow

### 1. Parse Gaps from UAT.md

Read the Gaps section (YAML format). For each gap, also read the corresponding test for full context.

Build gap list:
```
gaps = [
  {truth: "Expected behavior", severity: "major", test_num: N, reason: "User reported: ..."},
  ...
]
```

### 2. Report Plan

Display diagnosis plan to user:
```
## Diagnosing {N} Gaps

| Gap (Truth) | Severity |
|-------------|----------|
| Expected behavior 1 | major |
| Expected behavior 2 | blocker |

Each gap will be investigated to find root cause.
```

### 3. Investigate Each Gap

For each gap, use the debugger agent:
1. Read `.github/agents/gsd-debugger.agent.md` and follow its instructions
2. Provide pre-filled symptoms from UAT (no symptom gathering needed)
3. Debug agent investigates:
   - Reads relevant source code
   - Forms specific, falsifiable hypotheses
   - Tests hypotheses one at a time
   - Finds root cause with evidence

### 4. Collect Results

Each investigation returns one of:

**Root cause found:**
```
## ROOT CAUSE FOUND

Root Cause: {specific cause with evidence}
Evidence: {key findings}
Files Involved: {file: what's wrong}
Suggested Fix Direction: {hint for gap closure}
```

**Inconclusive:**
```
## INVESTIGATION INCONCLUSIVE

Remaining Possibilities: {list}
What Was Ruled Out: {list}
```

### 5. Update UAT.md

For each gap, add diagnosis results:
```yaml
- truth: "Expected behavior"
  status: failed
  reason: "User reported: ..."
  severity: major
  test: N
  root_cause: "useEffect missing dependency in Component.tsx"
  artifacts:
    - path: "src/components/Component.tsx"
      issue: "useEffect missing dependency"
  missing:
    - "Add dependency to useEffect array"
  debug_session: ".planning/debug/slug.md"
```

Update frontmatter status to `diagnosed`.
Commit updated UAT.md.

### 6. Hand Off

Return to verify-work for automatic fix planning.
- Diagnosed gaps → planner creates targeted fix plans
- Inconclusive gaps → marked as "needs manual review"

## Failure Handling

| Scenario | Action |
|----------|--------|
| Can't find root cause | Mark as "needs manual review", continue |
| Investigation times out | Check debug session for partial progress |
| All investigations fail | Report for manual investigation, fall back to planning without root causes |
