# Codebase Structure

**Analysis Date:** {YYYY-MM-DD}

## Directory Layout

```
{project-root}/
├── {dir}/          # {Purpose}
├── {dir}/          # {Purpose}
├── {dir}/          # {Purpose}
└── {file}          # {Purpose}
```

## Directory Purposes

**{Directory Name}:**
- Purpose: {What lives here}
- Contains: {Types of files: e.g., "*.ts source files", "component directories"}
- Key files: {Important files in this directory}
- Subdirectories: {If nested, describe structure}

**{Directory Name}:**
- Purpose: {What lives here}
- Contains: {Types of files}
- Key files: {Important files}
- Subdirectories: {Structure}

## Key File Locations

**Entry Points:**
- {Path}: {Purpose: e.g., "CLI entry point"}
- {Path}: {Purpose: e.g., "Server startup"}

**Configuration:**
- {Path}: {Purpose: e.g., "TypeScript config"}
- {Path}: {Purpose: e.g., "Build configuration"}
- {Path}: {Purpose: e.g., "Environment variables"}

**Core Logic:**
- {Path}: {Purpose: e.g., "Business services"}
- {Path}: {Purpose: e.g., "Database models"}
- {Path}: {Purpose: e.g., "API routes"}

**Testing:**
- {Path}: {Purpose: e.g., "Unit tests"}
- {Path}: {Purpose: e.g., "Test fixtures"}

**Documentation:**
- {Path}: {Purpose: e.g., "User-facing docs"}
- {Path}: {Purpose: e.g., "Developer guide"}

## Naming Conventions

**Files:**
- {Pattern}: {Example: e.g., "kebab-case.ts for modules"}
- {Pattern}: {Example: e.g., "PascalCase.tsx for React components"}
- {Pattern}: {Example: e.g., "*.test.ts for test files"}

**Directories:**
- {Pattern}: {Example: e.g., "kebab-case for feature directories"}
- {Pattern}: {Example: e.g., "plural names for collections"}

**Special Patterns:**
- {Pattern}: {Example: e.g., "index.ts for directory exports"}
- {Pattern}: {Example: e.g., "__tests__ for test directories"}

## Where to Add New Code

**New Feature:**
- Primary code: {Directory path}
- Tests: {Directory path}
- Config if needed: {Directory path}

**New Component/Module:**
- Implementation: {Directory path}
- Types: {Directory path}
- Tests: {Directory path}

**New Route/Command:**
- Definition: {Directory path}
- Handler: {Directory path}
- Tests: {Directory path}

**Utilities:**
- Shared helpers: {Directory path}
- Type definitions: {Directory path}
