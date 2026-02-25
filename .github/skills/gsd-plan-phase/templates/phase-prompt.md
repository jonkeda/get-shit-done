# Phase Prompt (PLAN.md) Template

Template for `.planning/phases/XX-name/{phase}-{plan}-PLAN.md` — executable phase plans.

**Naming:** `{phase}-{plan}-PLAN.md` (e.g., `01-02-PLAN.md` for Phase 1, Plan 2)

---

```markdown
---
phase: XX-name
plan: NN
type: execute
wave: N                     # Execution wave (1, 2, 3...). Pre-computed at plan time.
depends_on: []              # Plan IDs this plan requires (e.g., ["01-01"])
files_modified: []          # Files this plan modifies
autonomous: true            # false if plan has checkpoints requiring user interaction
requirements: []            # REQUIRED — Requirement IDs from ROADMAP this plan addresses. MUST NOT be empty.
user_setup: []              # Human-required setup Claude cannot automate

must_haves:
  truths: []                # Observable behaviors that must be true for goal achievement
  artifacts: []             # Files that must exist with real implementation
  key_links: []             # Critical connections between artifacts
---

<objective>
[What this plan accomplishes]

Purpose: [Why this matters for the project]
Output: [What artifacts will be created]
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

[Only reference prior plan SUMMARYs if genuinely needed]
[Relevant source files:]
@src/path/to/relevant.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: [Action-oriented name]</name>
  <files>path/to/file.ext, another/file.ext</files>
  <action>[Specific implementation — what to do, how to do it, what to avoid and WHY]</action>
  <verify>[Command or check to prove it worked]</verify>
  <done>[Measurable acceptance criteria]</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>[What Claude built] — server running at [URL]</what-built>
  <how-to-verify>Visit [URL] and verify: [visual checks only]</how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

<task type="checkpoint:decision" gate="blocking">
  <decision>[What needs deciding]</decision>
  <context>[Why this decision matters]</context>
  <options>
    <option id="option-a"><name>[Name]</name><pros>[Benefits]</pros><cons>[Tradeoffs]</cons></option>
    <option id="option-b"><name>[Name]</name><pros>[Benefits]</pros><cons>[Tradeoffs]</cons></option>
  </options>
  <resume-signal>Select: option-a or option-b</resume-signal>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] [Specific test command]
- [ ] [Build/type check passes]
- [ ] [Behavior verification]
</verification>

<success_criteria>
- All tasks completed
- All verification checks pass
- No errors or warnings introduced
- [Plan-specific criteria]
</success_criteria>

<output>
After completion, create `.planning/phases/XX-name/{phase}-{plan}-SUMMARY.md`
</output>
```

---

## Frontmatter Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `phase` | Yes | Phase identifier (e.g., `01-foundation`) |
| `plan` | Yes | Plan number within phase |
| `type` | Yes | `execute` for standard, `tdd` for test-driven |
| `wave` | Yes | Execution wave number (pre-computed) |
| `depends_on` | Yes | Plan IDs this plan requires |
| `files_modified` | Yes | Files this plan touches |
| `autonomous` | Yes | `true` if no checkpoints, `false` if has checkpoints |
| `requirements` | Yes | Requirement IDs from ROADMAP — every ID MUST appear in at least one plan |
| `must_haves` | Yes | Goal-backward verification: truths, artifacts, key_links |

## Wave Rules

- Wave 1: `depends_on: []` — can run in parallel
- Wave 2+: depends on earlier waves — `wave = max(deps) + 1`
- No file conflicts within a wave
