---
category: 'Workflows'
description: "Document and resolve software issues with a 2-phase fix workflow"
agent: 'fix-workflow'
maturity: stable
argument-hint: 'Describe the bug or issue to fix'
defaultEnabled: true
version: '2.2.61'
---

# Fix Workflow

## Inputs

* ${input:topic}: (Required) Bug description, symptoms, or error messages

## Required Steps

**Important requirements:**

* Gather all available evidence before proposing a fix.
* Prefer root-cause fixes over symptom-only patches.

### Step 1: Gather Context

Collect context from the topic input, conversation history, and any attached files.

### Step 2: Begin Fix Workflow

Begin the fix workflow following the agent's Required Phases.

version: '2.2.61'
---

Proceed with the fix workflow following the Required Steps.
