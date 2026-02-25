/**
 * GSD Copilot MCP Server Tests — verify.js
 */

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  loadVerify,
  createTempProject,
  cleanup,
  writeRoadmap,
  writeProject,
  createPhaseDir,
  writePlanFile,
  writeSummaryFile,
} = require('./copilot-helpers.cjs');

let verify;

describe('verify.js', () => {
  before(async () => {
    verify = await loadVerify();
  });

  // ─── cmdVerifyPlanStructure ───────────────────────────────────────────

  describe('cmdVerifyPlanStructure()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('validates a well-formed plan', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'foundation');
      const { filePath } = writePlanFile(tmpDir, dirName, 1, {
        wave: 1,
        type: 'implementation',
        autonomous: true,
      });
      const relPath = path.relative(tmpDir, filePath);

      const result = verify.cmdVerifyPlanStructure(tmpDir, relPath);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
      assert.ok(result.task_count >= 1);
    });

    it('detects missing wave frontmatter field', () => {
      tmpDir = createTempProject();
      const planPath = path.join(tmpDir, 'test-plan.md');
      fs.writeFileSync(planPath, `---
phase: "01"
plan: "01-01"
type: implementation
depends_on: []
files_modified: []
autonomous: true
must_haves:
  artifacts: []
---

# Plan

<task>
<name>Task 1</name>
<action>Do it</action>
</task>
`, 'utf-8');

      const result = verify.cmdVerifyPlanStructure(tmpDir, planPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('wave')));
    });

    it('detects missing task elements', () => {
      tmpDir = createTempProject();
      const planPath = path.join(tmpDir, 'test-plan.md');
      fs.writeFileSync(planPath, `---
phase: "01"
plan: "01-01"
type: implementation
wave: 1
depends_on: []
files_modified: []
autonomous: true
must_haves:
  artifacts: []
  key_links: []
---

# Plan

<task>
<name>Incomplete Task</name>
</task>
`, 'utf-8');

      const result = verify.cmdVerifyPlanStructure(tmpDir, planPath);
      assert.ok(result.errors.some(e => e.includes('missing <action>')));
    });

    it('warns on wave > 1 with empty depends_on', () => {
      tmpDir = createTempProject();
      const planPath = path.join(tmpDir, 'test-plan.md');
      fs.writeFileSync(planPath, `---
phase: "01"
plan: "01-02"
type: implementation
wave: 2
depends_on: []
files_modified: []
autonomous: true
must_haves:
  artifacts: []
  key_links: []
---

# Plan

<task>
<name>Task</name>
<action>Do</action>
<verify>Check</verify>
<done>Done</done>
</task>
`, 'utf-8');

      const result = verify.cmdVerifyPlanStructure(tmpDir, planPath);
      assert.ok(result.warnings.some(w => w.includes('Wave > 1') && w.includes('depends_on')));
    });

    it('returns error for missing file', () => {
      tmpDir = createTempProject();
      const result = verify.cmdVerifyPlanStructure(tmpDir, '/nonexistent.md');
      assert.ok(result.error);
    });

    it('warns when no tasks found', () => {
      tmpDir = createTempProject();
      const planPath = path.join(tmpDir, 'no-tasks.md');
      fs.writeFileSync(planPath, `---
phase: "01"
plan: "01-01"
type: implementation
wave: 1
depends_on: []
files_modified: []
autonomous: true
must_haves:
  artifacts: []
  key_links: []
---

# Plan with no tasks

Just some text.
`, 'utf-8');

      const result = verify.cmdVerifyPlanStructure(tmpDir, planPath);
      assert.ok(result.warnings.some(w => w.includes('No <task>')));
      assert.strictEqual(result.task_count, 0);
    });
  });

  // ─── cmdVerifyPhaseCompleteness ───────────────────────────────────────

  describe('cmdVerifyPhaseCompleteness()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('reports complete phase when all plans have summaries', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'foundation');
      writePlanFile(tmpDir, dirName, 1);
      writeSummaryFile(tmpDir, dirName, 1);

      const result = verify.cmdVerifyPhaseCompleteness(tmpDir, '1');
      assert.strictEqual(result.complete, true);
      assert.strictEqual(result.plan_count, 1);
      assert.strictEqual(result.summary_count, 1);
      assert.strictEqual(result.incomplete_plans.length, 0);
    });

    it('reports incomplete phase with missing summaries', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 2, 'api');
      writePlanFile(tmpDir, dirName, 1);
      writePlanFile(tmpDir, dirName, 2);
      writeSummaryFile(tmpDir, dirName, 1);

      const result = verify.cmdVerifyPhaseCompleteness(tmpDir, '2');
      assert.strictEqual(result.complete, false);
      assert.strictEqual(result.incomplete_plans.length, 1);
    });

    it('returns error for nonexistent phase', () => {
      tmpDir = createTempProject();
      const result = verify.cmdVerifyPhaseCompleteness(tmpDir, '99');
      assert.ok(result.error);
    });
  });

  // ─── cmdValidateConsistency ───────────────────────────────────────────

  describe('cmdValidateConsistency()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('passes for consistent roadmap and disk phases', () => {
      tmpDir = createTempProject();
      writeRoadmap(tmpDir, [
        { num: 1, name: 'Foundation', goal: 'Setup' },
        { num: 2, name: 'Core', goal: 'Build' },
      ]);
      createPhaseDir(tmpDir, 1, 'foundation');
      createPhaseDir(tmpDir, 2, 'core');

      const result = verify.cmdValidateConsistency(tmpDir);
      assert.strictEqual(result.passed, true);
    });

    it('warns on roadmap phase without disk directory', () => {
      tmpDir = createTempProject();
      writeRoadmap(tmpDir, [
        { num: 1, name: 'Foundation', goal: 'Setup' },
        { num: 2, name: 'Core', goal: 'Build' },
      ]);
      createPhaseDir(tmpDir, 1, 'foundation');
      // Phase 2 directory missing

      const result = verify.cmdValidateConsistency(tmpDir);
      assert.ok(result.warnings.some(w => w.includes('Phase 2') && w.includes('no directory')));
    });

    it('warns on disk phase without roadmap entry', () => {
      tmpDir = createTempProject();
      writeRoadmap(tmpDir, [{ num: 1, name: 'Foundation', goal: 'Setup' }]);
      createPhaseDir(tmpDir, 1, 'foundation');
      createPhaseDir(tmpDir, 2, 'extra');

      const result = verify.cmdValidateConsistency(tmpDir);
      assert.ok(result.warnings.some(w => w.includes('02') && w.includes('not in ROADMAP')));
    });

    it('returns error when ROADMAP.md is missing', () => {
      tmpDir = createTempProject();
      const result = verify.cmdValidateConsistency(tmpDir);
      assert.strictEqual(result.passed, false);
      assert.ok(result.errors.some(e => e.code === 'E001'));
    });
  });

  // ─── cmdValidateHealth ────────────────────────────────────────────────

  describe('cmdValidateHealth()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns healthy for minimal valid project', () => {
      tmpDir = createTempProject({ roadmap: true, project: true });
      // Create phase dirs matching default roadmap (phases 1-3)
      createPhaseDir(tmpDir, 1, 'foundation');
      createPhaseDir(tmpDir, 2, 'core-logic');
      createPhaseDir(tmpDir, 3, 'polish');
      const result = verify.cmdValidateHealth(tmpDir);
      assert.strictEqual(result.status, 'healthy');
      assert.strictEqual(result.errors.length, 0);
    });

    it('returns broken when .planning/ is missing', () => {
      tmpDir = createTempProject({ config: false, state: false });
      fs.rmSync(path.join(tmpDir, '.planning'), { recursive: true, force: true });

      const result = verify.cmdValidateHealth(tmpDir);
      assert.strictEqual(result.status, 'broken');
      assert.ok(result.errors.some(e => e.code === 'E001'));
    });

    it('reports error for missing STATE.md', () => {
      tmpDir = createTempProject({ state: false, roadmap: true, project: true });
      const result = verify.cmdValidateHealth(tmpDir);
      assert.ok(result.errors.some(e => e.code === 'E004'));
    });

    it('reports error for missing PROJECT.md', () => {
      tmpDir = createTempProject({ roadmap: true });
      const result = verify.cmdValidateHealth(tmpDir);
      assert.ok(result.errors.some(e => e.code === 'E002'));
    });

    it('reports error for missing ROADMAP.md', () => {
      tmpDir = createTempProject({ project: true });
      const result = verify.cmdValidateHealth(tmpDir);
      assert.ok(result.errors.some(e => e.code === 'E003'));
    });

    it('detects corrupt config.json', () => {
      tmpDir = createTempProject({ config: false, roadmap: true, project: true });
      fs.writeFileSync(path.join(tmpDir, '.planning', 'config.json'), 'NOT JSON', 'utf-8');

      const result = verify.cmdValidateHealth(tmpDir);
      assert.ok(result.errors.some(e => e.code === 'E005'));
    });

    it('warns on invalid model_profile value', () => {
      tmpDir = createTempProject({
        config: { model_profile: 'invalid_profile' },
        roadmap: true,
        project: true,
      });
      const result = verify.cmdValidateHealth(tmpDir);
      assert.ok(result.warnings.some(w => w.code === 'W004'));
    });

    it('reports repairable count', () => {
      tmpDir = createTempProject({ state: false, config: false, roadmap: true, project: true });
      const result = verify.cmdValidateHealth(tmpDir);
      assert.ok(result.repairable_count > 0);
    });
  });

  // ─── cmdVerifySummary ─────────────────────────────────────────────────

  describe('cmdVerifySummary()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('passes for valid summary with existing files', () => {
      tmpDir = createTempProject();
      // Create referenced files
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'export default {};', 'utf-8');

      const summaryPath = path.join(tmpDir, 'summary.md');
      fs.writeFileSync(summaryPath, `# Summary

Created \`src/index.ts\` with the main module.

## Self-Check

All checks pass ✅
`, 'utf-8');

      const result = verify.cmdVerifySummary(tmpDir, 'summary.md');
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.checks.summary_exists, true);
      assert.strictEqual(result.checks.self_check, 'passed');
    });

    it('fails for missing summary file', () => {
      tmpDir = createTempProject();
      const result = verify.cmdVerifySummary(tmpDir, 'nonexistent.md');
      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.checks.summary_exists, false);
    });

    it('detects failed self-check', () => {
      tmpDir = createTempProject();
      const summaryPath = path.join(tmpDir, 'summary.md');
      fs.writeFileSync(summaryPath, `# Summary

## Self-Check

Tests failed ❌ - incomplete implementation
`, 'utf-8');

      const result = verify.cmdVerifySummary(tmpDir, 'summary.md');
      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.checks.self_check, 'failed');
    });
  });

  // ─── cmdVerifyReferences ──────────────────────────────────────────────

  describe('cmdVerifyReferences()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('validates existing file references', () => {
      tmpDir = createTempProject();
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'code', 'utf-8');

      const docPath = path.join(tmpDir, 'doc.md');
      fs.writeFileSync(docPath, 'See `src/app.ts` for details.', 'utf-8');

      const result = verify.cmdVerifyReferences(tmpDir, docPath);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.found, 1);
      assert.strictEqual(result.missing.length, 0);
    });

    it('reports missing referenced files', () => {
      tmpDir = createTempProject();
      const docPath = path.join(tmpDir, 'doc.md');
      fs.writeFileSync(docPath, 'See `src/nonexistent.ts` for details.', 'utf-8');

      const result = verify.cmdVerifyReferences(tmpDir, docPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.missing.length > 0);
    });
  });
});
