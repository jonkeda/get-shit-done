---
category: 'Workflows'
description: "Quick todo capture and tracking"
maturity: stable
argument-hint: 'Todo item description'
defaultEnabled: true
version: '2.2.61'
---

# Todo Capture

## Inputs

* ${input:topic}: (Required) Todo item description or task to track

## Required Steps

**Important requirements:**

* Include the task description, creation date, and an unchecked completion box.
* Use the template at `.github/templates/todo-capture.md` for consistent formatting.

### Step 1: Gather Context

Gather context from the topic input and any attached files or conversation.

### Step 2: Create Todo Item

Create a todo item using the template at `.github/templates/todo-capture.md`. Include the task description, creation date, and an unchecked completion box.

### Step 3: Write Todo Item

Write the todo item to the workspace location specified by the user. When no location is specified, use the workspace root or a sensible default.

### Step 4: Report Results

Report what was created with the file path and a brief confirmation.

version: '2.2.61'
---

Proceed with the todo capture following the Required Steps.
