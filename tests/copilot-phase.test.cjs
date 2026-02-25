/**
 * GSD Copilot MCP Server Tests — phase.js
 */

const { describe, it, before, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  loadModule,
  createTempProject,
  cleanup,
  writeRoadmap,
  createPhaseDir,
  writePlanFile,
  writeSummaryFile,
} = require('./copilot-helpers.cjs');

let phase;

describe('phase.js', () => {
  before(async () => {
    phase = await loadModule('phase.js');
  });

  // ─── cmdPhasesList ───────────────────────────────────────────────────

  describe('cmdPhasesList()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns empty when no phase directories exist', () => {
      tmpDir = createTempProject();
      const result = phase.cmdPhasesList(tmpDir, {});
      assert.deepStrictEqual(result.directories, []);
      assert.strictEqual(result.count, 0);
    });

    it('lists phase directories sorted by number', () => {
      tmpDir = createTempProject();
      createPhaseDir(tmpDir, 2, 'core-logic');
      createPhaseDir(tmpDir, 1, 'foundation');
      createPhaseDir(tmpDir, 3, 'polish');
      const result = phase.cmdPhasesList(tmpDir, {});
      assert.strictEqual(result.count, 3);
      assert.ok(result.directories[0].startsWith('01-'));
      assert.ok(result.directories[1].startsWith('02-'));
      assert.ok(result.directories[2].startsWith('03-'));
    });

    it('filters by specific phase number', () => {
      tmpDir = createTempProject();
      createPhaseDir(tmpDir, 1, 'foundation');
      createPhaseDir(tmpDir, 2, 'core-logic');
      const result = phase.cmdPhasesList(tmpDir, { phase: '2' });
      assert.strictEqual(result.directories.length, 1);
      assert.ok(result.directories[0].startsWith('02-'));
    });

    it('returns error when filtering by nonexistent phase', () => {
      tmpDir = createTempProject();
      createPhaseDir(tmpDir, 1, 'foundation');
      const result = phase.cmdPhasesList(tmpDir, { phase: '99' });
      assert.strictEqual(result.error, 'Phase not found');
    });

    it('lists plan files when type=plans', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'foundation');
      writePlanFile(tmpDir, dirName, 1);
      writePlanFile(tmpDir, dirName, 2);
      const result = phase.cmdPhasesList(tmpDir, { type: 'plans' });
      assert.strictEqual(result.count, 2);
      assert.ok(result.files.every(f => f.endsWith('-PLAN.md')));
    });

    it('lists summary files when type=summaries', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'foundation');
      writePlanFile(tmpDir, dirName, 1);
      writeSummaryFile(tmpDir, dirName, 1);
      const result = phase.cmdPhasesList(tmpDir, { type: 'summaries' });
      assert.strictEqual(result.count, 1);
      assert.ok(result.files[0].endsWith('-SUMMARY.md'));
    });
  });

  // ─── cmdPhaseNextDecimal ─────────────────────────────────────────────

  describe('cmdPhaseNextDecimal()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns .1 when no decimals exist', () => {
      tmpDir = createTempProject();
      createPhaseDir(tmpDir, 1, 'foundation');
      const result = phase.cmdPhaseNextDecimal(tmpDir, '1');
      assert.strictEqual(result.next, '01.1');
      assert.deepStrictEqual(result.existing, []);
    });

    it('increments decimal when existing decimals exist', () => {
      tmpDir = createTempProject();
      createPhaseDir(tmpDir, 1, 'foundation');
      // Create a 01.1 decimal directory manually
      fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01.1-hotfix'), { recursive: true });
      const result = phase.cmdPhaseNextDecimal(tmpDir, '1');
      assert.strictEqual(result.next, '01.2');
      assert.deepStrictEqual(result.existing, ['01.1']);
    });

    it('returns found=false when base phase directory does not exist', () => {
      tmpDir = createTempProject();
      const result = phase.cmdPhaseNextDecimal(tmpDir, '5');
      assert.strictEqual(result.found, false);
      assert.strictEqual(result.next, '05.1');
    });
  });

  // ─── cmdFindPhase ────────────────────────────────────────────────────

  describe('cmdFindPhase()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('throws when no phase identifier provided', () => {
      tmpDir = createTempProject();
      assert.throws(() => phase.cmdFindPhase(tmpDir, null), /phase identifier required/);
    });

    it('returns found=false for nonexistent phase', () => {
      tmpDir = createTempProject();
      const result = phase.cmdFindPhase(tmpDir, '99');
      assert.strictEqual(result.found, false);
      assert.strictEqual(result.directory, null);
    });

    it('finds an existing phase with plans and summaries', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'foundation');
      writePlanFile(tmpDir, dirName, 1);
      writeSummaryFile(tmpDir, dirName, 1);
      const result = phase.cmdFindPhase(tmpDir, '1');
      assert.strictEqual(result.found, true);
      assert.strictEqual(result.phase_number, '01');
      assert.strictEqual(result.plans.length, 1);
      assert.strictEqual(result.summaries.length, 1);
    });
  });

  // ─── cmdPhasePlanIndex ───────────────────────────────────────────────

  describe('cmdPhasePlanIndex()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('throws when no phase provided', () => {
      tmpDir = createTempProject();
      assert.throws(() => phase.cmdPhasePlanIndex(tmpDir, null), /phase required/);
    });

    it('returns error for nonexistent phase', () => {
      tmpDir = createTempProject();
      const result = phase.cmdPhasePlanIndex(tmpDir, '99');
      assert.ok(result.error);
      assert.deepStrictEqual(result.plans, []);
    });

    it('indexes plans with wave info and completion status', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'foundation');
      writePlanFile(tmpDir, dirName, 1, { wave: 1 });
      writePlanFile(tmpDir, dirName, 2, { wave: 2 });
      writeSummaryFile(tmpDir, dirName, 1);
      const result = phase.cmdPhasePlanIndex(tmpDir, '1');
      assert.strictEqual(result.plans.length, 2);
      assert.strictEqual(result.plans[0].has_summary, true);
      assert.strictEqual(result.plans[1].has_summary, false);
      assert.ok(result.waves['1']);
      assert.ok(result.waves['2']);
      assert.deepStrictEqual(result.incomplete, ['01-02']);
    });
  });

  // ─── cmdPhaseAdd ─────────────────────────────────────────────────────

  describe('cmdPhaseAdd()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('throws when description is missing', () => {
      tmpDir = createTempProject();
      assert.throws(() => phase.cmdPhaseAdd(tmpDir, ''), /description required/);
    });

    it('appends a new phase to roadmap', () => {
      tmpDir = createTempProject();
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '# Roadmap — v1.0',
        '',
        '### Phase 1: Foundation',
        '',
        '**Goal:** Set up project structure',
        '',
        '### Phase 2: Core Logic',
        '',
        '**Goal:** Implement business logic',
        '',
      ].join('\n'), 'utf-8');

      const result = phase.cmdPhaseAdd(tmpDir, 'Deployment');
      assert.strictEqual(result.phase_number, 3);
      assert.strictEqual(result.name, 'Deployment');
      assert.ok(result.slug);
      assert.ok(fs.existsSync(path.join(tmpDir, result.directory)));

      const roadmap = fs.readFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), 'utf-8');
      assert.ok(roadmap.includes('Phase 3: Deployment'));
    });

    it('creates phase directory on disk', () => {
      tmpDir = createTempProject();
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '# Roadmap',
        '',
        '### Phase 1: Setup',
        '',
        '**Goal:** Initial setup',
        '',
      ].join('\n'), 'utf-8');

      const result = phase.cmdPhaseAdd(tmpDir, 'Testing');
      const dirPath = path.join(tmpDir, result.directory);
      assert.ok(fs.existsSync(dirPath));
      assert.ok(fs.existsSync(path.join(dirPath, '.gitkeep')));
    });
  });

  // ─── cmdPhaseInsert ──────────────────────────────────────────────────

  describe('cmdPhaseInsert()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('throws when arguments are missing', () => {
      tmpDir = createTempProject();
      assert.throws(() => phase.cmdPhaseInsert(tmpDir, null, 'test'), /after-phase and description required/);
      assert.throws(() => phase.cmdPhaseInsert(tmpDir, '1', ''), /after-phase and description required/);
    });

    it('inserts a decimal phase after the target phase', () => {
      tmpDir = createTempProject();
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '# Roadmap',
        '',
        '### Phase 1: Foundation',
        '',
        '**Goal:** Set up project',
        '',
        '### Phase 2: Core',
        '',
        '**Goal:** Build core',
        '',
      ].join('\n'), 'utf-8');
      createPhaseDir(tmpDir, 1, 'foundation');

      const result = phase.cmdPhaseInsert(tmpDir, '1', 'Urgent Hotfix');
      assert.strictEqual(result.phase_number, '01.1');
      assert.strictEqual(result.after_phase, '1');
      assert.ok(result.slug);
      assert.ok(fs.existsSync(path.join(tmpDir, result.directory)));

      const roadmap = fs.readFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), 'utf-8');
      assert.ok(roadmap.includes('Phase 01.1: Urgent Hotfix'));
    });

    it('increments decimal when a decimal already exists', () => {
      tmpDir = createTempProject();
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '# Roadmap',
        '',
        '### Phase 1: Foundation',
        '',
        '**Goal:** Set up project',
        '',
      ].join('\n'), 'utf-8');
      createPhaseDir(tmpDir, 1, 'foundation');
      fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01.1-hotfix'), { recursive: true });

      const result = phase.cmdPhaseInsert(tmpDir, '1', 'Second Hotfix');
      assert.strictEqual(result.phase_number, '01.2');
    });
  });

  // ─── cmdPhaseRemove ──────────────────────────────────────────────────

  describe('cmdPhaseRemove()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('throws when phase is not provided', () => {
      tmpDir = createTempProject();
      assert.throws(() => phase.cmdPhaseRemove(tmpDir, null), /phase number required/);
    });

    it('removes a phase from roadmap and disk', () => {
      tmpDir = createTempProject();
      createPhaseDir(tmpDir, 1, 'foundation');
      createPhaseDir(tmpDir, 2, 'core');
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '# Roadmap',
        '',
        '### Phase 1: Foundation',
        '',
        '**Goal:** Set up project',
        '',
        '### Phase 2: Core',
        '',
        '**Goal:** Build core',
        '',
      ].join('\n'), 'utf-8');

      const result = phase.cmdPhaseRemove(tmpDir, '2', { force: true });
      assert.strictEqual(result.removed, '2');
      assert.ok(result.roadmap_updated);
      assert.ok(!fs.existsSync(path.join(tmpDir, '.planning', 'phases', '02-core')));
    });

    it('renumbers subsequent phases after integer removal', () => {
      tmpDir = createTempProject();
      createPhaseDir(tmpDir, 1, 'alpha');
      createPhaseDir(tmpDir, 2, 'beta');
      createPhaseDir(tmpDir, 3, 'gamma');
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '# Roadmap',
        '',
        '### Phase 1: Alpha',
        '',
        '**Goal:** Alpha work',
        '',
        '### Phase 2: Beta',
        '',
        '**Goal:** Beta work',
        '',
        '### Phase 3: Gamma',
        '',
        '**Goal:** Gamma work',
        '',
      ].join('\n'), 'utf-8');

      const result = phase.cmdPhaseRemove(tmpDir, '2', { force: true });
      assert.ok(result.renamed_directories.length > 0);
      // Phase 3 should have been renamed to 2
      assert.ok(fs.existsSync(path.join(tmpDir, '.planning', 'phases', '02-gamma')));
      assert.ok(!fs.existsSync(path.join(tmpDir, '.planning', 'phases', '03-gamma')));
    });

    it('blocks removal of phase with summaries unless force is set', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'foundation');
      writePlanFile(tmpDir, dirName, 1);
      writeSummaryFile(tmpDir, dirName, 1);
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '# Roadmap',
        '',
        '### Phase 1: Foundation',
        '',
        '**Goal:** Set up project',
        '',
      ].join('\n'), 'utf-8');

      assert.throws(
        () => phase.cmdPhaseRemove(tmpDir, '1', { force: false }),
        /executed plan/
      );
    });
  });

  // ─── cmdPhaseComplete ────────────────────────────────────────────────

  describe('cmdPhaseComplete()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('throws when phase number is not provided', () => {
      tmpDir = createTempProject();
      assert.throws(() => phase.cmdPhaseComplete(tmpDir, null), /phase number required/);
    });

    it('completes a phase and advances state to next phase', () => {
      tmpDir = createTempProject();
      const { dirName: dir1 } = createPhaseDir(tmpDir, 1, 'foundation');
      createPhaseDir(tmpDir, 2, 'core');
      writePlanFile(tmpDir, dir1, 1);
      writeSummaryFile(tmpDir, dir1, 1);
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '# Roadmap',
        '',
        '### Phase 1: Foundation',
        '',
        '**Goal:** Set up project',
        '**Plans:** 1 plans',
        '',
        '### Phase 2: Core',
        '',
        '**Goal:** Build core',
        '',
      ].join('\n'), 'utf-8');

      const result = phase.cmdPhaseComplete(tmpDir, '01');
      assert.strictEqual(result.completed_phase, '01');
      assert.strictEqual(result.next_phase, '02');
      assert.strictEqual(result.is_last_phase, false);
      assert.ok(result.roadmap_updated);
      assert.ok(result.state_updated);
    });

    it('marks is_last_phase when completing the final phase', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'only-phase');
      writePlanFile(tmpDir, dirName, 1);
      writeSummaryFile(tmpDir, dirName, 1);
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '# Roadmap',
        '',
        '### Phase 1: Only Phase',
        '',
        '**Goal:** Do everything',
        '**Plans:** 1 plans',
        '',
      ].join('\n'), 'utf-8');

      const result = phase.cmdPhaseComplete(tmpDir, '01');
      assert.strictEqual(result.is_last_phase, true);
      assert.strictEqual(result.next_phase, null);
    });

    it('reports plan execution ratio', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'foundation');
      writePlanFile(tmpDir, dirName, 1);
      writePlanFile(tmpDir, dirName, 2);
      writeSummaryFile(tmpDir, dirName, 1);
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '# Roadmap',
        '',
        '### Phase 1: Foundation',
        '',
        '**Goal:** Set up project',
        '**Plans:** 2 plans',
        '',
      ].join('\n'), 'utf-8');

      const result = phase.cmdPhaseComplete(tmpDir, '01');
      assert.strictEqual(result.plans_executed, '1/2');
    });
  });
});
