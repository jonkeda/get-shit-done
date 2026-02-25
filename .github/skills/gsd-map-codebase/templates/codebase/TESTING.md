# Testing Patterns

**Analysis Date:** {YYYY-MM-DD}

## Test Framework

**Runner:**
- {Framework: e.g., "Jest 29.x", "Vitest 1.x"}
- {Config: e.g., "jest.config.js in project root"}

**Assertion Library:**
- {Library: e.g., "built-in expect", "chai"}
- {Matchers: e.g., "toBe, toEqual, toThrow"}

**Run Commands:**
```bash
{e.g., "npm test"}                               # Run all tests
{e.g., "npm test -- --watch"}                     # Watch mode
{e.g., "npm test -- path/to/file.test.ts"}       # Single file
{e.g., "npm run test:coverage"}                   # Coverage report
```

## Test File Organization

**Location:**
- {Pattern: e.g., "*.test.ts alongside source files"}
- {Alternative: e.g., "__tests__/ directory" or "separate tests/ tree"}

**Naming:**
- {Unit tests: e.g., "module-name.test.ts"}
- {Integration: e.g., "feature-name.integration.test.ts"}
- {E2E: e.g., "user-flow.e2e.test.ts"}

**Structure:**
```
{Show actual directory pattern, e.g.:
src/
  lib/
    utils.ts
    utils.test.ts
  services/
    user-service.ts
    user-service.test.ts
}
```

## Test Structure

**Suite Organization:**
```typescript
{Show actual pattern used, e.g.:

describe('ModuleName', () => {
  describe('functionName', () => {
    it('should handle success case', () => {
      // arrange
      // act
      // assert
    });

    it('should handle error case', () => {
      // test code
    });
  });
});
}
```

**Patterns:**
- {Setup: e.g., "beforeEach for shared setup, avoid beforeAll"}
- {Teardown: e.g., "afterEach to clean up, restore mocks"}
- {Structure: e.g., "arrange/act/assert pattern required"}

## Mocking

**Framework:**
- {Tool: e.g., "Jest built-in mocking", "Vitest vi", "Sinon"}
- {Import mocking: e.g., "vi.mock() at top of file"}

**Patterns:**
```typescript
{Show actual mocking pattern, e.g.:

// Mock external dependency
vi.mock('./external-service', () => ({
  fetchData: vi.fn()
}));

// Mock in test
const mockFn = vi.fn().mockResolvedValue({ data: 'test' });
}
```
