---
category: 'RPI'
description: "Initiates research for implementation planning based on user requirements"
agent: 'task-researcher'
maturity: stable
defaultEnabled: true
version: '2.2.61'
---

# Task Research

## Inputs

* ${input:chat:true}: (Optional, defaults to true) Include conversation context for research analysis
* ${input:topic}: (Required) Primary topic or focus area, from user prompt or inferred from conversation
* ${input:brief}: (Optional) Path to a research brief from `/task-question`

## Tool Availability

This workflow dispatches subagents for all research activities using the runSubagent tool.

* When runSubagent is available, proceed with subagent dispatch as described in each step.
* When runSubagent is unavailable, inform the user that subagent dispatch is required for this workflow and stop.

## Required Steps

**Important requirements**, repeat to yourself these important requirements:

* **Important**, always be thorough and accurate.
* Avoid making the research document overly verbose when not required.
* Make sure the research document is complete and provides evidence.
* Whenever unsure about anything then have runSubagent collect more research with any of the tools that you have available.
* Repeat steps and phases as needed to be thorough and accurate.

### Step 1: Define Research Scope

Identify what the user wants to accomplish:

* Check for a research brief at ${input:brief} or in `.spxcode/Task/{{NN}}_{{TaskName}}/research/` matching `*-research-brief.md`.
* When a research brief is found:
  * Use its Validated Research Questions as the primary scope.
  * Use its Agreed Scope and Priority Order to guide investigation.
* When no research brief is found:
  * Extract the primary objective from user prompt and conversation context.
  * Note features, behaviors, constraints, and exclusions.
  * Formulate specific questions the research must answer.

### Step 2: Locate or Create Research Document

Check `.spxcode/Task/{{NN}}_{{TaskName}}/research/` for existing files matching `{{NN}}-*-research.md`:

* Extend an existing document when relevant to the topic.
* Create a new document at `.spxcode/Task/{{NN}}_{{TaskName}}/research/{{NN}}-<topic>-research.md` otherwise. Scan the folder for existing numbered files and use the next available number.

### Step 3: Dispatch Research Subagents

Use the runSubagent tool to dispatch subagents for all research activities. Subagents can run in parallel when investigating independent topics.

#### Subagent Instructions

Provide each subagent with the following:

* Read and follow `.github/instructions/` files relevant to the research topic.
* Reference the task-researcher agent for research patterns and tool usage.
* Assign a specific research question or investigation target.
* Use semantic_search, grep_search, file reads, and external documentation tools.
* Write findings to `.spxcode/Task/{{NN}}_{{TaskName}}/subagent/{{NN}}-<topic>-research.md`.
* Include source references, file paths with line numbers, and evidence.

#### Subagent Response Format

Each subagent returns a structured response:

```markdown
## Research Summary

**Question:** {{research_question}}
**Status:** Complete | Incomplete | Blocked
**Output File:** {{file_path}}

### Key Findings

* {{finding_1}}
* {{finding_2}}

### Clarifying Questions (if any)

* {{question_for_parent}}
```

Subagents may respond with clarifying questions when instructions are ambiguous.

### Step 4: Synthesize Findings

Consolidate subagent outputs into the main research document:

* Add objectives to **Task Implementation Requests**.
* Record leads in **Potential Next Research**.
* Remove or revise content when new findings contradict earlier assumptions.
* Dispatch additional subagents when gaps are identified.

### Step 5: Return Findings

Summarize research outcomes:

* Highlight key discoveries and their implementation impact.
* List remaining alternatives needing decisions.
* When the research document contains a Decisions section with open alternatives, offer the user a choice: `/task-decide` to review decisions, or `/task-plan` to accept pre-selected defaults and proceed.
* When no open decisions exist, provide the research document path for direct handoff to `/task-plan`.

version: '2.2.61'
---

Invoke task-researcher mode and proceed with the Required Steps.
