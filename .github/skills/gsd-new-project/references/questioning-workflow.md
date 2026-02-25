# Questioning Workflow Reference

Project initialization is dream extraction, not requirements gathering. You're helping the user discover and articulate what they want to build. This isn't a contract negotiation — it's collaborative thinking.

## Philosophy

**You are a thinking partner, not an interviewer.**

The user often has a fuzzy idea. Your job is to help them sharpen it. Ask questions that make them think "oh, I hadn't considered that" or "yes, that's exactly what I mean."

Don't interrogate. Collaborate. Don't follow a script. Follow the thread.

## The Goal

By the end of questioning, you need enough clarity to write a PROJECT.md that downstream phases can act on:

- **Research** needs: what domain to research, what the user already knows, what unknowns exist
- **Requirements** needs: clear enough vision to scope v1 features
- **Roadmap** needs: clear enough vision to decompose into phases, what "done" looks like
- **plan-phase** needs: specific requirements to break into tasks, context for implementation choices
- **execute-phase** needs: success criteria to verify against, the "why" behind requirements

A vague PROJECT.md forces every downstream phase to guess. The cost compounds.

## How to Question

**Start open.** Let them dump their mental model. Don't interrupt with structure.

**Follow energy.** Whatever they emphasized, dig into that. What excited them? What problem sparked this?

**Challenge vagueness.** Never accept fuzzy answers. "Good" means what? "Users" means who? "Simple" means how?

**Make the abstract concrete.** "Walk me through using this." "What does that actually look like?"

**Clarify ambiguity.** "When you say Z, do you mean A or B?" "You mentioned X — tell me more."

**Know when to stop.** When you understand what they want, why they want it, who it's for, and what done looks like — offer to proceed.

## Question Types

Use these as inspiration, not a checklist. Pick what's relevant to the thread.

**Motivation — why this exists:**
- "What prompted this?"
- "What are you doing today that this replaces?"
- "What would you do if this existed?"

**Concreteness — what it actually is:**
- "Walk me through using this"
- "You said X — what does that actually look like?"
- "Give me an example"

**Clarification — what they mean:**
- "When you say Z, do you mean A or B?"
- "You mentioned X — tell me more about that"

**Success — how you'll know it's working:**
- "How will you know this is working?"
- "What does done look like?"

## Using vscode_askQuestions

Use `vscode_askQuestions` to help users think by presenting concrete options to react to.

**Good options:**
- Interpretations of what they might mean
- Specific examples to confirm or deny
- Concrete choices that reveal priorities

**Bad options:**
- Generic categories ("Technical", "Business", "Other")
- Leading options that presume an answer
- Too many options (2-4 is ideal)

**Example — vague answer:**
User says "it should be fast"

```
use_tool(vscode_askQuestions, {
  questions: [{
    header: "Fast",
    question: "Fast how?",
    options: [
      { label: "Sub-second response" },
      { label: "Handles large datasets" },
      { label: "Quick to build" },
      { label: "Let me explain" }
    ],
    allowFreeformInput: true
  }]
})
```

## Context Checklist

Use as a **background checklist**, not a conversation structure. Check mentally as you go. If gaps remain, weave questions naturally.

- [ ] What they're building (concrete enough to explain to a stranger)
- [ ] Why it needs to exist (the problem or desire driving it)
- [ ] Who it's for (even if just themselves)
- [ ] What "done" looks like (observable outcomes)

Four things. If they volunteer more, capture it.

## Decision Gate

When you could write a clear PROJECT.md, offer to proceed:

```
use_tool(vscode_askQuestions, {
  questions: [{
    header: "Ready?",
    question: "I think I understand what you're after. Ready to create PROJECT.md?",
    options: [
      { label: "Create PROJECT.md", description: "Let's move forward" },
      { label: "Keep exploring", description: "I want to share more / ask me more" }
    ]
  }]
})
```

Loop until "Create PROJECT.md" selected.

## Anti-patterns

- **Checklist walking** — Going through domains regardless of what they said
- **Canned questions** — "What's your core value?" regardless of context
- **Corporate speak** — "What are your success criteria?" "Who are your stakeholders?"
- **Interrogation** — Firing questions without building on answers
- **Rushing** — Minimizing questions to get to "the work"
- **Shallow acceptance** — Taking vague answers without probing
- **Premature constraints** — Asking about tech stack before understanding the idea
- **User skills** — NEVER ask about user's technical experience. The AI builds.
