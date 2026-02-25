# Getting Started with GSD for Bank Gateway Ports

## Project Context

You need to port **multiple bank gateway applications**:

1. **One gateway** is built from scratch on a **new framework** (the reference implementation)
2. **Twelve gateways** need to be ported from their **V1 versions** to this new framework

The first gateway establishes the architecture, patterns, and conventions. The remaining twelve follow the same structure but each has its own bank-specific logic from V1.

---

## Prerequisites

1. **VS Code** with GitHub Copilot (agent mode)
2. **GSD installed** — run `npx gsd-copilot@latest` in the gateway workspace
3. **Git** configured in the workspace
4. Have available:
   - The new framework / first gateway source code
   - V1 gateway source code for all 12 gateways (or access to them)
   - Bank API specifications or integration documentation

---

## Strategy: Two-Stage Approach

This project naturally splits into two stages:

### Stage 1 — Build the Reference Gateway (New Framework)

Build the first gateway on the new framework. This establishes:
- Architecture patterns
- Shared abstractions (base classes, interfaces, common middleware)
- Test infrastructure
- Deployment pipeline
- Documentation that the 12 ports will follow

### Stage 2 — Port the 12 V1 Gateways

Each V1 gateway port follows the same pattern, using the reference gateway as a template. GSD can handle these as milestones — one per gateway, or grouped logically.

---

## Step-by-Step Guide

### Stage 1: Build the Reference Gateway

#### 1a. Map Existing Code (If Any)

If the new framework or shared infrastructure already exists:

```
/gsd-map-codebase
```

#### 1b. Initialize the Project

```
/gsd-new-project
```

During the interview, explain:
- **Goal:** Build a bank gateway on the new framework — this will be the reference implementation for 12 subsequent ports
- **Architecture:** The framework's patterns, how gateways should be structured
- **What the gateway does:** Connection to bank APIs, transaction processing, reconciliation, etc.
- **Shared vs bank-specific:** What will be common infrastructure vs what varies per bank
- **Testing:** How gateways should be tested, integration test patterns
- **The bigger picture:** After this gateway is complete, 12 V1 gateways will be ported to match this architecture

**Key point:** Tell GSD that reusability and clear separation of bank-specific vs shared code is critical, because this architecture will be replicated 12 times.

#### 1c. Follow the Standard GSD Cycle

```
/gsd-discuss-phase 1    ← share preferences
/gsd-plan-phase 1       ← research + plan
/gsd-execute-phase 1    ← build it
/gsd-verify-work 1      ← verify
```

Repeat for each phase until the reference gateway is complete.

#### 1d. Complete the Milestone

```
/gsd-audit-milestone
/gsd-complete-milestone
```

---

### Stage 2: Port the 12 V1 Gateways

Now you have a working reference gateway. Each V1 port follows a repeatable pattern.

#### Option A: One Milestone Per Gateway (Recommended for Complex Gateways)

For each of the 12 gateways:

```
/gsd-new-milestone "Port Gateway: BankName"
```

Then initialize with context:

```
/gsd-new-project
```

During the interview for each gateway, explain:
- **Goal:** Port BankName gateway from V1 to the new framework
- **Reference:** Point to the completed reference gateway as the architectural template
- **V1 source:** Where the existing V1 implementation lives
- **Bank-specific logic:** What's unique to this bank (API quirks, data formats, auth flows)
- **What carries over:** Shared infrastructure from the reference gateway
- **What changes:** Bank-specific adapters, API clients, data transformations

GSD will generate a focused roadmap for that specific port. A typical structure:

| Phase | Focus |
|-------|-------|
| 1 | Scaffold from reference gateway template, configure bank-specific settings |
| 2 | Port bank API client / connection layer from V1 |
| 3 | Port transaction processing / business logic from V1 |
| 4 | Port data transformations / reconciliation from V1 |
| 5 | Integration tests with bank sandbox/mock |

Then execute the standard cycle for each phase and complete the milestone.

#### Option B: Batch Similar Gateways (For Simpler Ports)

If many V1 gateways are structurally similar, you can group them:

```
/gsd-new-milestone "Port Gateways: Batch 1 (Bank A, Bank B, Bank C)"
```

During project init, explain all three gateways and their similarities/differences. GSD will create phases that handle shared work first, then bank-specific work.

#### Option C: Single Milestone with Phases Per Gateway

If the ports are straightforward:

```
/gsd-new-milestone "Port All V1 Gateways"
```

Use one phase per gateway (or two phases for complex ones). Add phases as needed:

```
/gsd-add-phase "Port BankA gateway from V1"
/gsd-add-phase "Port BankB gateway from V1"
/gsd-add-phase "Port BankC gateway from V1"
...
```

---

## Tips for This Specific Project

### Establish the Pattern First

The reference gateway is the most important milestone. Invest in:
- Clear interface boundaries between shared and bank-specific code
- Well-documented abstractions (base gateway class, API client interface, etc.)
- Comprehensive test patterns that each port can replicate
- A "port checklist" that GSD can reference for each subsequent gateway

### Use `/gsd-discuss-phase` to Define the Port Template

Before the first V1 port, discuss with GSD what the standard port process looks like:
- Which files need to be created for each gateway?
- Which V1 components map to which new framework components?
- What's the expected testing pattern per gateway?

Save this as the CONTEXT.md for your first port phase — GSD will learn the pattern.

### Keep V1 Source Accessible

For each port, GSD needs to read the V1 implementation to understand what to port. Options:
- Keep all V1 gateways in the workspace (e.g., `legacy/` folder)
- Open the V1 source in a side-by-side workspace
- Copy relevant V1 files into a `references/` folder per port

### Track Progress Across Gateways

Use milestones to track which gateways are complete:

```
/gsd-progress               ← current gateway status
/gsd-complete-milestone      ← mark gateway as done
/gsd-new-milestone "Next"    ← start the next one
```

### Handle Bank-Specific Quirks

Each bank will have unique requirements. During `/gsd-discuss-phase` for each port:
- Highlight what's different about this bank's API
- Point out V1 workarounds that need to be preserved or replaced
- Identify any new requirements not in V1

### Parallelize When Possible

If multiple people are working on ports simultaneously, each can run GSD in a separate branch:
- Use `/gsd-settings` → branching strategy: `phase` or `milestone`
- Each developer ports a different gateway in their own branch
- Merge when milestone completes

---

## Quick Reference

| What | Command |
|------|---------|
| Map existing code | `/gsd-map-codebase` |
| Start project (reference gateway) | `/gsd-new-project` |
| Start new gateway port | `/gsd-new-milestone "Port: BankName"` |
| Check status | `/gsd-progress` |
| Discuss preferences | `/gsd-discuss-phase N` |
| Plan a phase | `/gsd-plan-phase N` |
| Execute a phase | `/gsd-execute-phase N` |
| Verify results | `/gsd-verify-work N` |
| Add a port phase | `/gsd-add-phase "Port BankX from V1"` |
| Complete a gateway | `/gsd-audit-milestone` / `/gsd-complete-milestone` |
| Save/restore session | `/gsd-pause-work` / `/gsd-resume-work` |
