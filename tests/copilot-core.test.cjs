/**
 * GSD Copilot MCP Server Tests — core.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  loadCore,
  createTempProject,
  cleanup,
  writeConfig,
  createPhaseDir,
  writePlanFile,
  writeSummaryFile,
} = require('./copilot-helpers.cjs');

let core;
let tmpDir;

describe('core.js', () => {
  before(async () => {
    core = await loadCore();
  });

  // ─── loadConfig ───────────────────────────────────────────────────────

  describe('loadConfig()', () => {
    after(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns defaults when config.json is missing', () => {
      tmpDir = createTempProject({ config: false });
      const cfg = core.loadConfig(tmpDir);
      assert.strictEqual(cfg.model_profile, 'balanced');
      assert.strictEqual(cfg.commit_docs, true);
      assert.strictEqual(cfg.parallelization, true);
      assert.strictEqual(cfg.research, true);
      assert.strictEqual(cfg.brave_search, false);
    });

    it('reads valid config.json', () => {
      tmpDir = createTempProject({ config: { model_profile: 'quality', brave_search: true } });
      const cfg = core.loadConfig(tmpDir);
      assert.strictEqual(cfg.model_profile, 'quality');
      assert.strictEqual(cfg.brave_search, true);
    });

    it('returns defaults for corrupt JSON', () => {
      tmpDir = createTempProject({ config: false });
      fs.writeFileSync(path.join(tmpDir, '.planning', 'config.json'), '{bad json', 'utf-8');
      const cfg = core.loadConfig(tmpDir);
      assert.strictEqual(cfg.model_profile, 'balanced');
    });

    it('reads nested workflow section', () => {
      tmpDir = createTempProject({ config: false });
      fs.writeFileSync(
        path.join(tmpDir, '.planning', 'config.json'),
        JSON.stringify({ workflow: { research: false, verifier: false } }),
        'utf-8'
      );
      const cfg = core.loadConfig(tmpDir);
      assert.strictEqual(cfg.research, false);
      assert.strictEqual(cfg.verifier, false);
    });

    it('reads nested git section for branching_strategy', () => {
      tmpDir = createTempProject({ config: false });
      fs.writeFileSync(
        path.join(tmpDir, '.planning', 'config.json'),
        JSON.stringify({ git: { branching_strategy: 'per-phase' } }),
        'utf-8'
      );
      const cfg = core.loadConfig(tmpDir);
      assert.strictEqual(cfg.branching_strategy, 'per-phase');
    });

    it('handles parallelization as object with enabled field', () => {
      tmpDir = createTempProject({ config: false });
      fs.writeFileSync(
        path.join(tmpDir, '.planning', 'config.json'),
        JSON.stringify({ parallelization: { enabled: false } }),
        'utf-8'
      );
      const cfg = core.loadConfig(tmpDir);
      assert.strictEqual(cfg.parallelization, false);
    });
  });

  // ─── normalizePhaseName ───────────────────────────────────────────────

  describe('normalizePhaseName()', () => {
    it('pads single digit to two digits', () => {
      assert.strictEqual(core.normalizePhaseName('1'), '01');
      assert.strictEqual(core.normalizePhaseName('5'), '05');
      assert.strictEqual(core.normalizePhaseName('9'), '09');
    });

    it('keeps two-digit numbers as-is', () => {
      assert.strictEqual(core.normalizePhaseName('01'), '01');
      assert.strictEqual(core.normalizePhaseName('12'), '12');
    });

    it('preserves letter suffix and uppercases it', () => {
      assert.strictEqual(core.normalizePhaseName('2A'), '02A');
      assert.strictEqual(core.normalizePhaseName('2a'), '02A');
      assert.strictEqual(core.normalizePhaseName('10B'), '10B');
    });

    it('preserves decimal parts', () => {
      assert.strictEqual(core.normalizePhaseName('12.1'), '12.1');
      assert.strictEqual(core.normalizePhaseName('3.2'), '03.2');
      assert.strictEqual(core.normalizePhaseName('1.2.3'), '01.2.3');
    });

    it('returns non-matching input unchanged', () => {
      assert.strictEqual(core.normalizePhaseName('abc'), 'abc');
    });
  });

  // ─── comparePhaseNum ──────────────────────────────────────────────────

  describe('comparePhaseNum()', () => {
    it('sorts numeric phases correctly', () => {
      const phases = ['3', '1', '10', '2'];
      phases.sort(core.comparePhaseNum);
      assert.deepStrictEqual(phases, ['1', '2', '3', '10']);
    });

    it('sorts letter suffixes after base number', () => {
      const phases = ['2B', '2', '2A'];
      phases.sort(core.comparePhaseNum);
      assert.deepStrictEqual(phases, ['2', '2A', '2B']);
    });

    it('sorts decimal phases correctly', () => {
      const phases = ['1.2', '1', '1.1', '2'];
      phases.sort(core.comparePhaseNum);
      assert.deepStrictEqual(phases, ['1', '1.1', '1.2', '2']);
    });

    it('handles mixed types: numbers, letters, decimals', () => {
      const phases = ['3', '1A', '1', '2.1', '2'];
      phases.sort(core.comparePhaseNum);
      assert.deepStrictEqual(phases, ['1', '1A', '2', '2.1', '3']);
    });

    it('returns 0 for equal values', () => {
      assert.strictEqual(core.comparePhaseNum('01', '1'), 0);
      assert.strictEqual(core.comparePhaseNum('5', '5'), 0);
    });
  });

  // ─── findPhaseInternal ────────────────────────────────────────────────

  describe('findPhaseInternal()', () => {
    after(() => { if (tmpDir) cleanup(tmpDir); });

    it('finds phase by number', () => {
      tmpDir = createTempProject();
      createPhaseDir(tmpDir, 1, 'foundation');
      const result = core.findPhaseInternal(tmpDir, '1');
      assert.ok(result, 'should find phase');
      assert.strictEqual(result.found, true);
      assert.strictEqual(result.phase_number, '01');
      assert.strictEqual(result.phase_name, 'foundation');
    });

    it('returns null for missing phase', () => {
      tmpDir = createTempProject();
      const result = core.findPhaseInternal(tmpDir, '99');
      assert.strictEqual(result, null);
    });

    it('returns null for null input', () => {
      tmpDir = createTempProject();
      assert.strictEqual(core.findPhaseInternal(tmpDir, null), null);
    });

    it('detects plans and summaries', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 2, 'api');
      writePlanFile(tmpDir, dirName, 1);
      writePlanFile(tmpDir, dirName, 2);
      writeSummaryFile(tmpDir, dirName, 1);

      const result = core.findPhaseInternal(tmpDir, '2');
      assert.strictEqual(result.plans.length, 2, 'should have 2 plans');
      assert.strictEqual(result.summaries.length, 1, 'should have 1 summary');
      assert.strictEqual(result.incomplete_plans.length, 1, 'should have 1 incomplete plan');
    });

    it('detects research and context files', () => {
      tmpDir = createTempProject();
      const { dirPath, dirName } = createPhaseDir(tmpDir, 3, 'polish');
      fs.writeFileSync(path.join(dirPath, '03-RESEARCH.md'), '# Research', 'utf-8');
      fs.writeFileSync(path.join(dirPath, '03-CONTEXT.md'), '# Context', 'utf-8');

      const result = core.findPhaseInternal(tmpDir, '3');
      assert.strictEqual(result.has_research, true);
      assert.strictEqual(result.has_context, true);
    });
  });

  // ─── generateSlugInternal ─────────────────────────────────────────────

  describe('generateSlugInternal()', () => {
    it('converts text to lowercase slug', () => {
      assert.strictEqual(core.generateSlugInternal('Hello World'), 'hello-world');
    });

    it('strips special characters', () => {
      assert.strictEqual(core.generateSlugInternal('API Layer (v2)'), 'api-layer-v2');
    });

    it('trims leading/trailing hyphens', () => {
      assert.strictEqual(core.generateSlugInternal('--test--'), 'test');
    });

    it('returns null for empty/null input', () => {
      assert.strictEqual(core.generateSlugInternal(null), null);
      assert.strictEqual(core.generateSlugInternal(''), null);
    });

    it('collapses multiple separators', () => {
      assert.strictEqual(core.generateSlugInternal('one   two---three'), 'one-two-three');
    });
  });

  // ─── execGit ──────────────────────────────────────────────────────────

  describe('execGit()', () => {
    after(() => { if (tmpDir) cleanup(tmpDir); });

    it('runs a basic git command', () => {
      tmpDir = createTempProject();
      // Init a git repo so git commands work
      const { execSync } = require('child_process');
      execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });

      const result = core.execGit(tmpDir, ['status', '--porcelain']);
      assert.strictEqual(result.exitCode, 0);
      assert.strictEqual(typeof result.stdout, 'string');
    });

    it('returns non-zero exit code on error', () => {
      tmpDir = createTempProject();
      const result = core.execGit(tmpDir, ['log', '--oneline', '-1']);
      // Not a git repo or empty repo → error
      assert.ok(result.exitCode !== 0 || result.stderr !== '');
    });
  });

  // ─── safeReadFile ─────────────────────────────────────────────────────

  describe('safeReadFile()', () => {
    after(() => { if (tmpDir) cleanup(tmpDir); });

    it('reads existing file', () => {
      tmpDir = createTempProject();
      const filePath = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(filePath, 'hello', 'utf-8');
      assert.strictEqual(core.safeReadFile(filePath), 'hello');
    });

    it('returns null for missing file', () => {
      assert.strictEqual(core.safeReadFile('/nonexistent/path/xyz.md'), null);
    });
  });

  // ─── resolveModelInternal ─────────────────────────────────────────────

  describe('resolveModelInternal()', () => {
    after(() => { if (tmpDir) cleanup(tmpDir); });

    it('resolves executor as sonnet for balanced profile', () => {
      tmpDir = createTempProject({ config: { model_profile: 'balanced' } });
      const result = core.resolveModelInternal(tmpDir, 'gsd-executor');
      assert.strictEqual(result, 'sonnet');
    });

    it('resolves planner as inherit (opus) for quality profile', () => {
      tmpDir = createTempProject({ config: { model_profile: 'quality' } });
      const result = core.resolveModelInternal(tmpDir, 'gsd-planner');
      assert.strictEqual(result, 'inherit');
    });

    it('returns sonnet for unknown agent type', () => {
      tmpDir = createTempProject();
      const result = core.resolveModelInternal(tmpDir, 'gsd-unknown-agent');
      assert.strictEqual(result, 'sonnet');
    });
  });

  // ─── getRoadmapPhaseInternal ──────────────────────────────────────────

  describe('getRoadmapPhaseInternal()', () => {
    after(() => { if (tmpDir) cleanup(tmpDir); });

    it('extracts phase from roadmap', () => {
      tmpDir = createTempProject();
      const roadmap = `# Roadmap

## Phase 1: Foundation

**Goal:** Set up project

## Phase 2: Core

**Goal:** Build core logic
`;
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), roadmap, 'utf-8');

      const result = core.getRoadmapPhaseInternal(tmpDir, '1');
      assert.ok(result);
      assert.strictEqual(result.found, true);
      assert.strictEqual(result.phase_name, 'Foundation');
      assert.strictEqual(result.goal, 'Set up project');
    });

    it('returns null for missing phase in roadmap', () => {
      tmpDir = createTempProject();
      fs.writeFileSync(
        path.join(tmpDir, '.planning', 'ROADMAP.md'),
        '# Roadmap\n\n## Phase 1: Foundation\n',
        'utf-8'
      );
      const result = core.getRoadmapPhaseInternal(tmpDir, '99');
      assert.strictEqual(result, null);
    });

    it('returns null when roadmap is missing', () => {
      tmpDir = createTempProject();
      const result = core.getRoadmapPhaseInternal(tmpDir, '1');
      assert.strictEqual(result, null);
    });
  });
});
