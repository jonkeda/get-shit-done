---
template: debug-session
output: ".planning/debug/{timestamp}-{slug}.md"
---

# Debug Session Template

Active debug session tracking. The file IS the debugging brain — Claude can resume perfectly from any interruption by reading this file.

---

## Template

```markdown
---
status: gathering
trigger: "{verbatim_user_input}"
created: {timestamp}
updated: {timestamp}
---

## Current Focus
<!-- OVERWRITE on each update — always reflects NOW -->

hypothesis: {current theory being tested}
test: {how testing it}
expecting: {what result means if true/false}
next_action: {immediate next step}

## Symptoms
<!-- Written during gathering, then immutable -->

expected: {what should happen}
actual: {what actually happens}
errors: {error messages if any}
reproduction: {how to trigger}
started: {when it broke / always broken}

## Eliminated
<!-- APPEND only — prevents re-investigating after context reset -->

## Evidence
<!-- APPEND only — facts discovered during investigation -->

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause:
fix:
verification:
files_changed: []
```

## Section Rules

| Section | Operation | Purpose |
|---|---|---|
| **Frontmatter** | `status`: OVERWRITE, `trigger`: IMMUTABLE, `created`: IMMUTABLE, `updated`: OVERWRITE | Track phase and identity |
| **Current Focus** | OVERWRITE entirely each update | Resume point after context reset |
| **Symptoms** | IMMUTABLE after gathering | Reference point for the problem |
| **Eliminated** | APPEND only | Prevent re-investigating dead ends |
| **Evidence** | APPEND only | Build the case for root cause |
| **Resolution** | OVERWRITE as understanding evolves | Track confirmed fix |

## Status Values

| Status | Meaning |
|---|---|
| `gathering` | Collecting symptoms from user |
| `investigating` | Forming and testing hypotheses |
| `fixing` | Root cause found, applying fix |
| `verifying` | Fix applied, confirming it works |
| `awaiting_human_verify` | Needs user to confirm fix works |
| `resolved` | Issue fixed and verified |

## Lifecycle

1. **Created** — when `/gsd-debug` is called. Status: `gathering`
2. **Symptoms gathered** — user answers 5 questions. Status: `investigating`
3. **Investigation** — hypotheses formed, tested, eliminated. Evidence accumulates.
4. **Root cause found** — Status: `fixing`. Resolution.root_cause filled.
5. **Fix applied** — Status: `verifying`. Resolution.fix filled.
6. **Self-verification** — Status: `awaiting_human_verify`. Request user confirmation.
7. **Resolved** — Status: `resolved`. File moved to `.planning/debug/resolved/`

## Resume Behavior

When reading this file after a context reset:

1. Parse frontmatter → know status
2. Read Current Focus → know exactly what was happening
3. Read Eliminated → know what NOT to retry
4. Read Evidence → know what's been learned
5. Continue from `next_action`

## Evidence Entry Format

```markdown
- timestamp: {ISO timestamp}
  checked: {what was examined}
  found: {what was observed}
  implication: {what this means}
```

## Eliminated Entry Format

```markdown
- hypothesis: {theory that was wrong}
  evidence: {what disproved it}
  timestamp: {when eliminated}
```

## Size Constraint

Keep debug files focused:
- Evidence entries: 1-2 lines each, just the facts
- Eliminated: brief — hypothesis + why it failed
- No narrative prose — structured data only

If evidence grows very large (10+ entries), check Eliminated to ensure you're not re-treading.
