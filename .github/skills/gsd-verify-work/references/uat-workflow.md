# UAT Workflow

Protocol for conducting user acceptance testing — presenting tests, recording responses, managing session state.

---

## Re-Verification Mode

Before starting a new session, check for prior verification results.

**Check for previous VERIFICATION.md or UAT.md** in the phase directory.

**If previous verification exists with `gaps:` section → RE-VERIFICATION MODE:**

1. Parse previous VERIFICATION.md/UAT.md frontmatter
2. Extract `must_haves` (truths, artifacts, key_links)
3. Extract `gaps` (items that failed)
4. Set re-verification mode = true
5. **Skip to test presentation** with optimization:
   - **Failed items:** Full verification (exists, substantive, wired)
   - **Passed items:** Quick regression check (existence + basic sanity only)

**If no previous verification OR no `gaps:` section → INITIAL MODE:**

Proceed with normal session management below.

---

## Must-Haves Establishment

Before creating tests, establish what must be verified. Three strategies, in priority order:

**Option A: Must-haves in PLAN frontmatter**

Check PLAN.md files for `must_haves:` in frontmatter. If found, use directly:
```yaml
must_haves:
  truths:
    - "User can see existing messages"
    - "User can send a message"
  artifacts:
    - path: "src/components/Chat.tsx"
      provides: "Message list rendering"
  key_links:
    - from: "Chat.tsx"
      to: "api/chat"
      via: "fetch in useEffect"
```

**Option B: Use Success Criteria from ROADMAP.md**

If no `must_haves` in frontmatter, use `gsd_roadmap_get_phase` to get the phase data. Parse `success_criteria`. If non-empty:
1. Use each Success Criterion directly as a **truth** (already observable, testable)
2. Derive **artifacts**: For each truth, "What must EXIST?" — map to file paths
3. Derive **key links**: For each artifact, "What must be CONNECTED?" — stubs hide here
4. Document must-haves before proceeding

Success Criteria from ROADMAP.md are the contract — they take priority over Goal-derived truths.

**Option C: Derive from phase goal (fallback)**

If no `must_haves` in frontmatter AND no `success_criteria` in ROADMAP:
1. State the goal from ROADMAP.md
2. Derive **truths**: "What must be TRUE?" — 3-7 observable, testable behaviors
3. Derive **artifacts**: For each truth, "What must EXIST?" — concrete file paths
4. Derive **key links**: For each artifact, "What must be CONNECTED?"
5. Document derived must-haves before proceeding

---

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
