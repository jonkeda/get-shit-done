/**
 * GSD Copilot — Structural Validation Tests
 *
 * These tests validate the completeness and consistency of the Copilot
 * installation: prompt files, skills, agents, instructions, and their
 * cross-references. Prevents gaps like missing prompt files for skills
 * from going undetected.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROMPTS_DIR = path.join(ROOT, '.github', 'prompts');
const SKILLS_DIR = path.join(ROOT, '.github', 'skills');
const AGENTS_DIR = path.join(ROOT, '.github', 'agents');
const INSTRUCTIONS_DIR = path.join(ROOT, '.github', 'instructions');
const COPILOT_INSTRUCTIONS = path.join(ROOT, '.github', 'copilot-instructions.md');
const COMMANDS_DIR = path.join(ROOT, 'commands', 'gsd');

// Commands intentionally not ported to Copilot
const EXCLUDED_COMMANDS = ['add-tests', 'join-discord', 'reapply-patches'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listFiles(dir, prefix, suffix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => {
    if (prefix && !f.startsWith(prefix)) return false;
    if (suffix && !f.endsWith(suffix)) return false;
    return true;
  });
}

function listDirs(dir, prefix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && (!prefix || d.name.startsWith(prefix)))
    .map(d => d.name);
}

function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([\w][\w-]*):\s*(.+)/);
    if (m) fm[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return fm;
}

// ─── Prompt File Inventory ────────────────────────────────────────────────────

describe('Prompt file inventory', () => {
  const promptFiles = listFiles(PROMPTS_DIR, 'gsd-', '.prompt.md');

  it('has at least 20 prompt files', () => {
    assert.ok(promptFiles.length >= 20,
      `Expected ≥20 prompt files, found ${promptFiles.length}: ${promptFiles.join(', ')}`);
  });

  it('prompt files follow gsd-*.prompt.md naming convention', () => {
    for (const f of promptFiles) {
      assert.match(f, /^gsd-.+\.prompt\.md$/,
        `File ${f} doesn't match gsd-*.prompt.md pattern`);
    }
  });

  it('every prompt file has valid YAML frontmatter with description', () => {
    for (const f of promptFiles) {
      const fm = parseFrontmatter(path.join(PROMPTS_DIR, f));
      assert.ok(fm, `${f}: missing or invalid YAML frontmatter`);
      assert.ok(fm.description, `${f}: frontmatter missing 'description' field`);
    }
  });

  it('every prompt file has non-trivial body content', () => {
    for (const f of promptFiles) {
      const content = fs.readFileSync(path.join(PROMPTS_DIR, f), 'utf8');
      // Strip frontmatter
      const body = content.replace(/^---\n[\s\S]*?\n---\n*/, '');
      assert.ok(body.trim().length > 50,
        `${f}: body content too short (${body.trim().length} chars)`);
    }
  });
});

// ─── Skill ↔ Prompt Coverage ──────────────────────────────────────────────────

describe('Skill ↔ Prompt coverage', () => {
  const skillDirs = listDirs(SKILLS_DIR, 'gsd-');
  const promptFiles = listFiles(PROMPTS_DIR, 'gsd-', '.prompt.md');
  const promptNames = new Set(promptFiles.map(f => f.replace('.prompt.md', '')));

  it('every skill directory has SKILL.md', () => {
    for (const d of skillDirs) {
      const skillMd = path.join(SKILLS_DIR, d, 'SKILL.md');
      assert.ok(fs.existsSync(skillMd), `Missing SKILL.md in ${d}`);
    }
  });

  it('every skill has at least one matching prompt file', () => {
    // Skills may map to multiple prompts (e.g., gsd-milestone → audit/complete/new)
    const milestonePrompts = ['gsd-audit-milestone', 'gsd-complete-milestone', 'gsd-new-milestone'];

    for (const d of skillDirs) {
      const skillName = d; // e.g., gsd-map-codebase
      if (skillName === 'gsd-milestone') {
        // Milestone is a combined skill with 3 prompt entry points
        for (const mp of milestonePrompts) {
          assert.ok(promptNames.has(mp),
            `Missing prompt for milestone sub-command: ${mp}.prompt.md`);
        }
      } else {
        assert.ok(promptNames.has(skillName),
          `Skill ${skillName} has no matching prompt: ${skillName}.prompt.md`);
      }
    }
  });

  it('SKILL.md files have valid frontmatter with name and description', () => {
    for (const d of skillDirs) {
      const fm = parseFrontmatter(path.join(SKILLS_DIR, d, 'SKILL.md'));
      assert.ok(fm, `${d}/SKILL.md: missing or invalid YAML frontmatter`);
      assert.ok(fm.name, `${d}/SKILL.md: frontmatter missing 'name' field`);
      assert.ok(fm.description, `${d}/SKILL.md: frontmatter missing 'description' field`);
    }
  });
});

// ─── Agent File Validation ────────────────────────────────────────────────────

