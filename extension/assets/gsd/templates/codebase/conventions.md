# Coding Conventions Template

Template for `.planning/codebase/CONVENTIONS.md` - captures coding style and patterns.

**Purpose:** Document how code is written in this codebase. Prescriptive guide for the agent to match existing style.

---

## File Template

```markdown
# Coding Conventions

**Analysis Date:** [YYYY-MM-DD]

## Naming Patterns

**Files:**
- [Pattern: e.g., "kebab-case for all files"]
- [Test files: e.g., "*.test.ts alongside source"]
- [Components: e.g., "PascalCase.tsx for React components"]

**Functions:**
- [Pattern: e.g., "camelCase for all functions"]
- [Async: e.g., "no special prefix for async functions"]
- [Handlers: e.g., "handleEventName for event handlers"]

**Variables:**
- [Pattern: e.g., "camelCase for variables"]
- [Constants: e.g., "UPPER_SNAKE_CASE for constants"]
- [Private: e.g., "_prefix for private members" or "no prefix"]

**Types:**
- [Interfaces: e.g., "PascalCase, no I prefix"]
- [Types: e.g., "PascalCase for type aliases"]
- [Enums: e.g., "PascalCase for enum name, UPPER_CASE for values"]

## Code Style

**Formatting:**
- [Tool: e.g., "Prettier with config in .prettierrc"]
- [Line length: e.g., "100 characters max"]
- [Quotes: e.g., "single quotes for strings"]
- [Semicolons: e.g., "required" or "omitted"]

**Linting:**
- [Tool: e.g., "ESLint with eslint.config.js"]
- [Rules: e.g., "extends airbnb-base, no console in production"]
- [Run: e.g., "npm run lint"]

## Import Organization

**Order:**
1. [e.g., "External packages (react, express, etc.)"]
2. [e.g., "Internal modules (@/lib, @/components)"]
3. [e.g., "Relative imports (., ..)"]
4. [e.g., "Type imports (import type {})"]

**Grouping:**
- [Blank lines: e.g., "blank line between groups"]
- [Sorting: e.g., "alphabetical within each group"]

**Path Aliases:**
- [Aliases used: e.g., "@/ for src/, @components/ for src/components/"]

## Error Handling

**Patterns:**
- [Strategy: e.g., "throw errors, catch at boundaries"]
- [Custom errors: e.g., "extend Error class, named *Error"]
- [Async: e.g., "use try/catch, no .catch() chains"]

**Error Types:**
- [When to throw: e.g., "invalid input, missing dependencies"]
- [When to return: e.g., "expected failures return Result<T, E>"]
- [Logging: e.g., "log error with context before throwing"]

## Logging

**Framework:**
- [Tool: e.g., "console.log, pino, winston"]
- [Levels: e.g., "debug, info, warn, error"]

**Patterns:**
- [Format: e.g., "structured logging with context object"]
- [When: e.g., "log state transitions, external calls"]
- [Where: e.g., "log at service boundaries, not in utils"]

## Comments

**When to Comment:**
- [e.g., "explain why, not what"]
- [e.g., "document business logic, algorithms, edge cases"]
- [e.g., "avoid obvious comments like // increment counter"]

**JSDoc/TSDoc:**
- [Usage: e.g., "required for public APIs, optional for internal"]
- [Format: e.g., "use @param, @returns, @throws tags"]

**TODO Comments:**
- [Pattern: e.g., "// TODO(username): description"]
- [Tracking: e.g., "link to issue number if available"]

## Function Design

**Size:**
- [e.g., "keep under 50 lines, extract helpers"]

**Parameters:**
- [e.g., "max 3 parameters, use object for more"]
- [e.g., "destructure objects in parameter list"]

**Return Values:**
- [e.g., "explicit returns, no implicit undefined"]
- [e.g., "return early for guard clauses"]

## Module Design

**Exports:**
- [e.g., "named exports preferred, default exports for React components"]
- [e.g., "export from index.ts for public API"]

**Barrel Files:**
- [e.g., "use index.ts to re-export public API"]
- [e.g., "avoid circular dependencies"]

---

*Convention analysis: [date]*
*Update when patterns change*
```

<good_examples>
```markdown
# Coding Conventions

**Analysis Date:** 2025-01-20

## Naming Patterns

**Files:**
- kebab-case for all files (command-handler.ts, user-service.ts)
- *.test.ts alongside source files
- index.ts for barrel exports

**Functions:**
- camelCase for all functions
- No special prefix for async functions
- handleEventName for event handlers (handleClick, handleSubmit)

**Variables:**
- camelCase for variables
- UPPER_SNAKE_CASE for constants (MAX_RETRIES, API_BASE_URL)
- No underscore prefix (no private marker in TS)

**Types:**
- PascalCase for interfaces, no I prefix (User, not IUser)
- PascalCase for type aliases (UserConfig, ResponseData)
- PascalCase for enum names, UPPER_CASE for values (Status.PENDING)

## Code Style

**Formatting:**
- Prettier with .prettierrc
- 100 character line length
- Single quotes for strings
- Semicolons required
- 2 space indentation

**Linting:**
- ESLint with eslint.config.js
- Extends @typescript-eslint/recommended
- No console.log in production code (use logger)
- Run: npm run lint

## Import Organization

**Order:**
1. External packages (react, express, commander)
2. Internal modules (@/lib, @/services)
3. Relative imports (./utils, ../types)
4. Type imports (import type { User })

**Grouping:**
- Blank line between groups
- Alphabetical within each group
- Type imports last within each group

**Path Aliases:**
- @/ maps to src/
- No other aliases defined

## Error Handling

**Patterns:**
- Throw errors, catch at boundaries (route handlers, main functions)
- Extend Error class for custom errors (ValidationError, NotFoundError)
- Async functions use try/catch, no .catch() chains

**Error Types:**
- Throw for invalid input, missing dependencies
- Return null/undefined for expected "not found" cases
- Log error with context before re-throwing at boundaries
```
</good_examples>

<guidelines>
**What belongs in CONVENTIONS.md:**
- Naming patterns for files, functions, variables, types
- Code style rules (formatting, linting)
- Import organization patterns
- Error handling patterns
- Logging practices
- Comment standards
- Function and module design patterns

**What does NOT belong here:**
- Architecture patterns (that's ARCHITECTURE.md)
- Technology choices (that's STACK.md)
- File locations (that's STRUCTURE.md)
- Every style rule (link to .eslintrc, .prettierrc for details)

**When filling this template:**
- Read a few representative source files
- Check for formatter/linter configs
- Note import patterns and export styles
- Look at error handling approach
- Check comment style and JSDoc usage

**Useful for phase planning when:**
- Writing new code that matches existing style
- Reviewing code for consistency
- Setting up linting/formatting for new areas
- Understanding naming patterns for new files
</guidelines>
