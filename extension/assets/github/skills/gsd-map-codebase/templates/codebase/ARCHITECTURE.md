# Architecture

**Analysis Date:** {YYYY-MM-DD}

## Pattern Overview

**Overall:** {Pattern name: e.g., "Monolithic CLI", "Serverless API", "Full-stack MVC"}

**Key Characteristics:**
- {Characteristic 1: e.g., "Single executable"}
- {Characteristic 2: e.g., "Stateless request handling"}
- {Characteristic 3: e.g., "Event-driven"}

## Layers

{Describe the conceptual layers and their responsibilities}

**{Layer Name}:**
- Purpose: {What this layer does}
- Contains: {Types of code: e.g., "route handlers", "business logic"}
- Depends on: {What it uses}
- Used by: {What uses it}

**{Layer Name}:**
- Purpose: {What this layer does}
- Contains: {Types of code}
- Depends on: {What it uses}
- Used by: {What uses it}

## Data Flow

{Describe the typical request/execution lifecycle}

**{Flow Name} (e.g., "HTTP Request", "CLI Command"):**

1. {Entry point}
2. {Processing step}
3. {Processing step}
4. {Output}

**State Management:**
- {How state is handled}

## Key Abstractions

{Core concepts/patterns used throughout the codebase}

**{Abstraction Name}:**
- Purpose: {What it represents}
- Examples: {Concrete examples}
- Pattern: {e.g., "Singleton", "Factory", "Repository"}

## Entry Points

**{Entry Point}:**
- Location: {e.g., "src/index.ts"}
- Triggers: {What invokes it}
- Responsibilities: {What it does}

## Error Handling

**Strategy:** {How errors are handled across the codebase}
**Patterns:** {Common error patterns}

## Dependencies Between Components

{Which components depend on which — helps understand safe modification order}

---

*Architecture analysis: {date}*
