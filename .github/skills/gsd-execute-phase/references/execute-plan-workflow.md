# Execute Plan Workflow

Per-plan execution protocol — how the executor agent implements a single PLAN.md.

## Execution Flow

1. **Load context:** Read PLAN.md, STATE.md, config.json, CLAUDE.md (if exists)
2. **Record start time** for duration tracking
3. **Determine execution pattern:**
   - **Pattern A (autonomous):** No checkpoints → execute all tasks, create SUMMARY, commit
   - **Pattern B (segmented):** Has checkpoints → execute segment-by-segment, pause at checkpoints
   - **Pattern C (continuation):** Resuming after checkpoint → verify previous commits, continue from resume point
4. **Execute tasks** sequentially within the plan
5. **Create SUMMARY.md** with accomplishments, commits, deviations, files modified
6. **Self-check:** Verify key files exist, git commits present

## Per-Task Execution

For each `type="auto"` task:
1. Read `<action>` for implementation instructions
2. If `tdd="true"` → RED-GREEN-REFACTOR cycle
3. Implement with deviation rules applied automatically
4. Handle auth errors as authentication gates (not failures)
5. Run `<verify>` check
6. Confirm `<done>` criteria met
7. Commit atomically: `{type}({phase}-{plan}): {description}`
8. Record commit hash for SUMMARY

## Task Commit Protocol

After each task, commit immediately with individual `git add` (never `git add .`):

| Commit Type | When | Example |
|-------------|------|---------|
| `feat` | New functionality | `feat(08-02): create user registration endpoint` |
| `fix` | Bug fix | `fix(08-02): correct email validation regex` |
| `test` | Test-only (TDD RED) | `test(08-02): add failing test for password hashing` |
| `refactor` | No behavior change | `refactor(08-02): extract validation to helper` |
| `docs` | Documentation | `docs(08-02): add API docs` |
| `chore` | Config/deps | `chore(08-02): add bcrypt dependency` |

## SUMMARY.md Creation

After all tasks complete, write SUMMARY.md with:
- Performance metrics (duration, task count, file count)
- Accomplishments (substantive outcomes, not "phase complete")
- Task commits with hashes
- Files created/modified
- Decisions made
- Deviations from plan (if any)
- Issues encountered (if any)
- Next phase readiness

## Self-Check

Before returning, verify:
- First 2 files from `key-files.created` exist on disk
- `git log --oneline --grep="{phase}-{plan}"` returns ≥1 commit
- Append `## Self-Check: PASSED` or `## Self-Check: FAILED` to SUMMARY
