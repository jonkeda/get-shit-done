/**
 * GSD Copilot MCP Server Tests — frontmatter.js
 */

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  loadFrontmatter,
  createTempProject,
  cleanup,
} = require('./copilot-helpers.cjs');

let fm;

describe('frontmatter.js', () => {
  before(async () => {
    fm = await loadFrontmatter();
  });

  // ─── extractFrontmatter ───────────────────────────────────────────────

  describe('extractFrontmatter()', () => {
    it('extracts simple key-value pairs', () => {
      const content = `---
phase: "01"
plan: "01-01"
type: implementation
---

# Body`;
      const result = fm.extractFrontmatter(content);
      assert.strictEqual(result.phase, '01');
      assert.strictEqual(result.plan, '01-01');
      assert.strictEqual(result.type, 'implementation');
    });

    it('extracts inline arrays', () => {
      const content = `---
tags: [api, core, auth]
---

# Body`;
      const result = fm.extractFrontmatter(content);
      assert.deepStrictEqual(result.tags, ['api', 'core', 'auth']);
    });

    it('extracts block arrays', () => {
      const content = `---
files_modified:
  - src/index.ts
  - src/utils.ts
---

# Body`;
      const result = fm.extractFrontmatter(content);
      assert.deepStrictEqual(result.files_modified, ['src/index.ts', 'src/utils.ts']);
    });

    it('extracts nested objects', () => {
      const content = `---
dependency-graph:
  provides:
    - "Database schema"
  affects:
    - "API layer"
---

# Body`;
      const result = fm.extractFrontmatter(content);
      assert.ok(result['dependency-graph']);
      assert.deepStrictEqual(result['dependency-graph'].provides, ['Database schema']);
      assert.deepStrictEqual(result['dependency-graph'].affects, ['API layer']);
    });

    it('returns empty object for content without frontmatter', () => {
      const result = fm.extractFrontmatter('# Just a heading\n\nSome text.');
      assert.deepStrictEqual(result, {});
    });

    it('returns empty object for empty frontmatter', () => {
      const content = `---
---

# Body`;
      const result = fm.extractFrontmatter(content);
      assert.deepStrictEqual(result, {});
    });

    it('strips quotes from values', () => {
      const content = `---
name: "My Project"
version: '1.0'
---`;
      const result = fm.extractFrontmatter(content);
      assert.strictEqual(result.name, 'My Project');
      assert.strictEqual(result.version, '1.0');
    });
  });

  // ─── reconstructFrontmatter ───────────────────────────────────────────

  describe('reconstructFrontmatter()', () => {
    it('serializes simple key-value pairs', () => {
      const yaml = fm.reconstructFrontmatter({ phase: '01', type: 'implementation' });
      assert.ok(yaml.includes('phase: 01'));
      assert.ok(yaml.includes('type: implementation'));
    });

    it('serializes arrays inline when short', () => {
      const yaml = fm.reconstructFrontmatter({ tags: ['a', 'b'] });
      assert.ok(yaml.includes('tags: [a, b]'));
    });

    it('serializes empty arrays', () => {
      const yaml = fm.reconstructFrontmatter({ items: [] });
      assert.ok(yaml.includes('items: []'));
    });

    it('serializes nested objects', () => {
      const yaml = fm.reconstructFrontmatter({
        workflow: { research: true, verifier: false },
      });
      assert.ok(yaml.includes('workflow:'));
      assert.ok(yaml.includes('  research: true'));
      assert.ok(yaml.includes('  verifier: false'));
    });

    it('skips null/undefined values', () => {
      const yaml = fm.reconstructFrontmatter({ a: 'yes', b: null, c: undefined });
      assert.ok(yaml.includes('a: yes'));
      assert.ok(!yaml.includes('b:'));
      assert.ok(!yaml.includes('c:'));
    });
  });

  // ─── spliceFrontmatter ────────────────────────────────────────────────

  describe('spliceFrontmatter()', () => {
    it('replaces existing frontmatter, preserves body', () => {
      const content = `---
old: value
---

# My Document

Body text here.`;
      const result = fm.spliceFrontmatter(content, { new_field: 'new_value' });
      assert.ok(result.includes('new_field: new_value'));
      assert.ok(!result.includes('old: value'));
      assert.ok(result.includes('# My Document'));
      assert.ok(result.includes('Body text here.'));
    });

    it('adds frontmatter when none exists', () => {
      const content = '# No Frontmatter\n\nJust body.';
      const result = fm.spliceFrontmatter(content, { phase: '01' });
      assert.ok(result.startsWith('---\n'));
      assert.ok(result.includes('phase: 01'));
      assert.ok(result.includes('# No Frontmatter'));
    });
  });

  // ─── frontmatterGet ───────────────────────────────────────────────────

  describe('frontmatterGet()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('gets all frontmatter from a file', () => {
      tmpDir = createTempProject();
      const filePath = path.join(tmpDir, 'test.md');
      fs.writeFileSync(filePath, `---\nphase: "02"\ntype: refactor\n---\n\n# Content`, 'utf-8');

      const result = fm.frontmatterGet(tmpDir, filePath);
      assert.strictEqual(result.phase, '02');
      assert.strictEqual(result.type, 'refactor');
    });

    it('gets a specific field', () => {
      tmpDir = createTempProject();
      const filePath = path.join(tmpDir, 'test.md');
      fs.writeFileSync(filePath, `---\nphase: "03"\nwave: 2\n---\n\n# X`, 'utf-8');

      const result = fm.frontmatterGet(tmpDir, filePath, 'wave');
      assert.strictEqual(result.wave, '2');
    });

    it('returns error for missing file', () => {
      tmpDir = createTempProject();
      const result = fm.frontmatterGet(tmpDir, '/nonexistent/file.md');
      assert.ok(result.error);
    });

    it('returns error for missing field', () => {
      tmpDir = createTempProject();
      const filePath = path.join(tmpDir, 'test.md');
      fs.writeFileSync(filePath, `---\nphase: "01"\n---\n\n# X`, 'utf-8');

      const result = fm.frontmatterGet(tmpDir, filePath, 'nonexistent');
      assert.ok(result.error);
    });
  });

  // ─── frontmatterSet ───────────────────────────────────────────────────

  describe('frontmatterSet()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('sets a field and preserves body', () => {
      tmpDir = createTempProject();
      const filePath = path.join(tmpDir, 'test.md');
      fs.writeFileSync(filePath, `---\nphase: "01"\n---\n\n# Keep This Body`, 'utf-8');

      const result = fm.frontmatterSet(tmpDir, filePath, 'status', 'complete');
      assert.strictEqual(result.updated, true);

      const content = fs.readFileSync(filePath, 'utf-8');
      assert.ok(content.includes('status: complete'));
      assert.ok(content.includes('# Keep This Body'));
    });

    it('overwrites an existing field', () => {
      tmpDir = createTempProject();
      const filePath = path.join(tmpDir, 'test.md');
      fs.writeFileSync(filePath, `---\nwave: 1\n---\n\n# X`, 'utf-8');

      fm.frontmatterSet(tmpDir, filePath, 'wave', '3');
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.ok(content.includes('wave: 3'));
      assert.ok(!content.match(/wave: 1/));
    });

    it('parses JSON values', () => {
      tmpDir = createTempProject();
      const filePath = path.join(tmpDir, 'test.md');
      fs.writeFileSync(filePath, `---\ntags: []\n---\n\n# X`, 'utf-8');

      fm.frontmatterSet(tmpDir, filePath, 'tags', '["api", "core"]');
      const afterContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = fm.extractFrontmatter(afterContent);
      assert.deepStrictEqual(parsed.tags, ['api', 'core']);
    });

    it('returns error for missing file', () => {
      tmpDir = createTempProject();
      const result = fm.frontmatterSet(tmpDir, '/nonexistent.md', 'k', 'v');
      assert.ok(result.error);
    });
  });

  // ─── frontmatterValidate ──────────────────────────────────────────────

  describe('frontmatterValidate()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('validates a complete plan frontmatter as valid', () => {
      tmpDir = createTempProject();
      const filePath = path.join(tmpDir, 'plan.md');
      fs.writeFileSync(filePath, `---
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

# Plan`, 'utf-8');

      const result = fm.frontmatterValidate(tmpDir, filePath, 'plan');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.missing.length, 0);
    });

    it('detects missing required fields', () => {
      tmpDir = createTempProject();
      const filePath = path.join(tmpDir, 'plan.md');
      fs.writeFileSync(filePath, `---
phase: "01"
plan: "01-01"
---

# Incomplete Plan`, 'utf-8');

      const result = fm.frontmatterValidate(tmpDir, filePath, 'plan');
      assert.strictEqual(result.valid, false);
      assert.ok(result.missing.includes('wave'));
      assert.ok(result.missing.includes('type'));
      assert.ok(result.present.includes('phase'));
      assert.ok(result.present.includes('plan'));
    });

    it('validates summary schema', () => {
      tmpDir = createTempProject();
      const filePath = path.join(tmpDir, 'summary.md');
      fs.writeFileSync(filePath, `---
phase: "01"
plan: "01-01"
subsystem: core
tags: [test]
duration: 30m
completed: true
---

# Summary`, 'utf-8');

      const result = fm.frontmatterValidate(tmpDir, filePath, 'summary');
      assert.strictEqual(result.valid, true);
    });

    it('throws for unknown schema', () => {
      tmpDir = createTempProject();
      const filePath = path.join(tmpDir, 'test.md');
      fs.writeFileSync(filePath, `---\nk: v\n---\n`, 'utf-8');
      assert.throws(() => fm.frontmatterValidate(tmpDir, filePath, 'nonexistent'), /Unknown schema/);
    });

    it('returns error for missing file', () => {
      tmpDir = createTempProject();
      const result = fm.frontmatterValidate(tmpDir, '/nonexistent.md', 'plan');
      assert.ok(result.error);
    });
  });

  // ─── frontmatterMerge ─────────────────────────────────────────────────

  describe('frontmatterMerge()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('merges new fields into existing frontmatter', () => {
      tmpDir = createTempProject();
      const filePath = path.join(tmpDir, 'test.md');
      fs.writeFileSync(filePath, `---\nphase: "01"\n---\n\n# Body`, 'utf-8');

      const result = fm.frontmatterMerge(tmpDir, filePath, { wave: 2, type: 'refactor' });
      assert.strictEqual(result.merged, true);
      assert.deepStrictEqual(result.fields.sort(), ['type', 'wave']);

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = fm.extractFrontmatter(content);
      assert.strictEqual(parsed.phase, '01');
      assert.strictEqual(parsed.wave, '2');
      assert.strictEqual(parsed.type, 'refactor');
    });
  });
});
