---
category: 'General'
description: 'Shared naming and folder conventions for all .spxcode/ categories'
applyTo: '**/.spxcode/**'
maturity: stable
defaultEnabled: true
version: '2.2.61'
---

# Copilot Tracking Conventions

All tracking artifacts reside under `.spxcode/` at the workspace root. Every workflow follows the same three-level hierarchy: category folder, numbered instance folder, and numbered documents.

## Category Folders

Fixed PascalCase names at the first level. One folder per workflow domain:

| Category               | Folder Name            |
|------------------------|------------------------|
| RPI Tasks              | `Task/`                |
| Work Items             | `WorkItem/`            |
| Pull Requests          | `PR/`                  |
| Business Requirements  | `BRD/`                 |
| Product Requirements   | `PRD/`                 |
| Architecture Decisions | `ADR/`                 |
| Security Plans         | `SecurityPlan/`        |
| Memory                 | `Memory/`              |
| Documentation Ops      | `DocOps/`              |
| GitHub Issues          | `GitHubIssue/`         |
| Prompt Sandbox         | `Sandbox/`             |
| Instruction Analysis   | `InstructionAnalysis/` |

## Instance Folder Naming

Each instance within a category gets a numbered folder:

`{{NN}}_{{PascalCaseInstanceName}}`

* `NN` is a zero-padded sequential number (01, 02, 03, ...).
* `PascalCaseInstanceName` is a descriptive name derived from the task, branch, topic, or scope.

To create a new instance folder:

1. Scan `.spxcode/{{Category}}/` for existing folders matching `[0-9][0-9]_*`.
2. Increment the highest number found (or start at 01 when empty).
3. Create `{{next_NN}}_{{Name}}/`.

## Document Numbering

Files within a subfolder or instance folder are numbered sequentially by creation order:

`{{NN}}-{{kebab-description}}.ext`

* `NN` is a zero-padded sequential number within the containing folder (01, 02, 03, ...).
* `kebab-description` is a concise, lowercase, hyphen-separated description.
* Non-markdown files (`.xml`, `.json`, `.state.json`) follow the same numbering.

Numbering rules:

* Always assign the next available number. Scan the target folder for existing `[0-9][0-9]-*` files and increment the highest number found (or start at 01 when empty).
* Numbering is scoped to each folder independently. Each instance folder and each subfolder within it starts its own sequence at 01.
* Never skip numbers or reuse a number from a deleted file.

## Document Versioning

When revising an existing document, append a letter suffix instead of creating a new number:

* v1 = `01` (no letter suffix)
* v2 = `01b`
* v3 = `01c`
* v4 = `01d`

The previous version remains as a historical record. Separate documents receive their own number.

## Instance Folder Discovery

Agents locate the active instance folder through one of these paths:

* The first agent in the workflow creates the instance folder and passes the path through handoff context.
* Prompts accept a folder parameter for the active instance.
* When resuming, agents scan the category folder for the most recent instance matching the topic.
