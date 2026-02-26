# UAT Template

Template for `.planning/phases/XX-name/{phase_num}-UAT.md` — persistent UAT session tracking.

---

```markdown
---
status: testing | complete | diagnosed
phase: XX-name
source: [list of SUMMARY.md files tested]
started: [ISO timestamp]
updated: [ISO timestamp]
---

## Current Test
<!-- OVERWRITE each test — shows where we are -->

number: [N]
name: [test name]
expected: |
  [what user should observe]
awaiting: user response

## Tests

### 1. [Test Name]
expected: [observable behavior — what user should see]
result: [pending]

### 2. [Test Name]
expected: [observable behavior]
result: pass

### 3. [Test Name]
expected: [observable behavior]
result: issue
reported: "[verbatim user response]"
severity: major

### 4. [Test Name]
expected: [observable behavior]
result: skipped
reason: [why skipped]

## Summary

total: [N]
passed: [N]
issues: [N]
pending: [N]
skipped: [N]

## Gaps

<!-- YAML format for plan-phase --gaps consumption -->
- truth: "[expected behavior from test]"
  status: failed
  reason: "User reported: [verbatim response]"
  severity: blocker | major | minor | cosmetic
  test: [N]
  root_cause: ""     # Filled by diagnosis
  artifacts: []      # Filled by diagnosis
  missing: []        # Filled by diagnosis
  debug_session: ""  # Filled by diagnosis
```

---

## Section Rules

| Section | Mutation | Notes |
|---------|----------|-------|
| Frontmatter `status` | OVERWRITE | testing → complete → diagnosed |
| Frontmatter `phase` | IMMUTABLE | Set on creation |
| Frontmatter `source` | IMMUTABLE | SUMMARY files tested |
| Frontmatter `started` | IMMUTABLE | Set on creation |
| Frontmatter `updated` | OVERWRITE | Update on every change |
| Current Test | OVERWRITE | Overwritten each test transition |
| Tests | OVERWRITE result | Update result field per test |
| Summary | OVERWRITE counts | Update after each response |
| Gaps | APPEND | Add new gap on issue; diagnosis fills root_cause/artifacts/missing |

## Lifecycle

1. **Creation:** `/gsd-verify-work` starts new session → tests extracted from SUMMARYs → all pending
2. **During testing:** Present test → user responds → update result → next test
3. **Completion:** status → complete, Current Test → `[testing complete]`, commit
4. **After diagnosis:** Gaps updated with root causes, status → diagnosed
5. **Resume after /clear:** Read frontmatter → Current Test → first pending → continue

## Severity Guide

Inferred from user's natural language, never asked:

| User describes | Severity |
|----------------|----------|
| Crash, error, exception, fails, unusable | blocker |
| Doesn't work, nothing happens, wrong, missing | major |
| Works but..., slow, weird, minor | minor |
| Color, font, spacing, alignment, visual | cosmetic |
| Default | major |
