/**
 * GSD Copilot Port Validation — Templates
 * Validates all expected templates exist in both runtime (.gsd/templates/)
 * and skill bundles (.github/skills/&lt;skill&gt;/templates/).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

describe('Runtime Templates (.gsd/templates/)', () => {
  const TEMPLATES_DIR = path.join(ROOT, '.gsd', 'templates');

  it('templates directory exists', () => {
    assert.ok(fs.existsSync(TEMPLATES_DIR), '.gsd/templates/ not found');
  });

  const EXPECTED_TOP_LEVEL = [
    'config.json',
    'state.md',
    'summary.md',
    'summary-minimal.md',
    'summary-standard.md',
    'summary-complex.md',
    'planner-subagent-prompt.md',
    'debug-subagent-prompt.md',
    'continue-here.md',
  ];

  for (const file of EXPECTED_TOP_LEVEL) {
    it(`has ${file}`, () => {
      assert.ok(fs.existsSync(path.join(TEMPLATES_DIR, file)), `Missing: ${file}`);
    });
  }

  describe('codebase/ templates', () => {
    const CODEBASE_DIR = path.join(TEMPLATES_DIR, 'codebase');
    const EXPECTED = [
      'architecture.md', 'concerns.md', 'conventions.md',
      'integrations.md', 'stack.md', 'structure.md', 'testing.md',
    ];

    it('codebase/ directory exists', () => {
      assert.ok(fs.existsSync(CODEBASE_DIR));
    });

    for (const file of EXPECTED) {
      it(`has ${file}`, () => {
        assert.ok(fs.existsSync(path.join(CODEBASE_DIR, file)), `Missing: codebase/${file}`);
      });
    }
  });

  describe('research-project/ templates', () => {
    const RESEARCH_DIR = path.join(TEMPLATES_DIR, 'research-project');
    const EXPECTED = [
      'ARCHITECTURE.md', 'COMPARISON.md', 'FEASIBILITY.md',
      'FEATURES.md', 'PITFALLS.md', 'STACK.md', 'SUMMARY.md',
    ];

    it('research-project/ directory exists', () => {
      assert.ok(fs.existsSync(RESEARCH_DIR));
    });

    for (const file of EXPECTED) {
      it(`has ${file}`, () => {
        assert.ok(fs.existsSync(path.join(RESEARCH_DIR, file)), `Missing: research-project/${file}`);
      });
    }
  });
});

describe('Skill Templates (.github/skills/)', () => {

  describe('gsd-map-codebase templates', () => {
    const CODEBASE_TEMPLATES = path.join(ROOT, '.github', 'skills', 'gsd-map-codebase', 'templates', 'codebase');
    const EXPECTED = [
      'ARCHITECTURE.md', 'CONCERNS.md', 'CONVENTIONS.md',
      'INTEGRATIONS.md', 'STACK.md', 'STRUCTURE.md', 'TESTING.md',
    ];

    it('templates/codebase/ directory exists', () => {
      assert.ok(fs.existsSync(CODEBASE_TEMPLATES));
    });

    it('has all 7 codebase templates', () => {
      for (const file of EXPECTED) {
        assert.ok(
          fs.existsSync(path.join(CODEBASE_TEMPLATES, file)),
          `Missing skill template: ${file}`
        );
      }
    });

    it('each template has meaningful content (>10 lines)', () => {
      for (const file of EXPECTED) {
        const content = fs.readFileSync(path.join(CODEBASE_TEMPLATES, file), 'utf-8');
        const lines = content.split('\n').length;
        assert.ok(lines >= 10, `${file} only has ${lines} lines`);
      }
    });
  });

  describe('gsd-milestone templates', () => {
    const dir = path.join(ROOT, '.github', 'skills', 'gsd-milestone', 'templates');

    it('templates directory exists', () => {
      assert.ok(fs.existsSync(dir));
    });

    it('has milestone-archive.md', () => {
      assert.ok(fs.existsSync(path.join(dir, 'milestone-archive.md')));
    });

    it('has retrospective.md', () => {
      assert.ok(fs.existsSync(path.join(dir, 'retrospective.md')));
    });
  });

  describe('gsd-new-project templates', () => {
    const dir = path.join(ROOT, '.github', 'skills', 'gsd-new-project', 'templates');

    it('templates directory exists', () => {
      assert.ok(fs.existsSync(dir));
    });

    it('has at least 4 templates', () => {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      assert.ok(files.length >= 4, `Only ${files.length} templates found`);
    });
  });
});
