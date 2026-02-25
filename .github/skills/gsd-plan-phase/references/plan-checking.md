# Plan Checking

Protocol for invoking the plan-checker agent and interpreting verification results.

## Plan-Checker Delegation

Read `.github/agents/gsd-plan-checker.agent.md` and follow its instructions.

## Verification Context

Provide the checker with:
- All PLAN.md files in the phase directory
- ROADMAP.md (phase goal and requirements)
- REQUIREMENTS.md (full requirement specs)
- CONTEXT.md (user decisions — locked/discretion/deferred)
- RESEARCH.md (including Validation Architecture if present)
- Phase requirement IDs that MUST all be covered

## 8 Verification Dimensions

### Dimension 1: Requirement Coverage
Does every phase requirement have task(s) addressing it? Every requirement ID from ROADMAP must appear in at least one plan's `requirements` frontmatter field. Missing coverage is a **blocker**.

### Dimension 2: Task Completeness
Does every `type="auto"` task have Files + Action + Verify + Done? Actions must be specific (not "implement auth"), verify must be runnable, done must be measurable.

### Dimension 3: Dependency Correctness
Are plan dependencies valid and acyclic? Check `depends_on` references exist, no circular deps, wave numbers consistent with dependency ordering.

### Dimension 4: Key Links Planned
Are artifacts wired together, not just created in isolation? Components must import/call APIs, APIs must query databases, forms must have submit handlers. Isolated artifacts are a gap.

### Dimension 5: Scope Sanity
Will plans complete within context budget?
- Target: 2-3 tasks/plan, 5-8 files/plan
- Warning: 4 tasks or 10 files
- Blocker: 5+ tasks or 15+ files → must split

### Dimension 6: Verification Derivation
Do `must_haves` trace back to phase goal? Truths must be user-observable (not implementation details). Artifacts must support truths. Key links must connect artifacts.

### Dimension 7: Context Compliance (if CONTEXT.md exists)
Do plans honor locked decisions from discuss-phase? Are deferred ideas excluded? Plans contradicting user decisions or including deferred items are **blockers**.

### Dimension 8: Nyquist Compliance (if enabled)
Check automated verify presence, feedback latency, sampling continuity, and Wave 0 completeness. Only runs when `workflow.nyquist_validation` is true and RESEARCH.md has a Validation Architecture section.

## Structured Output Markers

The checker produces exactly one of:

### `## VERIFICATION PASSED`
All dimensions pass. Plans are ready for execution.

### `## ISSUES FOUND`
Contains structured issue list:
```yaml
issue:
  dimension: {dimension_name}
  severity: blocker | warning
  description: "{what's wrong}"
  plan: "{plan_id}"
  fix_hint: "{how to fix}"
```

## Severity Levels

| Severity | Meaning | Action |
|----------|---------|--------|
| **blocker** | Plans cannot execute correctly | Must fix before proceeding |
| **warning** | Plans will work but quality may suffer | Fix if possible, can proceed |
