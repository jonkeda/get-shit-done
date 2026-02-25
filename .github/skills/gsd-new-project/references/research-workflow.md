# Research Workflow Reference

Research delegation protocol for `/gsd-new-project`. Spawns researchers to investigate domain ecosystem before defining requirements.

## Overview

Research produces 5 files in `.planning/research/`:
- `STACK.md` — Standard technology stack for the domain
- `FEATURES.md` — Table stakes vs differentiating features
- `ARCHITECTURE.md` — Component boundaries, data flow, build order
- `PITFALLS.md` — Common mistakes and prevention strategies
- `SUMMARY.md` — Synthesis of all research (created last)

## Execution Protocol

The 4 research tasks are independent but executed sequentially with progress updates (to manage context). The synthesis task runs after all 4 complete.

### Step 1: Determine milestone context

- If no "Validated" requirements in PROJECT.md → **Greenfield** (building from scratch)
- If "Validated" requirements exist → **Subsequent milestone** (adding to existing app)

### Step 2: Execute research tasks

For each focus area, read `.github/agents/gsd-project-researcher.agent.md` to load the researcher's role and methodology. Then, acting as the project-researcher:

**Focus: Stack**
- Question: "What's the standard 2025 stack for {domain}?"
- Be prescriptive: specific libraries with versions, clear rationale, what NOT to use
- Output: `.planning/research/STACK.md`

**Focus: Features**
- Question: "What features do {domain} products have? What's table stakes vs differentiating?"
- Categorize: table stakes (must have), differentiators (competitive advantage), anti-features (deliberately NOT build)
- Note complexity and inter-feature dependencies
- Output: `.planning/research/FEATURES.md`

**Focus: Architecture**
- Question: "How are {domain} systems typically structured?"
- Include: component boundaries, data flow, suggested build order
- Output: `.planning/research/ARCHITECTURE.md`

**Focus: Pitfalls**
- Question: "What do {domain} projects commonly get wrong?"
- For each pitfall: warning signs, prevention strategy, which phase should address it
- Output: `.planning/research/PITFALLS.md`

### Step 3: Synthesize

After all 4 research tasks complete:
1. Read `.github/agents/gsd-research-synthesizer.agent.md` to load the synthesizer role
2. Acting as the synthesizer: read all 4 research files, produce `.planning/research/SUMMARY.md`

### Step 4: Commit

```
use_tool(gsd_commit, {
  message: "docs: research domain ecosystem",
  files: [
    ".planning/research/STACK.md",
    ".planning/research/FEATURES.md",
    ".planning/research/ARCHITECTURE.md",
    ".planning/research/PITFALLS.md",
    ".planning/research/SUMMARY.md"
  ]
})
```

### Step 5: Display key findings

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► RESEARCH COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Key Findings

**Stack:** {from SUMMARY.md}
**Table Stakes:** {from SUMMARY.md}
**Watch Out For:** {from SUMMARY.md}

Files: .planning/research/
```

## Quality Gates per Focus

**Stack:**
- [ ] Versions are current (verify with official docs, not training data)
- [ ] Rationale explains WHY, not just WHAT
- [ ] Confidence levels assigned to each recommendation

**Features:**
- [ ] Categories are clear (table stakes vs differentiators vs anti-features)
- [ ] Complexity noted for each feature
- [ ] Dependencies between features identified

**Architecture:**
- [ ] Components clearly defined with boundaries
- [ ] Data flow direction explicit
- [ ] Build order implications noted

**Pitfalls:**
- [ ] Pitfalls are specific to this domain (not generic advice)
- [ ] Prevention strategies are actionable
- [ ] Phase mapping included where relevant
