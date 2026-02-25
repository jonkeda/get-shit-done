/**
 * GSD Copilot MCP Server Tests — milestone.js
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
  writeState,
  createPhaseDir,
  writePlanFile,
  writeSummaryFile,
} = require('./copilot-helpers.cjs');

let milestone;

describe('milestone.js', () => {
  before(async () => {
    milestone = await loadModule('milestone.js');
  });

  // ─── cmdRequirementsMarkComplete ──────────────────────────────────────

  describe('cmdRequirementsMarkComplete()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('marks checkbox requirements complete', () => {
      tmpDir = createTempProject();
      const reqPath = path.join(tmpDir, '.planning', 'REQUIREMENTS.md');
      fs.writeFileSync(reqPath, [
        '# Requirements',
        '',
        '- [ ] **REQ-01** First requirement',
        '- [ ] **REQ-02** Second requirement',
        '- [ ] **REQ-03** Third requirement',
      ].join('\n'), 'utf-8');

      const result = milestone.cmdRequirementsMarkComplete(tmpDir, ['REQ-01', 'REQ-03']);
      assert.strictEqual(result.updated, true);
      assert.deepStrictEqual(result.marked_complete, ['REQ-01', 'REQ-03']);
      assert.deepStrictEqual(result.not_found, []);
      assert.strictEqual(result.total, 2);

      const content = fs.readFileSync(reqPath, 'utf-8');
      assert.ok(content.includes('- [x] **REQ-01**'));
      assert.ok(content.includes('- [ ] **REQ-02**'));
      assert.ok(content.includes('- [x] **REQ-03**'));
    });

    it('marks table-format requirements complete', () => {
      tmpDir = createTempProject();
      const reqPath = path.join(tmpDir, '.planning', 'REQUIREMENTS.md');
      fs.writeFileSync(reqPath, [
        '# Requirements',
        '',
        '| ID | Description | Status |',
        '|----|-------------|--------|',
        '| REQ-01 | First requirement | Pending |',
        '| REQ-02 | Second requirement | Pending |',
      ].join('\n'), 'utf-8');

      const result = milestone.cmdRequirementsMarkComplete(tmpDir, 'REQ-02');
      assert.strictEqual(result.updated, true);
      assert.deepStrictEqual(result.marked_complete, ['REQ-02']);

      const content = fs.readFileSync(reqPath, 'utf-8');
      assert.ok(content.includes('Complete'));
      assert.ok(/\|\s*REQ-01\s*\|[^|]+\|\s*Pending\s*\|/.test(content));
    });

    it('reports not_found for missing requirement IDs', () => {
      tmpDir = createTempProject();
      const reqPath = path.join(tmpDir, '.planning', 'REQUIREMENTS.md');
      fs.writeFileSync(reqPath, '# Requirements\n\n- [ ] **REQ-01** Only one\n', 'utf-8');

      const result = milestone.cmdRequirementsMarkComplete(tmpDir, ['REQ-01', 'REQ-99']);
      assert.strictEqual(result.updated, true);
      assert.deepStrictEqual(result.marked_complete, ['REQ-01']);
      assert.deepStrictEqual(result.not_found, ['REQ-99']);
      assert.strictEqual(result.total, 2);
    });

    it('returns updated:false when REQUIREMENTS.md is missing', () => {
      tmpDir = createTempProject();
      const result = milestone.cmdRequirementsMarkComplete(tmpDir, ['REQ-01']);
      assert.strictEqual(result.updated, false);
      assert.ok(result.reason);
    });

    it('throws when no reqIds provided', () => {
      tmpDir = createTempProject();
      assert.throws(() => milestone.cmdRequirementsMarkComplete(tmpDir, []), /requirement IDs required/);
    });
  });

  // ─── cmdMilestoneComplete ─────────────────────────────────────────────

  describe('cmdMilestoneComplete()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('archives milestone and returns summary', () => {
      tmpDir = createTempProject({ roadmap: true, state: { status: 'In progress' } });

      // Create REQUIREMENTS.md
      fs.writeFileSync(
        path.join(tmpDir, '.planning', 'REQUIREMENTS.md'),
        '# Requirements\n\n- [x] **REQ-01** Done\n',
        'utf-8'
      );

      // Create a phase with plan + summary
      const { dirName } = createPhaseDir(tmpDir, 1, 'Foundation');
      writePlanFile(tmpDir, dirName, 1);
      const summaryPath = path.join(tmpDir, '.planning', 'phases', dirName, '01-01-SUMMARY.md');
      fs.writeFileSync(summaryPath, [
        '---',
        'one-liner: Built the foundation layer',
        '---',
        '',
        '# Summary 01-01',
        '',
        '## Task 1',
        'Did the thing.',
      ].join('\n'), 'utf-8');

      const result = milestone.cmdMilestoneComplete(tmpDir, 'v1.0', { name: 'MVP' });

      assert.strictEqual(result.version, 'v1.0');
      assert.strictEqual(result.name, 'MVP');
      assert.strictEqual(result.phases, 1);
      assert.strictEqual(result.plans, 1);
      assert.strictEqual(result.tasks, 1);
      assert.deepStrictEqual(result.accomplishments, ['Built the foundation layer']);
      assert.strictEqual(result.archived.roadmap, true);
      assert.strictEqual(result.archived.requirements, true);
      assert.strictEqual(result.milestones_updated, true);
      assert.strictEqual(result.state_updated, true);

      // Verify MILESTONES.md was created
      const milestonesPath = path.join(tmpDir, '.planning', 'MILESTONES.md');
      assert.ok(fs.existsSync(milestonesPath));
      const milestonesContent = fs.readFileSync(milestonesPath, 'utf-8');
      assert.ok(milestonesContent.includes('v1.0 MVP'));
      assert.ok(milestonesContent.includes('Built the foundation layer'));
    });

    it('archives phases when archivePhases option is set', () => {
      tmpDir = createTempProject({ roadmap: true });
      const { dirName } = createPhaseDir(tmpDir, 1, 'Foundation');
      writePlanFile(tmpDir, dirName, 1);
      writeSummaryFile(tmpDir, dirName, 1);

      const result = milestone.cmdMilestoneComplete(tmpDir, 'v1.0', { archivePhases: true });
      assert.strictEqual(result.archived.phases, true);

      // Phase dir should have been moved
      const phasesDir = path.join(tmpDir, '.planning', 'phases');
      const remaining = fs.readdirSync(phasesDir).filter(f => !f.startsWith('.'));
      assert.strictEqual(remaining.length, 0);
    });

    it('throws when version is missing', () => {
      tmpDir = createTempProject();
      assert.throws(() => milestone.cmdMilestoneComplete(tmpDir, ''), /version required/);
    });
  });

  // ─── cmdMilestoneStats ────────────────────────────────────────────────

  describe('cmdMilestoneStats()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns stats for a project with phases, plans, and summaries', () => {
      tmpDir = createTempProject({ roadmap: true });

      // Phase 1: 1 plan + 1 summary (completed)
      const { dirName: d1 } = createPhaseDir(tmpDir, 1, 'Foundation');
      writePlanFile(tmpDir, d1, 1);
      writeSummaryFile(tmpDir, d1, 1);

      // Phase 2: 1 plan, no summary (incomplete)
      const { dirName: d2 } = createPhaseDir(tmpDir, 2, 'Core Logic');
      writePlanFile(tmpDir, d2, 1);

      const result = milestone.cmdMilestoneStats(tmpDir);
      assert.strictEqual(result.totalPhases, 3); // 3 from roadmap, 2 on disk → max(2,3)=3
      assert.strictEqual(result.completedPhases, 1);
      assert.strictEqual(result.remainingPhases, 2);
      assert.strictEqual(result.totalPlans, 2);
      assert.strictEqual(result.totalSummaries, 1);
      assert.strictEqual(result.planProgress, 50);
    });

    it('returns requirement coverage from checkbox format', () => {
      tmpDir = createTempProject({ roadmap: true });
      fs.writeFileSync(
        path.join(tmpDir, '.planning', 'REQUIREMENTS.md'),
        [
          '# Requirements',
          '',
          '- [x] **REQ-01** Done',
          '- [ ] **REQ-02** Pending',
          '- [x] **REQ-03** Done',
        ].join('\n'),
        'utf-8'
      );

      const result = milestone.cmdMilestoneStats(tmpDir);
      assert.strictEqual(result.requirementsCoverage.total, 3);
      assert.strictEqual(result.requirementsCoverage.complete, 2);
      assert.strictEqual(result.requirementsCoverage.percent, 67);
    });

    it('counts active blockers from STATE.md', () => {
      tmpDir = createTempProject({
        roadmap: true,
        state: { blockers: '- Waiting on API keys\n- Need design review' },
      });

      const result = milestone.cmdMilestoneStats(tmpDir);
      assert.strictEqual(result.blockersCount, 2);
    });

    it('returns zeroes for an empty project', () => {
      tmpDir = createTempProject();
      const result = milestone.cmdMilestoneStats(tmpDir);
      assert.strictEqual(result.totalPhases, 0);
      assert.strictEqual(result.completedPhases, 0);
      assert.strictEqual(result.totalPlans, 0);
      assert.strictEqual(result.totalSummaries, 0);
      assert.strictEqual(result.planProgress, 0);
      assert.strictEqual(result.requirementsCoverage.total, 0);
      assert.strictEqual(result.requirementsCoverage.percent, 0);
    });
  });
});
