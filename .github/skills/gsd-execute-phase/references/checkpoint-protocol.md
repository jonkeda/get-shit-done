# Checkpoint Protocol

How to handle checkpoint tasks during plan execution.

## Core Principle

Claude automates everything with CLI/API. Checkpoints are for verification and decisions only, not manual work.

**Golden rules:**
1. If Claude can run it, Claude runs it
2. Claude sets up the verification environment (start dev servers, seed databases)
3. User only does what requires human judgment (visual checks, UX evaluation)
4. Secrets come from user, automation comes from Claude
5. Auto-mode bypasses verification/decision checkpoints (human-action still stops)

## Checkpoint Types

### checkpoint:human-verify (90% of checkpoints)

**When:** Claude completed automated work, human confirms it works.

**Use for:** Visual UI checks, interactive flows, functional verification, audio/video quality, animation smoothness, accessibility testing.

**Key pattern:** Claude starts dev server BEFORE the checkpoint — user only visits URLs.

```xml
<task type="checkpoint:human-verify" gate="blocking">
  <what-built>[What Claude automated] — server running at [URL]</what-built>
  <how-to-verify>Visit [URL] and verify: [visual checks, NO CLI commands]</how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>
```

### checkpoint:decision (9%)

**When:** Human must make choice that affects implementation direction.

**Use for:** Technology selection, architecture decisions, design choices, feature prioritization.

```xml
<task type="checkpoint:decision" gate="blocking">
  <decision>[What's being decided]</decision>
  <context>[Why this decision matters]</context>
  <options>
    <option id="a"><name>[Name]</name><pros>[Benefits]</pros><cons>[Tradeoffs]</cons></option>
    <option id="b"><name>[Name]</name><pros>[Benefits]</pros><cons>[Tradeoffs]</cons></option>
  </options>
  <resume-signal>Select: a or b</resume-signal>
</task>
```

### checkpoint:human-action (1% — rare)

**When:** Action has NO CLI/API and requires human-only interaction, or Claude hit an authentication gate.

**Use only for:** Email verification links, SMS 2FA codes, manual account approvals, credit card 3D Secure flows, OAuth web approvals.

## Auto-Mode Handling

When `workflow.auto_advance` is true:
- **human-verify** → Auto-approve with `"approved"`
- **decision** → Auto-select first option
- **human-action** → Still present to user (auth gates cannot be automated)

## Checkpoint Flow (Standard)

1. Plan execution reaches checkpoint task → STOP
2. Return structured state: completed tasks, current task + blocker, checkpoint details, what's awaited
3. Present to user with checkpoint box format
4. User responds: "approved" / "done" / issue description / selection
5. Spawn fresh continuation agent (NOT resume) with completed tasks state
6. Continuation agent verifies previous commits, continues from resume point

**Why fresh agent, not resume:** Fresh agents with explicit state are more reliable than resume serialization.

## Presentation Format

```
╔══════════════════════════════════════════════════════════════╗
║  CHECKPOINT: [Type]                                          ║
╚══════════════════════════════════════════════════════════════╝

**Plan:** {plan_id} {plan_name}
**Progress:** {completed}/{total} tasks complete

[Checkpoint details]

──────────────────────────────────────────────────────────────
→ [Resume signal]
──────────────────────────────────────────────────────────────
```