describe('Agent file validation', () => {
  const agentFiles = listFiles(AGENTS_DIR, 'gsd-', '.agent.md');

  it('has agent files', () => {
    assert.ok(agentFiles.length > 0, 'No agent files found');
  });

  it('agent files follow gsd-*.agent.md naming convention', () => {
    for (const f of agentFiles) {
      assert.match(f, /^gsd-.+\.agent\.md$/,
        `File ${f} doesn't match gsd-*.agent.md pattern`);
    }
  });

  it('every agent file has valid YAML frontmatter with description', () => {
    for (const f of agentFiles) {
      const fm = parseFrontmatter(path.join(AGENTS_DIR, f));
      assert.ok(fm, `${f}: missing or invalid YAML frontmatter`);
      assert.ok(fm.description, `${f}: frontmatter missing 'description' field`);
    }
  });
});

// ─── Command ↔ Prompt Coverage ────────────────────────────────────────────────

describe('Command ↔ Prompt coverage', () => {
  const sourceCommands = listFiles(COMMANDS_DIR, '', '.md')
    .filter(f => !f.endsWith('.bak'))
    .map(f => f.replace('.md', ''));

  const promptFiles = listFiles(PROMPTS_DIR, 'gsd-', '.prompt.md');
  const promptNames = new Set(promptFiles.map(f => f.replace('.prompt.md', '').replace('gsd-', '')));

  it('every non-excluded source command has a Copilot equivalent', () => {
    for (const cmd of sourceCommands) {
      if (EXCLUDED_COMMANDS.includes(cmd)) continue;
      assert.ok(promptNames.has(cmd),
        `Source command '${cmd}' has no Copilot prompt: gsd-${cmd}.prompt.md`);
    }
  });

  it('excluded commands are documented', () => {
    assert.ok(EXCLUDED_COMMANDS.length > 0, 'EXCLUDED_COMMANDS should not be empty');
    for (const cmd of EXCLUDED_COMMANDS) {
      // Verify these source commands actually exist
      assert.ok(sourceCommands.includes(cmd),
        `Excluded command '${cmd}' not found in source commands`);
    }
  });
});

// ─── copilot-instructions.md Completeness ─────────────────────────────────────

describe('copilot-instructions.md completeness', () => {
  const content = fs.readFileSync(COPILOT_INSTRUCTIONS, 'utf8');
  const promptFiles = listFiles(PROMPTS_DIR, 'gsd-', '.prompt.md');

  it('documents all prompt-based commands', () => {
    const missing = [];
    for (const f of promptFiles) {
      const cmdName = f.replace('.prompt.md', ''); // e.g., gsd-map-codebase
      const slashCmd = `/${cmdName}`;              // e.g., /gsd-map-codebase
      if (!content.includes(slashCmd)) {
        missing.push(slashCmd);
      }
    }
    assert.deepStrictEqual(missing, [],
      `copilot-instructions.md missing commands: ${missing.join(', ')}`);
  });

  it('does not reference non-existent commands', () => {
    const promptNames = new Set(promptFiles.map(f => '/' + f.replace('.prompt.md', '')));
    // Find all /gsd-* references in the file
    const refs = content.match(/\/gsd-[\w-]+/g) || [];
    const unique = [...new Set(refs)];
    const phantom = unique.filter(r => !promptNames.has(r));
    assert.deepStrictEqual(phantom, [],
      `copilot-instructions.md references non-existent commands: ${phantom.join(', ')}`);
  });
});

// ─── Instruction Files ────────────────────────────────────────────────────────

describe('Instruction files', () => {
  const instrFiles = listFiles(INSTRUCTIONS_DIR, '', '.instructions.md')
    .filter(f => f.startsWith('gsd-') || f === 'planning-docs.instructions.md');

  it('has instruction files', () => {
    assert.ok(instrFiles.length > 0, 'No instruction files found');
  });

  it('instruction files have valid YAML frontmatter', () => {
    for (const f of instrFiles) {
      const content = fs.readFileSync(path.join(INSTRUCTIONS_DIR, f), 'utf8').replace(/\r\n/g, '\n');
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      assert.ok(match, `${f}: missing or invalid YAML frontmatter`);
      // Instruction files use applyTo, not description
      assert.ok(match[1].includes('applyTo'),
        `${f}: frontmatter missing 'applyTo' field`);
    }
  });
});

// ─── Template Completeness ────────────────────────────────────────────────────

describe('Template completeness', () => {
  const SKILL_TEMPLATES = path.join(SKILLS_DIR, 'gsd-map-codebase', 'templates', 'codebase');
  const EXPECTED_CODEBASE_TEMPLATES = [
    'ARCHITECTURE.md', 'CONCERNS.md', 'CONVENTIONS.md',
    'INTEGRATIONS.md', 'STACK.md', 'STRUCTURE.md', 'TESTING.md'
  ];

  it('codebase mapping skill has all 7 templates', () => {
    for (const t of EXPECTED_CODEBASE_TEMPLATES) {
      const tPath = path.join(SKILL_TEMPLATES, t);
      assert.ok(fs.existsSync(tPath), `Missing codebase template: ${t}`);
    }
  });

  it('codebase templates are non-empty', () => {
    for (const t of EXPECTED_CODEBASE_TEMPLATES) {
      const tPath = path.join(SKILL_TEMPLATES, t);
      if (fs.existsSync(tPath)) {
        const stat = fs.statSync(tPath);
        assert.ok(stat.size > 100, `Template ${t} too small (${stat.size} bytes)`);
      }
    }
  });
});
