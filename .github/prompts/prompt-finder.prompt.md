---
category: 'General'
description: "Find the right prompt for any task by matching intent to the available prompt catalog"
maturity: stable
argument-hint: "task=... [scope={enabled|all}]"
defaultEnabled: true
version: '2.2.61'
---

# Prompt Finder

## Inputs

* ${input:task}: (Required) Task description in natural language
* ${input:scope:enabled}: (Optional) Search scope: `enabled` searches only active workspace prompts, `all` searches the full catalog

## Prompt Catalog

<!-- BEGIN PROMPT CATALOG -->

```yaml
- name: ado-create-pull-request
  description: "Generate pull request description, discover related work items, identify reviewers, and create Azure DevOps pull request with all linkages."
  category: Azure DevOps
- name: ado-get-build-info
  description: "Retrieve Azure DevOps build information for a Pull Request or specific Build Number."
  category: Azure DevOps
- name: ado-get-my-work-items
  description: "Retrieve user's current Azure DevOps work items and organize them into planning file definitions"
  category: Azure DevOps
- name: ado-prd-to-wit
  description: "Analyze PRDs and plan Azure DevOps work item hierarchies"
  category: Azure DevOps
  agent: ado-prd-to-wit
- name: ado-process-my-work-items-for-task-planning
  description: "Process retrieved work items for task planning and generate task-planning-logs.md handoff file"
  category: Azure DevOps
- name: ado-update-wit-items
  description: "Prompt to update work items based on planning files"
  category: Azure DevOps
- name: gen-data-spec
  description: "Generate data dictionaries, machine-readable data profiles, and objective summaries"
  category: Data Science
  agent: gen-data-spec
- name: gen-jupyter-notebook
  description: "Create structured exploratory data analysis Jupyter notebooks"
  category: Data Science
  agent: gen-jupyter-notebook
- name: gen-streamlit-dashboard
  description: "Develop a multi-page Streamlit dashboard"
  category: Data Science
  agent: gen-streamlit-dashboard
- name: test-streamlit-dashboard
  description: "Automated Streamlit dashboard testing with Playwright"
  category: Data Science
  agent: test-streamlit-dashboard
- name: adr-create
  description: "Create Architecture Decision Records through guided discovery and research integration"
  category: Document Builders
  agent: adr-creation
- name: arch-diagram
  description: "Build architecture diagrams from codebase analysis"
  category: Document Builders
  agent: arch-diagram-builder
- name: brd-build
  description: "Build Business Requirements Documents with guided Q&A and reference integration"
  category: Document Builders
  agent: brd-builder
- name: prd-build
  description: "Build Product Requirements Documents with guided Q&A and reference integration"
  category: Document Builders
  agent: prd-builder
- name: doc-ops-update
  description: "Invoke doc-ops agent for documentation quality assurance and updates"
  category: Documentation
  agent: doc-ops
  argument-hint: "[scope=all|docs|root|scripts] [validate-only={true|false}]"
- name: checkpoint
  description: "Save or restore conversation context using memory files"
  category: General
  agent: memory
  argument-hint: "[mode={save|continue|incremental}] [description=...]"
  defaultEnabled: true
- name: incident-response
  description: "Incident response workflow for Azure operations scenarios"
  category: General
  argument-hint: "[incident-description] [severity={1|2|3|4}] [phase={triage|diagnose|mitigate|rca}]"
- name: prompt-finder
  description: "Find the right prompt for any task by matching intent to the available prompt catalog"
  category: General
  argument-hint: "task=... [scope={enabled|all}]"
  defaultEnabled: true
- name: risk-register
  description: "Creates a concise and well-structured qualitative risk register using a Probability × Impact (P×I) risk matrix."
  category: General
  argument-hint: "[project-name] [optional: focus-area]"
- name: spxcode-install
  description: "Decision-driven spxcode installation across multiple methods"
  category: General
  agent: spxcode-installer
- name: git-commit
  description: "Stages all changes, generates a conventional commit message, shows it to the user, and commits using only git add/commit"
  category: Git
  agent: agent
  defaultEnabled: true
- name: git-commit-message
  description: "Generates a commit message following the commit-message.instructions.md rules based on all changes in the branch"
  category: Git
  agent: agent
  defaultEnabled: true
- name: git-merge
  description: "Coordinate Git merge, rebase, and rebase --onto workflows with consistent conflict handling."
  category: Git
  agent: agent
  defaultEnabled: true
- name: git-setup
  description: "Interactive, verification-first Git configuration assistant (non-destructive)"
  category: Git
  agent: agent
- name: pull-request
  description: "Provides prompt instructions for pull request (PR) generation - Brought to you by microsoft/edge-ai"
  category: Git
  agent: agent
- name: github-add-issue
  description: "Create a GitHub issue using discovered repository templates and conversational field collection"
  category: GitHub
  agent: github-backlog-manager
  argument-hint: "[templateName=...] [title=...] [labels=...]"
- name: github-discover-issues
  description: "Discover GitHub issues through user-centric queries, artifact-driven analysis, or search-based exploration and produce planning files for review"
  category: GitHub
  agent: github-backlog-manager
  argument-hint: "documents=... [milestone=...] [searchTerms=...]"
- name: github-execute-backlog
  description: "Execute a GitHub backlog plan by creating, updating, linking, closing, and commenting on issues from a handoff file"
  category: GitHub
  agent: github-backlog-manager
  argument-hint: "handoff=... [autonomy={full|partial|manual}] [dryRun={true|false}]"
- name: github-sprint-plan
  description: "Plan a GitHub milestone sprint by analyzing issue coverage, identifying gaps, and organizing work into a prioritized sprint backlog"
  category: GitHub
  agent: github-backlog-manager
  argument-hint: "milestone=... [documents=...] [sprintGoal=...] [capacity=...] [autonomy={full|partial|manual}]"
- name: github-triage-issues
  description: "Triage GitHub issues not yet triaged with automated label suggestions, milestone assignment, and duplicate detection"
  category: GitHub
  agent: github-backlog-manager
- name: pr-review
  description: "Comprehensive Pull Request review for code quality, security, and convention compliance"
  category: GitHub
  agent: pr-review
- name: instruction-files-from-source
  description: "Analyze source code and propose instruction files for selection"
  category: Instruction Generation
  agent: instruction-analyzer
  argument-hint: "topic=... [sourceFolders=folder1,folder2] [chat={true|false}]"
- name: prompt-analyze
  description: "Evaluates prompt engineering artifacts against quality criteria and reports findings"
  category: Prompt Engineering
  argument-hint: "file=..."
- name: prompt-build
  description: "Build or improve prompt engineering artifacts following quality criteria"
  category: Prompt Engineering
  agent: prompt-builder
  argument-hint: "file=... [requirements=...]"
  defaultEnabled: true
- name: prompt-refactor
  description: "Refactors and cleans up prompt engineering artifacts through iterative improvement"
  category: Prompt Engineering
  agent: prompt-builder
  argument-hint: "file=..."
- name: rpi
  description: "Autonomous Research-Plan-Implement-Review-Discover workflow for completing tasks"
  category: RPI
  agent: rpi-agent
  argument-hint: "task=... [auto={true|partial|false}] [continue={1|2|3|all}] [suggest]"
  defaultEnabled: true
- name: task-decide
  description: "Review and finalize research decisions before implementation planning"
  category: RPI
  agent: task-researcher
  defaultEnabled: true
- name: task-implement
  description: "Locates and executes implementation plans using task-implementor mode"
  category: RPI
  agent: task-implementor
  defaultEnabled: true
- name: task-plan
  description: "Initiates implementation planning based on user context or research documents"
  category: RPI
  agent: task-planner
  defaultEnabled: true
- name: task-question
  description: "Defines research questions through interactive task-list documents before invoking task-researcher"
  category: RPI
  agent: task-question
  defaultEnabled: true
- name: task-research
  description: "Initiates research for implementation planning based on user requirements"
  category: RPI
  agent: task-researcher
  defaultEnabled: true
- name: task-review
  description: "Initiates implementation review based on user context or automatic artifact discovery"
  category: RPI
  agent: task-reviewer
  defaultEnabled: true
- name: security-plan
  description: "Create comprehensive cloud security plans"
  category: Security
  agent: security-plan-creator
- name: backlog
  description: "Capture, refine, and ready backlog items with a 3-phase workflow"
  category: Workflows
  agent: backlog-workflow
  argument-hint: "Backlog item name or description"
- name: create-workflow
  description: "Create new workflow agents from requirements using a guided 3-phase process"
  category: Workflows
  agent: create-workflow
  argument-hint: "Workflow name and purpose"
- name: fix
  description: "Document and resolve software issues with a 2-phase fix workflow"
  category: Workflows
  agent: fix-workflow
  argument-hint: "Describe the bug or issue to fix"
  defaultEnabled: true
- name: issue
  description: "Track and resolve software issues through a 4-phase workflow"
  category: Workflows
  agent: issue-workflow
  argument-hint: "Describe the issue to track"
- name: steering
  description: "Create project steering documentation with product, tech, and structure documents"
  category: Workflows
  agent: steering-workflow
  argument-hint: "Project name or path to analyze"
- name: todo
  description: "Quick todo capture and tracking"
  category: Workflows
  argument-hint: "Todo item description"
  defaultEnabled: true
```

