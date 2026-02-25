/**
 * GSD Copilot Port Validation — Instructions, Extension, Docs, Windows
 * Validates instruction files, extension scaffold, documentation, and Windows compatibility.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

describe('Instructions', () => {
  const INSTRUCTIONS_DIR = path.join(ROOT, '.github', 'instructions');
  const EXPECTED = [
    'gsd-plans.instructions.md',
    'gsd-quick.instructions.md',
    'gsd-research.instructions.md',
    'gsd-state.instructions.md',
    'gsd-summaries.instructions.md',
    'planning-docs.instructions.md',
  ];

  it('all 6 instruction files exist', () => {
    for (const file of EXPECTED) {
      assert.ok(fs.existsSync(path.join(INSTRUCTIONS_DIR, file)), `Missing: ${file}`);
    }
  });

  it('all have applyTo in frontmatter', () => {
    for (const file of EXPECTED) {
      const content = fs.readFileSync(path.join(INSTRUCTIONS_DIR, file), 'utf-8');
      assert.ok(content.includes('applyTo'), `${file} missing applyTo`);
    }
  });

  it('copilot-instructions.md exists', () => {
    const p = path.join(ROOT, '.github', 'copilot-instructions.md');
    assert.ok(fs.existsSync(p), 'Missing .github/copilot-instructions.md');
    const content = fs.readFileSync(p, 'utf-8');
    assert.ok(content.length > 100, 'copilot-instructions.md too short');
  });
});

describe('VS Code Extension', () => {
  const EXT_DIR = path.join(ROOT, 'extension');
  const SRC_DIR = path.join(EXT_DIR, 'src');

  const EXPECTED_SRC = [
    'extension.ts', 'commands.ts', 'statusBar.ts', 'treeView.ts', 'stateParser.ts',
  ];

  it('extension/package.json exists', () => {
    assert.ok(fs.existsSync(path.join(EXT_DIR, 'package.json')));
  });

  it('package.json has required fields', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(EXT_DIR, 'package.json'), 'utf-8'));
    assert.ok(pkg.publisher, 'Missing publisher');
    assert.ok(pkg.engines, 'Missing engines');
    assert.ok(pkg.activationEvents, 'Missing activationEvents');
    assert.ok(pkg.contributes, 'Missing contributes');
  });

  for (const file of EXPECTED_SRC) {
    it(`src/${file} exists`, () => {
      assert.ok(fs.existsSync(path.join(SRC_DIR, file)), `Missing: src/${file}`);
    });
  }

  it('extension.ts has activation function', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'extension.ts'), 'utf-8');
    assert.ok(content.includes('activate'), 'Missing activate function');
  });
});

describe('Documentation', () => {
  const DOCS_DIR = path.join(ROOT, 'docs');
  const EXPECTED = [
    'CONFIGURATION.md', 'MIGRATION.md', 'QUICK-START.md',
    'TROUBLESHOOTING.md', 'USER-GUIDE.md',
  ];

  for (const file of EXPECTED) {
    it(`docs/${file} exists`, () => {
      assert.ok(fs.existsSync(path.join(DOCS_DIR, file)), `Missing: docs/${file}`);
    });
  }

  it('README.md exists at root', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'README.md')));
  });

  it('TROUBLESHOOTING.md has MCP Server Won\'t Start section', () => {
    const content = fs.readFileSync(path.join(DOCS_DIR, 'TROUBLESHOOTING.md'), 'utf-8');
    assert.ok(content.includes("MCP Server Won't Start"), 'Missing MCP startup section');
  });

  it('TROUBLESHOOTING.md has MCP Server Not Connecting section', () => {
    const content = fs.readFileSync(path.join(DOCS_DIR, 'TROUBLESHOOTING.md'), 'utf-8');
    assert.ok(content.includes('MCP Server Not Connecting'), 'Missing MCP connection section');
  });
});

describe('Windows Compatibility', () => {
  const CORE = path.join(ROOT, '.gsd', 'tools', 'lib', 'core.js');

  it('core.js has normalizePath function', () => {
    const content = fs.readFileSync(CORE, 'utf-8');
    assert.ok(content.includes('normalizePath'), 'Missing normalizePath');
  });

  it('core.js uses windowsHide for child processes', () => {
    const content = fs.readFileSync(CORE, 'utf-8');
    const matches = content.match(/windowsHide/g) || [];
    assert.ok(matches.length >= 2, `Expected ≥2 windowsHide uses, found ${matches.length}`);
  });

  it('normalizePath converts backslashes to forward slashes', () => {
    const content = fs.readFileSync(CORE, 'utf-8');
    // Verify the function replaces \\ with /
    assert.ok(
      content.includes("replace(/\\\\\\\\/g, '/')") || content.includes('replace(/\\\\/g'),
      'normalizePath should replace backslashes'
    );
  });
});

describe('Stale References — Zero in Copilot Files', () => {
  const COPILOT_DIRS = [
    path.join(ROOT, '.github', 'agents'),
    path.join(ROOT, '.github', 'prompts'),
    path.join(ROOT, '.github', 'instructions'),
  ];

  const STALE_PATTERNS = [
    { pattern: /gsd-tools\.cjs/, name: 'gsd-tools.cjs' },
    { pattern: /~\/\.claude/, name: '~/.claude' },
    { pattern: /~\/\.gsd\/get-shit-done/, name: '~/.gsd/get-shit-done' },
  ];

  it('zero stale references in all .github/ markdown files', () => {
    const violations = [];

    for (const dir of COPILOT_DIRS) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
        for (const { pattern, name } of STALE_PATTERNS) {
          if (pattern.test(content)) {
            violations.push(`${file}: ${name}`);
          }
        }
      }
    }

    assert.deepStrictEqual(violations, [], `Stale refs found:\n${violations.join('\n')}`);
  });

  it('zero stale references in skill SKILL.md files', () => {
    const skillsDir = path.join(ROOT, '.github', 'skills');
    const violations = [];

    if (fs.existsSync(skillsDir)) {
      const skills = fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter(d => d.isDirectory());
      for (const skill of skills) {
        const skillMd = path.join(skillsDir, skill.name, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          const content = fs.readFileSync(skillMd, 'utf-8');
          for (const { pattern, name } of STALE_PATTERNS) {
            if (pattern.test(content)) {
              violations.push(`${skill.name}/SKILL.md: ${name}`);
            }
          }
        }
      }
    }

    assert.deepStrictEqual(violations, [], `Stale refs in skills:\n${violations.join('\n')}`);
  });
});
