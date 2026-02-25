/**
 * GSD Copilot MCP Server Tests — template.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  loadTemplate,
  createTempProject,
  cleanup,
  createPhaseDir,
  writePlanFile,
} = require('./copilot-helpers.cjs');

let tpl;

describe('template.js', () => {
  before(async () => {
    tpl = await loadTemplate();
  });

  // ─── cmdTemplateSelect ──────────────────────────────────────────────

  describe('cmdTemplateSelect()', () => {
    let tmpDir;

    after(() => { if (tmpDir) cleanup(tmpDir); });

    it('throws when planPath is missing', () => {
      assert.throws(() => tpl.cmdTemplateSelect('/tmp', ''), /plan-path required/);
    });

    it('selects minimal for small plans', () => {
      tmpDir = createTempProject();
      const { dirPath, phaseNum } = createPhaseDir(tmpDir, 1, 'Foundation');
      const planContent = `---
phase: "${phaseNum}"
---

# Small Plan

### Task 1
Do one thing.

Mentions \`src/index.ts\`.
`;
      const planFile = `${phaseNum}-01-PLAN.md`;
      fs.writeFileSync(path.join(dirPath, planFile), planContent, 'utf-8');

      const relPath = path.relative(tmpDir, path.join(dirPath, planFile));
      const result = tpl.cmdTemplateSelect(tmpDir, relPath);
      assert.strictEqual(result.type, 'minimal');
      assert.ok(result.template.includes('minimal'));
    });

    it('selects standard for medium plans', () => {
      tmpDir = createTempProject();
      const { dirPath, phaseNum } = createPhaseDir(tmpDir, 2, 'Core');
      const planContent = `---
phase: "${phaseNum}"
---

# Medium Plan

### Task 1
Implement \`src/lib/core.ts\`.

### Task 2
Implement \`src/lib/state.ts\`.

### Task 3
Update \`src/lib/config.ts\`.

Also touches \`src/lib/utils.ts\` and \`src/tests/core.test.ts\`.
`;
      const planFile = `${phaseNum}-01-PLAN.md`;
      fs.writeFileSync(path.join(dirPath, planFile), planContent, 'utf-8');

      const relPath = path.relative(tmpDir, path.join(dirPath, planFile));
      const result = tpl.cmdTemplateSelect(tmpDir, relPath);
      assert.strictEqual(result.type, 'standard');
    });

    it('selects complex for plans with decisions', () => {
      tmpDir = createTempProject();
      const { dirPath, phaseNum } = createPhaseDir(tmpDir, 3, 'Polish');
      const planContent = `---
phase: "${phaseNum}"
---

# Complex Plan

### Task 1
A decision about architecture.

### Task 2
Another decision about API design.

Files: \`src/a.ts\`, \`src/b.ts\`, \`src/c.ts\`, \`src/d.ts\`, \`src/e.ts\`, \`src/f.ts\`, \`src/g.ts\`
`;
      const planFile = `${phaseNum}-01-PLAN.md`;
      fs.writeFileSync(path.join(dirPath, planFile), planContent, 'utf-8');

      const relPath = path.relative(tmpDir, path.join(dirPath, planFile));
      const result = tpl.cmdTemplateSelect(tmpDir, relPath);
      assert.strictEqual(result.type, 'complex');
    });

    it('returns standard with error for missing file', () => {
      tmpDir = createTempProject();
      const result = tpl.cmdTemplateSelect(tmpDir, '.planning/phases/99-missing/99-01-PLAN.md');
      assert.strictEqual(result.type, 'standard');
      assert.ok(result.error);
    });
  });

  // ─── cmdTemplateFill ────────────────────────────────────────────────

  describe('cmdTemplateFill()', () => {
    let tmpDir;

    after(() => { if (tmpDir) cleanup(tmpDir); });

    it('throws when templateType is missing', () => {
      assert.throws(() => tpl.cmdTemplateFill('/tmp', '', {}), /template type required/);
    });

    it('throws when phase is missing', () => {
      assert.throws(() => tpl.cmdTemplateFill('/tmp', 'summary', {}), /phase required/);
    });

    it('throws on unknown template type', () => {
      tmpDir = createTempProject({ roadmap: true });
      createPhaseDir(tmpDir, 1, 'Foundation');
      assert.throws(
        () => tpl.cmdTemplateFill(tmpDir, 'unknown', { phase: '1' }),
        /Unknown template type/
      );
    });

    it('creates a summary template', () => {
      tmpDir = createTempProject({ roadmap: true });
      const { dirPath } = createPhaseDir(tmpDir, 1, 'Foundation');

      const result = tpl.cmdTemplateFill(tmpDir, 'summary', {
        phase: '1',
        name: 'Foundation',
      });

      assert.strictEqual(result.created, true);
      assert.ok(result.path.includes('SUMMARY.md'));
      const content = fs.readFileSync(path.join(tmpDir, result.path), 'utf-8');
      assert.ok(content.includes('---'));
      assert.ok(content.includes('Foundation Summary'));
    });

    it('creates a plan template', () => {
      tmpDir = createTempProject({ roadmap: true });
      createPhaseDir(tmpDir, 2, 'Core');

      const result = tpl.cmdTemplateFill(tmpDir, 'plan', {
        phase: '2',
        name: 'Core',
        plan: '01',
      });

      assert.strictEqual(result.created, true);
      assert.ok(result.path.includes('PLAN.md'));
      const content = fs.readFileSync(path.join(tmpDir, result.path), 'utf-8');
      assert.ok(content.includes('Objective'));
      assert.ok(content.includes('<task'));
    });

    it('creates a verification template', () => {
      tmpDir = createTempProject({ roadmap: true });
      createPhaseDir(tmpDir, 3, 'Polish');

      const result = tpl.cmdTemplateFill(tmpDir, 'verification', {
        phase: '3',
        name: 'Polish',
      });

      assert.strictEqual(result.created, true);
      assert.ok(result.path.includes('VERIFICATION.md'));
      const content = fs.readFileSync(path.join(tmpDir, result.path), 'utf-8');
      assert.ok(content.includes('Observable Truths'));
    });

    it('refuses to overwrite existing file', () => {
      tmpDir = createTempProject({ roadmap: true });
      createPhaseDir(tmpDir, 4, 'Final');

      // Create first
      tpl.cmdTemplateFill(tmpDir, 'summary', { phase: '4', name: 'Final' });
      // Try duplicate
      const result = tpl.cmdTemplateFill(tmpDir, 'summary', { phase: '4', name: 'Final' });
      assert.ok(result.error);
      assert.ok(result.error.includes('already exists'));
    });

    it('returns error for non-existent phase', () => {
      tmpDir = createTempProject({ roadmap: true });
      const result = tpl.cmdTemplateFill(tmpDir, 'summary', { phase: '99' });
      assert.ok(result.error);
    });

    it('summary includes frontmatter fields', () => {
      tmpDir = createTempProject({ roadmap: true });
      createPhaseDir(tmpDir, 5, 'Testing');

      const result = tpl.cmdTemplateFill(tmpDir, 'summary', {
        phase: '5',
        name: 'Testing',
        fields: { subsystem: 'tests', tags: ['test', 'coverage'] },
      });

      assert.strictEqual(result.created, true);
      const content = fs.readFileSync(path.join(tmpDir, result.path), 'utf-8');
      assert.ok(content.includes('subsystem: tests'));
      assert.ok(content.includes('test'));
    });

    it('plan template uses custom wave and type', () => {
      tmpDir = createTempProject({ roadmap: true });
      createPhaseDir(tmpDir, 6, 'Deploy');

      const result = tpl.cmdTemplateFill(tmpDir, 'plan', {
        phase: '6',
        name: 'Deploy',
        plan: '02',
        type: 'research',
        wave: 2,
      });

      assert.strictEqual(result.created, true);
      const content = fs.readFileSync(path.join(tmpDir, result.path), 'utf-8');
      assert.ok(content.includes('type: research'));
      assert.ok(content.includes('wave: 2'));
    });
  });
});