<!-- END PROMPT CATALOG -->

## Workflow Chains

When the recommended prompt belongs to a known sequence, suggest the natural next step.

* RPI pipeline: task-question, task-research, task-decide, task-plan, task-implement, task-review (or use `rpi` for full autonomy)
* GitHub backlog: github-discover-issues, github-triage-issues, github-sprint-plan, github-execute-backlog
* ADO work items: ado-get-my-work-items, ado-process-my-work-items-for-task-planning, task-plan, task-implement
* ADO PRD to work items: prd-build, ado-prd-to-wit, ado-update-wit-items
* Git commit to PR: git-commit, pull-request (or ado-create-pull-request), pr-review
* Prompt engineering: prompt-analyze, prompt-refactor (or prompt-build for new creation)
* Data science: gen-data-spec, gen-jupyter-notebook, gen-streamlit-dashboard, test-streamlit-dashboard
* Instruction generation: instruction-files-from-source, then instruction-generator agent
* Document-driven planning: brd-build, prd-build, steering, rpi (or task-plan)

## Overlap Groups

When multiple prompts match, use these "when to use" distinctions to rank correctly.

### Workflows (fix vs issue vs rpi vs backlog vs todo)

* todo: Capture a quick reminder or lightweight task without formal phases.
* fix: Diagnose and resolve a known bug with a short 2-phase workflow.
* issue: Track a problem needing investigation through 4 phases (document, investigate, resolve, close).
* backlog: Refine a product-facing backlog item through 3Cs (Card, Conversation, Confirmation).
* rpi: Execute a complex task end-to-end through autonomous Research-Plan-Implement-Review.
* steering: Generate high-level project vision docs (product strategy, tech strategy, structure).
* create-workflow: Build new workflow agents and prompts (meta-workflow for tooling development).

