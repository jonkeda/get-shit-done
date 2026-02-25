---
applyTo: ".planning/phases/**/*-RESEARCH.md"
---

This is GSD phase research. It contains ecosystem knowledge, architecture patterns, API references, and common pitfalls gathered before planning begins.

**Rules:**
- Created by the research workflow (`/gsd-research-phase` or `/gsd-plan-phase`)
- Source confidence levels are documented: HIGH (official docs), MEDIUM (community), LOW (inferred)
- Consumed by the planner agent when creating execution plans
- Do not modify after planning begins — research is a snapshot in time
- Research findings inform plan structure but don't override user decisions in CONTEXT.md

**Structure:**
- Technology/library analysis with version compatibility
- Architecture patterns and trade-offs
- Common pitfalls and mitigations
- API references and usage examples
- Performance considerations
