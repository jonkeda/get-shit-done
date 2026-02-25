/**
 * GSD Copilot MCP Server Tests — roadmap.js
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

let roadmap;

describe('roadmap.js', () => {
  before(async () => {
    roadmap = await loadModule('roadmap.js');
  });

  // ─── cmdRoadmapAnalyze ───────────────────────────────────────────────

  describe('cmdRoadmapAnalyze()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns error when ROADMAP.md is missing', () => {
      tmpDir = createTempProject();
      const result = roadmap.cmdRoadmapAnalyze(tmpDir);
      assert.ok(result.error);
      assert.deepStrictEqual(result.phases, []);
      assert.strictEqual(result.current_phase, null);
    });

    it('parses phases from a basic roadmap', () => {
      tmpDir = createTempProject({ roadmap: true });
      const result = roadmap.cmdRoadmapAnalyze(tmpDir);
      assert.strictEqual(result.phase_count, 3);
      assert.strictEqual(result.phases[0].name, 'Foundation');
      assert.strictEqual(result.phases[1].name, 'Core Logic');
      assert.strictEqual(result.phases[2].name, 'Polish');
    });

    it('reports goals for each phase', () => {
      tmpDir = createTempProject({ roadmap: true });
      const result = roadmap.cmdRoadmapAnalyze(tmpDir);
      assert.strictEqual(result.phases[0].goal, 'Set up project structure');
      assert.strictEqual(result.phases[1].goal, 'Implement business logic');
    });

    it('returns zero progress when no plans exist', () => {
      tmpDir = createTempProject({ roadmap: true });
      const result = roadmap.cmdRoadmapAnalyze(tmpDir);
      assert.strictEqual(result.total_plans, 0);
      assert.strictEqual(result.total_summaries, 0);
      assert.strictEqual(result.progress_percent, 0);
      assert.strictEqual(result.completed_phases, 0);
    });

    it('detects disk_status from phase directories', () => {
      tmpDir = createTempProject({ roadmap: true });
      // Phase 1: has plan (planned)
      const p1 = createPhaseDir(tmpDir, 1, 'Foundation');
      writePlanFile(tmpDir, p1.dirName, 1);
      // Phase 2: has plan + summary (complete)
      const p2 = createPhaseDir(tmpDir, 2, 'Core Logic');
      writePlanFile(tmpDir, p2.dirName, 1);
      writeSummaryFile(tmpDir, p2.dirName, 1);

      const result = roadmap.cmdRoadmapAnalyze(tmpDir);
      assert.strictEqual(result.phases[0].disk_status, 'planned');
      assert.strictEqual(result.phases[1].disk_status, 'complete');
      assert.strictEqual(result.phases[2].disk_status, 'no_directory');
    });

    it('calculates progress percent from plans/summaries', () => {
      tmpDir = createTempProject({ roadmap: true });
      const p1 = createPhaseDir(tmpDir, 1, 'Foundation');
      writePlanFile(tmpDir, p1.dirName, 1);
      writePlanFile(tmpDir, p1.dirName, 2);
      writeSummaryFile(tmpDir, p1.dirName, 1);

      const result = roadmap.cmdRoadmapAnalyze(tmpDir);
      assert.strictEqual(result.total_plans, 2);
      assert.strictEqual(result.total_summaries, 1);
      assert.strictEqual(result.progress_percent, 50);
    });

    it('identifies current_phase and next_phase', () => {
      tmpDir = createTempProject({ roadmap: true });
      // Phase 1 complete
      const p1 = createPhaseDir(tmpDir, 1, 'Foundation');
      writePlanFile(tmpDir, p1.dirName, 1);
      writeSummaryFile(tmpDir, p1.dirName, 1);
      // Phase 2 planned (current)
      const p2 = createPhaseDir(tmpDir, 2, 'Core Logic');
      writePlanFile(tmpDir, p2.dirName, 1);

      const result = roadmap.cmdRoadmapAnalyze(tmpDir);
      assert.strictEqual(result.current_phase, '2');
      assert.strictEqual(result.next_phase, '3');
    });

    it('parses milestones from ## headings with version', () => {
      tmpDir = createTempProject();
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '## Milestone v1.0 — MVP',
        '',
        '### Phase 1: Setup',
        '**Goal:** Initialize',
        '',
        '## Milestone v2.0 — Enhanced',
        '',
        '### Phase 2: Extend',
        '**Goal:** Add features',
        '',
      ].join('\n'), 'utf-8');

      const result = roadmap.cmdRoadmapAnalyze(tmpDir);
      assert.strictEqual(result.milestones.length, 2);
      assert.strictEqual(result.milestones[0].version, 'v1.0');
      assert.strictEqual(result.milestones[1].version, 'v2.0');
      assert.strictEqual(result.phase_count, 2);
    });
  });

  // ─── cmdRoadmapGetPhase ──────────────────────────────────────────────

  describe('cmdRoadmapGetPhase()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns found:false when ROADMAP.md is missing', () => {
      tmpDir = createTempProject();
      const result = roadmap.cmdRoadmapGetPhase(tmpDir, '1');
      assert.strictEqual(result.found, false);
      assert.ok(result.error);
    });

    it('returns phase details with goal and section', () => {
      tmpDir = createTempProject();
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '### Phase 1: Foundation',
        '',
        '**Goal:** Set up the base project structure',
        '',
        '**Success Criteria:**',
        '1. All deps installed',
        '2. Tests passing',
        '',
        '### Phase 2: Features',
        '**Goal:** Build features',
        '',
      ].join('\n'), 'utf-8');

      const result = roadmap.cmdRoadmapGetPhase(tmpDir, '1');
      assert.strictEqual(result.found, true);
      assert.strictEqual(result.phase_number, '1');
      assert.strictEqual(result.phase_name, 'Foundation');
      assert.strictEqual(result.goal, 'Set up the base project structure');
      assert.ok(result.section.includes('Phase 1'));
    });

    it('parses success criteria as array', () => {
      tmpDir = createTempProject();
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '### Phase 1: Setup',
        '',
        '**Goal:** Init',
        '',
        '**Success Criteria**:',
        '1. First criterion',
        '2. Second criterion',
        '3. Third criterion',
        '',
      ].join('\n'), 'utf-8');

      const result = roadmap.cmdRoadmapGetPhase(tmpDir, '1');
      assert.deepStrictEqual(result.success_criteria, [
        'First criterion',
        'Second criterion',
        'Third criterion',
      ]);
    });

    it('returns found:false for non-existent phase', () => {
      tmpDir = createTempProject({ roadmap: true });
      const result = roadmap.cmdRoadmapGetPhase(tmpDir, '99');
      assert.strictEqual(result.found, false);
      assert.strictEqual(result.phase_number, '99');
    });
  });

  // ─── cmdRoadmapUpdatePlanProgress ────────────────────────────────────

  describe('cmdRoadmapUpdatePlanProgress()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('throws when phase number is missing', () => {
      tmpDir = createTempProject({ roadmap: true });
      assert.throws(() => roadmap.cmdRoadmapUpdatePlanProgress(tmpDir, null), /phase number required/i);
    });

    it('returns updated:false when no plans exist', () => {
      tmpDir = createTempProject({ roadmap: true });
      createPhaseDir(tmpDir, 1, 'Foundation');
      const result = roadmap.cmdRoadmapUpdatePlanProgress(tmpDir, '01');
      assert.strictEqual(result.updated, false);
      assert.strictEqual(result.plan_count, 0);
    });

    it('updates roadmap with plan progress and marks complete', () => {
      tmpDir = createTempProject();
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '- [ ] **Phase 1: Foundation**',
        '',
        '### Phase 1: Foundation',
        '',
        '**Goal:** Setup',
        '**Plans:** 0/1 plans executed',
        '',
      ].join('\n'), 'utf-8');

      const p1 = createPhaseDir(tmpDir, 1, 'Foundation');
      writePlanFile(tmpDir, p1.dirName, 1);
      writeSummaryFile(tmpDir, p1.dirName, 1);

      const result = roadmap.cmdRoadmapUpdatePlanProgress(tmpDir, '1');
      assert.strictEqual(result.updated, true);
      assert.strictEqual(result.complete, true);
      assert.strictEqual(result.status, 'Complete');
      assert.strictEqual(result.plan_count, 1);
      assert.strictEqual(result.summary_count, 1);

      const content = fs.readFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), 'utf-8');
      assert.ok(content.includes('1/1 plans complete'), 'should update Plans line');
      assert.ok(content.includes('[x]'), 'should check the checkbox');
    });
  });

  // ─── cmdRoadmapUpdatePhaseStatus ─────────────────────────────────────

  describe('cmdRoadmapUpdatePhaseStatus()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('throws on missing phase number', () => {
      tmpDir = createTempProject({ roadmap: true });
      assert.throws(() => roadmap.cmdRoadmapUpdatePhaseStatus(tmpDir, null, 'complete'), /phase number required/i);
    });

    it('throws on invalid status', () => {
      tmpDir = createTempProject({ roadmap: true });
      assert.throws(() => roadmap.cmdRoadmapUpdatePhaseStatus(tmpDir, '1', 'invalid'), /invalid status/i);
    });

    it('returns updated:false when ROADMAP.md is missing', () => {
      tmpDir = createTempProject();
      const result = roadmap.cmdRoadmapUpdatePhaseStatus(tmpDir, '1', 'complete');
      assert.strictEqual(result.updated, false);
    });

    it('updates Status line to In Progress', () => {
      tmpDir = createTempProject();
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '### Phase 1: Foundation',
        '',
        '**Goal:** Init',
        '**Status:** Not Started',
        '',
      ].join('\n'), 'utf-8');

      const result = roadmap.cmdRoadmapUpdatePhaseStatus(tmpDir, '1', 'in-progress');
      assert.strictEqual(result.updated, true);
      assert.strictEqual(result.status, 'in-progress');
      assert.ok(result.date);

      const content = fs.readFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), 'utf-8');
      assert.ok(content.includes('**Status:** In Progress'));
    });

    it('checks checkbox and sets date when status is complete', () => {
      tmpDir = createTempProject();
      fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), [
        '- [ ] **Phase 1: Foundation**',
        '',
        '### Phase 1: Foundation',
        '',
        '**Goal:** Build base',
        '**Status:** In Progress',
        '',
      ].join('\n'), 'utf-8');

      const result = roadmap.cmdRoadmapUpdatePhaseStatus(tmpDir, '1', 'complete');
      assert.strictEqual(result.updated, true);
      assert.strictEqual(result.status, 'complete');

      const content = fs.readFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), 'utf-8');
      assert.ok(content.includes('[x]'), 'should check the checkbox');
      assert.ok(content.includes('Complete ('), 'should include completion date in status');
    });
  });
});
