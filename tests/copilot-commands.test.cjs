/**
 * GSD Copilot MCP Server Tests — commands.js
 */

const { describe, it, before, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  loadModule,
  createTempProject,
  cleanup,
  writeState,
  writeConfig,
  createPhaseDir,
  writePlanFile,
  writeSummaryFile,
} = require('./copilot-helpers.cjs');

let commands;

describe('commands.js', () => {
  before(async () => {
    commands = await loadModule('commands.js');
  });

  // ─── cmdGenerateSlug ──────────────────────────────────────────────────

  describe('cmdGenerateSlug()', () => {
    it('converts text to a lowercase slug', () => {
      const result = commands.cmdGenerateSlug('Hello World');
      assert.deepStrictEqual(result, { slug: 'hello-world' });
    });

    it('strips special characters and trims dashes', () => {
      const result = commands.cmdGenerateSlug('  --My Project!! v2.0--  ');
      assert.strictEqual(result.slug, 'my-project-v2-0');
    });

    it('throws when text is empty', () => {
      assert.throws(() => commands.cmdGenerateSlug(''), /text required/);
    });
  });

  // ─── cmdCurrentTimestamp ──────────────────────────────────────────────

  describe('cmdCurrentTimestamp()', () => {
    it('returns full ISO timestamp by default', () => {
      const result = commands.cmdCurrentTimestamp('full');
      assert.ok(result.timestamp.match(/^\d{4}-\d{2}-\d{2}T/), 'should be ISO format');
    });

    it('returns date-only for "date" format', () => {
      const result = commands.cmdCurrentTimestamp('date');
      assert.ok(result.timestamp.match(/^\d{4}-\d{2}-\d{2}$/), 'should be YYYY-MM-DD');
    });

    it('returns filename-safe format', () => {
      const result = commands.cmdCurrentTimestamp('filename');
      assert.ok(!result.timestamp.includes(':'), 'should not contain colons');
      assert.ok(result.timestamp.includes('T'), 'should contain T separator');
    });
  });

  // ─── cmdListTodos / cmdTodoComplete ───────────────────────────────────

  describe('cmdListTodos()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns empty list when no todos exist', () => {
      tmpDir = createTempProject();
      const result = commands.cmdListTodos(tmpDir);
      assert.strictEqual(result.count, 0);
      assert.deepStrictEqual(result.todos, []);
    });

    it('lists pending todos from .planning/todos/pending/', () => {
      tmpDir = createTempProject();
      const pendingDir = path.join(tmpDir, '.planning', 'todos', 'pending');
      fs.mkdirSync(pendingDir, { recursive: true });
      fs.writeFileSync(path.join(pendingDir, 'fix-bug.md'),
        'title: Fix the login bug\narea: backend\ncreated: 2026-01-10\n', 'utf-8');
      fs.writeFileSync(path.join(pendingDir, 'add-tests.md'),
        'title: Add unit tests\narea: testing\ncreated: 2026-01-11\n', 'utf-8');

      const result = commands.cmdListTodos(tmpDir);
      assert.strictEqual(result.count, 2);
      assert.strictEqual(result.todos.length, 2);
      const titles = result.todos.map(t => t.title).sort();
      assert.deepStrictEqual(titles, ['Add unit tests', 'Fix the login bug']);
    });

    it('filters todos by area', () => {
      tmpDir = createTempProject();
      const pendingDir = path.join(tmpDir, '.planning', 'todos', 'pending');
      fs.mkdirSync(pendingDir, { recursive: true });
      fs.writeFileSync(path.join(pendingDir, 'fix-bug.md'),
        'title: Fix the login bug\narea: backend\ncreated: 2026-01-10\n', 'utf-8');
      fs.writeFileSync(path.join(pendingDir, 'add-tests.md'),
        'title: Add unit tests\narea: testing\ncreated: 2026-01-11\n', 'utf-8');

      const result = commands.cmdListTodos(tmpDir, 'backend');
      assert.strictEqual(result.count, 1);
      assert.strictEqual(result.todos[0].title, 'Fix the login bug');
    });
  });

  describe('cmdTodoComplete()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('moves todo from pending to completed', () => {
      tmpDir = createTempProject();
      const pendingDir = path.join(tmpDir, '.planning', 'todos', 'pending');
      fs.mkdirSync(pendingDir, { recursive: true });
      fs.writeFileSync(path.join(pendingDir, 'my-todo.md'),
        'title: My Todo\narea: general\ncreated: 2026-01-10\n', 'utf-8');

      const result = commands.cmdTodoComplete(tmpDir, 'my-todo.md');
      assert.strictEqual(result.completed, true);
      assert.strictEqual(result.file, 'my-todo.md');
      // pending file should be gone
      assert.ok(!fs.existsSync(path.join(pendingDir, 'my-todo.md')));
      // completed file should exist with prepended date
      const completedPath = path.join(tmpDir, '.planning', 'todos', 'completed', 'my-todo.md');
      assert.ok(fs.existsSync(completedPath));
      const content = fs.readFileSync(completedPath, 'utf-8');
      assert.ok(content.startsWith('completed:'), 'should prepend completed date');
    });

    it('throws when todo file does not exist', () => {
      tmpDir = createTempProject();
      const pendingDir = path.join(tmpDir, '.planning', 'todos', 'pending');
      fs.mkdirSync(pendingDir, { recursive: true });
      assert.throws(() => commands.cmdTodoComplete(tmpDir, 'nonexistent.md'), /Todo not found/);
    });
  });

  // ─── cmdVerifyPathExists ──────────────────────────────────────────────

  describe('cmdVerifyPathExists()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns exists:true for existing directory', () => {
      tmpDir = createTempProject();
      const result = commands.cmdVerifyPathExists(tmpDir, '.planning');
      assert.strictEqual(result.exists, true);
      assert.strictEqual(result.type, 'directory');
    });

    it('returns exists:false for missing path', () => {
      tmpDir = createTempProject();
      const result = commands.cmdVerifyPathExists(tmpDir, 'nonexistent/path');
      assert.strictEqual(result.exists, false);
      assert.strictEqual(result.type, null);
    });

    it('throws when targetPath is empty', () => {
      tmpDir = createTempProject();
      assert.throws(() => commands.cmdVerifyPathExists(tmpDir, ''), /path required/);
    });
  });

  // ─── cmdResolveModel ──────────────────────────────────────────────────

  describe('cmdResolveModel()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('resolves model for known agent type', () => {
      tmpDir = createTempProject({ config: { model_profile: 'balanced' } });
      const result = commands.cmdResolveModel(tmpDir, 'planner');
      assert.strictEqual(result.profile, 'balanced');
      assert.ok(result.model, 'should return a model');
    });

    it('returns unknown_agent for unrecognized agent type', () => {
      tmpDir = createTempProject();
      const result = commands.cmdResolveModel(tmpDir, 'flying-spaghetti-monster');
      assert.strictEqual(result.unknown_agent, true);
    });

    it('throws when agentType is missing', () => {
      tmpDir = createTempProject();
      assert.throws(() => commands.cmdResolveModel(tmpDir, ''), /agent-type required/);
    });
  });

  // ─── cmdCommit ────────────────────────────────────────────────────────

  describe('cmdCommit()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('skips commit when commit_docs is false', () => {
      tmpDir = createTempProject({ config: { commit_docs: false } });
      const result = commands.cmdCommit(tmpDir, 'test commit');
      assert.strictEqual(result.committed, false);
      assert.strictEqual(result.reason, 'skipped_commit_docs_false');
    });

    it('throws when message is empty and amend is false', () => {
      tmpDir = createTempProject();
      assert.throws(() => commands.cmdCommit(tmpDir, '', null, false), /commit message required/);
    });
  });

  // ─── cmdSummaryExtract ────────────────────────────────────────────────

  describe('cmdSummaryExtract()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('extracts frontmatter fields from a SUMMARY file', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'foundation');
      const summaryPath = `.planning/phases/${dirName}/01-01-SUMMARY.md`;
      fs.writeFileSync(path.join(tmpDir, summaryPath), `---
phase: "01"
plan: "01-01"
one-liner: "Set up project scaffolding"
key-files:
  - src/index.ts
  - package.json
tech-stack:
  added:
    - TypeScript
    - Node.js
key-decisions:
  - "Use ESM: better tree shaking"
patterns-established:
  - barrel exports
requirements-completed:
  - REQ-001
---

# Summary

Done.
`, 'utf-8');

      const result = commands.cmdSummaryExtract(tmpDir, summaryPath);
      assert.strictEqual(result.one_liner, 'Set up project scaffolding');
      assert.deepStrictEqual(result.key_files, ['src/index.ts', 'package.json']);
      assert.deepStrictEqual(result.tech_added, ['TypeScript', 'Node.js']);
      assert.deepStrictEqual(result.patterns, ['barrel exports']);
      assert.strictEqual(result.decisions.length, 1);
      assert.strictEqual(result.decisions[0].summary, 'Use ESM');
    });

    it('filters to specific fields when provided', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'foundation');
      const summaryPath = `.planning/phases/${dirName}/01-01-SUMMARY.md`;
      fs.writeFileSync(path.join(tmpDir, summaryPath), `---
one-liner: "Built it"
key-files:
  - main.js
---

# Summary
`, 'utf-8');

      const result = commands.cmdSummaryExtract(tmpDir, summaryPath, ['one_liner']);
      assert.strictEqual(result.one_liner, 'Built it');
      assert.strictEqual(result.key_files, undefined, 'should not include unrequested fields');
    });

    it('returns error for missing file', () => {
      tmpDir = createTempProject();
      const result = commands.cmdSummaryExtract(tmpDir, '.planning/phases/nonexistent/01-01-SUMMARY.md');
      assert.ok(result.error, 'should return error');
    });
  });

  // ─── cmdProgressRender ────────────────────────────────────────────────

  describe('cmdProgressRender()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns phase progress with percentages', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'foundation');
      writePlanFile(tmpDir, dirName, 1);
      writeSummaryFile(tmpDir, dirName, 1);

      const result = commands.cmdProgressRender(tmpDir);
      assert.ok(Array.isArray(result.phases));
      assert.strictEqual(result.total_plans, 1);
      assert.strictEqual(result.total_summaries, 1);
      assert.strictEqual(result.percent, 100);
    });

    it('returns 0% when no plans exist', () => {
      tmpDir = createTempProject();
      const result = commands.cmdProgressRender(tmpDir);
      assert.strictEqual(result.percent, 0);
      assert.deepStrictEqual(result.phases, []);
    });
  });

  // ─── cmdScaffold ──────────────────────────────────────────────────────

  describe('cmdScaffold()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('scaffolds a phase-dir', () => {
      tmpDir = createTempProject();
      const result = commands.cmdScaffold(tmpDir, 'phase-dir', { phase: '04', name: 'Integration' });
      assert.strictEqual(result.created, true);
      assert.ok(result.directory.includes('04-integration'));
      assert.ok(fs.existsSync(result.path));
    });

    it('scaffolds a context file', () => {
      tmpDir = createTempProject();
      createPhaseDir(tmpDir, 2, 'core-logic');
      const result = commands.cmdScaffold(tmpDir, 'context', { phase: '2', name: 'Core Logic' });
      assert.strictEqual(result.created, true);
      const content = fs.readFileSync(path.join(tmpDir, result.path), 'utf-8');
      assert.ok(content.includes('Context'), 'should contain Context heading');
      assert.ok(content.includes('Decisions'), 'should contain Decisions section');
    });

    it('scaffolds a uat file', () => {
      tmpDir = createTempProject();
      createPhaseDir(tmpDir, 3, 'polish');
      const result = commands.cmdScaffold(tmpDir, 'uat', { phase: '3', name: 'Polish' });
      assert.strictEqual(result.created, true);
      const content = fs.readFileSync(path.join(tmpDir, result.path), 'utf-8');
      assert.ok(content.includes('User Acceptance Testing'));
    });

    it('scaffolds a verification file', () => {
      tmpDir = createTempProject();
      createPhaseDir(tmpDir, 1, 'foundation');
      const result = commands.cmdScaffold(tmpDir, 'verification', { phase: '1', name: 'Foundation' });
      assert.strictEqual(result.created, true);
      const content = fs.readFileSync(path.join(tmpDir, result.path), 'utf-8');
      assert.ok(content.includes('Verification'));
    });

    it('throws for unknown scaffold type', () => {
      tmpDir = createTempProject();
      createPhaseDir(tmpDir, 1, 'foundation');
      assert.throws(() => commands.cmdScaffold(tmpDir, 'banana', { phase: '1' }), /Unknown scaffold type/);
    });
  });

  // ─── cmdHistoryDigest ─────────────────────────────────────────────────

  describe('cmdHistoryDigest()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns empty digest when no phases exist', () => {
      tmpDir = createTempProject();
      const result = commands.cmdHistoryDigest(tmpDir);
      assert.deepStrictEqual(result.phases, {});
      assert.deepStrictEqual(result.decisions, []);
      assert.deepStrictEqual(result.tech_stack, []);
    });

    it('synthesizes decisions, tech stack, and patterns from summaries', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'foundation');
      const summaryPath = path.join(tmpDir, '.planning', 'phases', dirName, '01-01-SUMMARY.md');
      fs.writeFileSync(summaryPath, `---
phase: "01"
name: "Foundation"
provides:
  - project-structure
  - build-system
patterns-established:
  - barrel-exports
  - error-first callbacks
key-decisions:
  - "Use TypeScript: type safety"
  - "Use pnpm: faster installs"
tech-stack:
  added:
    - TypeScript
    - pnpm
---

# Summary 01-01

Built the foundation.
`, 'utf-8');

      const result = commands.cmdHistoryDigest(tmpDir);
      assert.ok(result.phases['01'], 'should have phase 01');
      assert.deepStrictEqual(result.phases['01'].provides, ['project-structure', 'build-system']);
      assert.deepStrictEqual(result.phases['01'].patterns, ['barrel-exports', 'error-first callbacks']);
      assert.strictEqual(result.decisions.length, 2);
      assert.deepStrictEqual(result.tech_stack.sort(), ['TypeScript', 'pnpm'].sort());
    });

    it('filters to a specific phase when phase argument provided', () => {
      tmpDir = createTempProject();
      createPhaseDir(tmpDir, 1, 'foundation');
      const { dirName: dir2 } = createPhaseDir(tmpDir, 2, 'core');
      // Only phase 2 has a summary
      fs.writeFileSync(
        path.join(tmpDir, '.planning', 'phases', dir2, '02-01-SUMMARY.md'),
        `---\nphase: "02"\nname: "Core"\nprovides:\n  - api-layer\nkey-decisions:\n  - "REST over GraphQL: simpler"\n---\n\n# Summary\n`, 'utf-8');

      const result = commands.cmdHistoryDigest(tmpDir, '2');
      assert.ok(result.phases['02'], 'should contain phase 02');
      assert.strictEqual(Object.keys(result.phases).length, 1, 'should only contain filtered phase');
    });
  });
});