### Git (git-commit vs git-commit-message vs git-merge vs pull-request)

* git-commit: Stage all changes, generate a message, and run `git commit` in one step.
* git-commit-message: Generate only the commit message text without staging or committing.
* git-merge: Coordinate a merge, rebase, or rebase-onto operation with conflict handling.
* git-setup: One-time interactive Git configuration (user name, email, defaults).
* pull-request: Generate a PR description from the current branch diff.

### Document Builders (brd-build vs prd-build vs adr-create vs arch-diagram)

* brd-build: Capture business requirements (stakeholder needs, business goals, success criteria).
* prd-build: Define product requirements (features, UX flows, acceptance criteria).
* adr-create: Record a single architectural decision with options, rationale, and consequences.
* arch-diagram: Generate visual architecture diagrams (ASCII-art) from codebase analysis.

### Prompt Engineering (prompt-build vs prompt-analyze vs prompt-refactor)

* prompt-build: Create a new prompt/agent/instruction file or make major improvements.
* prompt-analyze: Read-only quality evaluation against criteria (no changes made).
* prompt-refactor: Iterative cleanup and optimization of an existing prompt file.

### RPI (rpi vs individual phases)

* rpi: Run the full autonomous pipeline end-to-end without manual phase transitions.
* task-question: Frame specific research questions before investigation begins.
* task-research: Perform deep codebase/domain research to answer framed questions.
* task-decide: Review research findings and lock in decisions before planning.
* task-plan: Create an actionable implementation plan from finalized decisions.
* task-implement: Execute the implementation plan with progressive tracking.
* task-review: Review completed implementation for accuracy, completeness, and compliance.

