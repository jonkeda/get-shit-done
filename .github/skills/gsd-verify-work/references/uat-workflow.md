# UAT Workflow

Protocol for conducting user acceptance testing — presenting tests, recording responses, managing session state.

## Session Management

### New Session
1. Extract tests from SUMMARY.md files (user-observable outcomes only)
2. Create UAT.md with all tests as `[pending]`
3. Set `Current Test` to test 1
4. Begin presenting tests

### Resume Session
1. Read UAT.md frontmatter for phase and status
2. Read `Current Test` section for position
3. Find first test with `result: [pending]`
4. Display progress so far, continue from pending test

### Multiple Sessions
If multiple phases have active UAT files:
- Display table: phase, status, current test, progress
- User picks a number to resume or provides phase for new session

## Test Presentation

One test at a time. Show expected behavior, ask if reality matches.

```
╔══════════════════════════════════════════════════════════════╗
║  CHECKPOINT: Verification Required                           ║
╚══════════════════════════════════════════════════════════════╝

**Test {N}: {name}**

{expected behavior — specific, observable}

──────────────────────────────────────────────────────────────
→ Type "pass" or describe what's wrong
──────────────────────────────────────────────────────────────
```

## Response Processing

### Pass
User: "yes", "y", "ok", "pass", "next", "approved", empty
```yaml
result: pass
```

### Skip
User: "skip", "can't test", "n/a"
```yaml
result: skipped
reason: [user's reason if provided]
```

### Issue
User: anything else — treat as issue description
```yaml
result: issue
reported: "[verbatim user response]"
severity: [inferred — never ask]
```

Append to Gaps section:
```yaml
- truth: "[expected behavior]"
  status: failed
  reason: "User reported: [verbatim]"
  severity: [inferred]
  test: [N]
  root_cause: ""     # Filled by diagnosis
  artifacts: []      # Filled by diagnosis
  missing: []        # Filled by diagnosis
  debug_session: ""  # Filled by diagnosis
```

## Severity Inference

| User describes | Severity |
|----------------|----------|
| Crash, error, exception, fails, unusable | blocker |
| Doesn't work, nothing happens, wrong, missing | major |
| Works but..., slow, weird, minor | minor |
| Color, font, spacing, alignment, visual | cosmetic |
| Default | major |

## Session Completion

When all tests processed:
1. status → `complete`
2. Current Test → `[testing complete]`
3. Commit UAT.md
4. Display summary: passed/issues/skipped counts
5. If issues > 0 → proceed to diagnosis automatically
