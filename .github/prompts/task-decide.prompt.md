---
category: 'RPI'
description: "Review and finalize research decisions before implementation planning"
agent: 'task-researcher'
maturity: stable
defaultEnabled: true
version: '2.2.61'
---

# Task Decide

## Inputs

* ${input:chat:true}: (Optional, defaults to true) Include conversation context
* ${input:research}: (Optional) Path to the research document containing the Decisions section

## Required Steps

### Step 1: Locate Research Document

Find the research document with decisions to review:

* Use ${input:research} when provided.
* Otherwise check `.spxcode/Task/{{NN}}_{{TaskName}}/research/` for the most recent `*-research.md` file.
* Read the Decisions section from the research document.
* When no Decisions section exists, inform the user that no open decisions were found and suggest proceeding directly to `/task-plan`.

### Step 2: Present Decisions

Walk through each decision entry in the Decisions section:

* Show the decision title, context, and current pre-selected recommendation.
* Explain the recommendation rationale and trade-offs of alternatives.
* Reference the linked Technical Scenario section for supporting evidence.
* Ask the user to confirm the pre-selected option, choose an alternative, or discuss further.

When the user wants to discuss a decision:

* Answer questions using evidence from the research document and Technical Scenarios.
* Dispatch subagents via `runSubagent` for additional investigation when the existing research does not cover the user's concern.
* Present updated findings before requesting the user's final selection.

### Step 3: Lock Decisions

After the user confirms or changes each decision:

* Update the Decisions section in the research document: set the selected option to `[x]` and all others to `[ ]`.
* When the user selects "Other:", capture their specification and add it as the checked option.
* Verify all decision entries have exactly one `[x]` selection.

### Step 4: Handoff

When all decisions are locked, provide a structured summary:

| 📊 Decision Summary     |                                         |
|-------------------------|-----------------------------------------|
| **Research Document**   | Path to research file                   |
| **Decisions Reviewed**  | Count of decisions presented            |
| **Decisions Changed**   | Count changed from pre-selected default |
| **Decisions Confirmed** | Count confirmed as pre-selected         |

### Ready for Planning

1. Clear your context by typing `/clear`.
2. Attach or open [{{NN}}-{{task}}-research.md](.spxcode/Task/{{NN}}_{{TaskName}}/research/{{NN}}-{{task}}-research.md).
3. Start planning by typing `/task-plan`.

version: '2.2.61'
---

Locate the research document and proceed with the Required Steps to review decisions.