### GitHub (github-add-issue vs discover vs triage vs sprint-plan vs execute)

* github-add-issue: Create a single new GitHub issue using repo templates.
* github-discover-issues: Find existing issues through search, artifact analysis, or user queries.
* github-triage-issues: Auto-label, assign milestones, and detect duplicates for untriaged issues.
* github-sprint-plan: Plan a milestone sprint by analyzing coverage gaps and prioritizing work.
* github-execute-backlog: Execute bulk issue operations (create, update, close, link) from a handoff file.
* pr-review: Review a pull request for code quality, security, and convention compliance.

### ADO (ado-create-pull-request vs get-build-info vs work items)

* ado-create-pull-request: Create an ADO pull request with auto-linked work items and reviewer assignment.
* ado-get-build-info: Retrieve build status, logs, or details for a PR or build number.
* ado-get-my-work-items: Fetch your assigned ADO work items.
* ado-prd-to-wit: Convert a PRD document into an ADO work item hierarchy plan.
* ado-process-my-work-items-for-task-planning: Transform fetched work items into a task-planning handoff file.
* ado-update-wit-items: Execute work item creates/updates from planning files.

## Required Steps

### Step 1: Determine Active Prompts

* When `${input:scope}` is `enabled` (default):
  * List files in `.github/prompts/` to find enabled prompts.
  * Match filenames (minus `.prompt.md` extension) to catalog entries by name.
  * When no prompts are found in `.github/prompts/`, use entries marked `defaultEnabled: true` as the active set.
* When `${input:scope}` is `all`:
  * Use the entire Prompt Catalog as the active set.

### Step 2: Match User Intent

* Analyze `${input:task}` against the active prompt set.
* Use category as a first-pass filter (if the task mentions "git", "PR", "commit", prioritize Git category prompts).
* Use description for semantic matching (rank prompts by how well their description matches the user's intent).
* When the task is vague or could match prompts from multiple categories, ask a scoping question: "What kind of task: coding, planning, documentation, DevOps, or something else?"

### Step 3: Format Recommendations

Present 1-3 best-matching prompts as a numbered list.

* Include the prompt name, category badge, one-line rationale, and invocation syntax.
* When prompts belong to the same overlap group, include the "when to use" distinction.
* When the prompt has an `argument-hint`, include the invocation syntax with the hint.

Output format per recommendation:

1. **prompt-name** [Category]
   One-line rationale explaining why this prompt matches the task.
   Invoke: `/prompt-name argument-hint-if-available`
   *When to use* (only for overlapping prompts): distinction from similar prompts.

### Step 4: Suggest Workflow Next Steps

* When a recommended prompt belongs to a known workflow chain, mention the natural next step.
* Keep the suggestion brief: "After completing this step, continue with `/next-prompt`."

version: '2.2.61'
---

Find the right prompt for your task. Analyze the task description against the prompt catalog and present the best matches.
