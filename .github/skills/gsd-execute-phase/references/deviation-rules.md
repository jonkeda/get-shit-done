# Deviation Rules

Rules for handling unplanned work discovered during plan execution. Applied automatically by the executor agent.

## The 4 Rules

### Rule 1: Auto-Fix Bugs
**Trigger:** Code doesn't work as intended — broken behavior, errors, incorrect output.

**Examples:** Wrong queries, logic errors, type errors, null pointer exceptions, broken validation, security vulnerabilities, race conditions, memory leaks.

**Action:** Fix → test → verify → track as `[Rule 1 - Bug]`
**Permission:** Automatic — no user approval needed.

### Rule 2: Auto-Add Missing Critical Functionality
**Trigger:** Code missing essential features for correctness, security, or basic operation.

**Examples:** Missing error handling, no input validation, missing null checks, no auth on protected routes, missing authorization, no CSRF/CORS, no rate limiting, missing DB indexes, no error logging.

**Action:** Add → test → verify → track as `[Rule 2 - Missing Critical]`
**Permission:** Automatic.

### Rule 3: Auto-Fix Blocking Issues
**Trigger:** Something prevents completing the current task.

**Examples:** Missing dependency, wrong types, broken imports, missing env var, DB connection error, build config error, missing referenced file, circular dependency.

**Action:** Fix blocker → verify task proceeds → track as `[Rule 3 - Blocking]`
**Permission:** Automatic.

### Rule 4: Ask About Architectural Changes
**Trigger:** Fix requires significant structural modification.

**Examples:** New DB table (not column), major schema changes, new service layer, switching libraries/frameworks, changing auth approach, new infrastructure, breaking API changes.

**Action:** STOP → present decision to user with proposed change, rationale, impact, alternatives.
**Permission:** User approval required.

## Priority

```
Rule 4 (STOP) > Rules 1-3 (auto) > unsure → Rule 4
```

## Edge Cases

| Scenario | Rule |
|----------|------|
| Missing validation | R2 (security) |
| Crashes on null | R1 (bug) |
| Need new DB table | R4 (architectural) |
| Need new DB column | R1/R2 (depends on context) |

**Heuristic:** Affects correctness/security/completion? → R1-3. Maybe? → R4.

## Scope Boundary

Only auto-fix issues **directly caused by the current task's changes**. Pre-existing warnings, linting errors, or failures in unrelated files are out of scope — log to `deferred-items.md`.

## Fix Attempt Limit

After 3 auto-fix attempts on a single task:
- STOP fixing
- Document remaining issues in SUMMARY.md under "Deferred Issues"
- Continue to the next task

## Documentation

Every deviation appears in SUMMARY.md:

```markdown
## Deviations from Plan

### Auto-fixed Issues

**1. [Rule N - Category] Brief description**
- **Found during:** Task [N]
- **Issue:** [What was wrong]
- **Fix:** [What was done]
- **Files modified:** [paths]
- **Verification:** [How verified]
- **Committed in:** [hash]
```

No deviations? → `"None — plan executed exactly as written."`
