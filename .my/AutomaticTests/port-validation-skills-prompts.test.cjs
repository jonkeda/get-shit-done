/**
 * GSD Copilot Port Validation — Skills & Prompts
 * Validates all skills have SKILL.md, all prompts exist, and no stale refs.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SKILLS_DIR = path.join(ROOT, '.github', 'skills');
const PROMPTS_DIR = path.join(ROOT, '.github', 'prompts');

const EXPECTED_SKILLS = [
  'gsd-debug',
  'gsd-discuss-phase',
  'gsd-execute-phase',
  'gsd-map-codebase',
  'gsd-milestone',
  'gsd-new-project',
  'gsd-plan-phase',
  'gsd-quick',
  'gsd-verify-work',
];

// Inline prompts (standalone logic, no skill routing)
const INLINE_PROMPTS = [
  'gsd-add-phase',
  'gsd-add-todo',
  'gsd-check-todos',
  'gsd-cleanup',
  'gsd-health',
  'gsd-help',
  'gsd-insert-phase',
  'gsd-list-phase-assumptions',
  'gsd-pause-work',
  'gsd-plan-milestone-gaps',
  'gsd-progress',
  'gsd-remove-phase',
  'gsd-research-phase',
  'gsd-resume-work',
  'gsd-set-profile',
  'gsd-settings',
  'gsd-update',
];

// Skill-routing prompts (thin wrappers that invoke a skill)
const SKILL_ROUTING_PROMPTS = [
  'gsd-audit-milestone',
  'gsd-complete-milestone',
  'gsd-debug',
  'gsd-discuss-phase',
  'gsd-execute-phase',
  'gsd-map-codebase',
  'gsd-new-milestone',
  'gsd-new-project',
  'gsd-plan-phase',
  'gsd-quick',
  'gsd-verify-work',
];

const EXPECTED_PROMPTS = [...INLINE_PROMPTS, ...SKILL_ROUTING_PROMPTS];

const STALE_PATTERNS = [
  /gsd-tools\.cjs/,
  /~\/\.claude/,
  /~\/\.gsd\/get-shit-done/,
  /Bash\(\s*["'`]/,
  /Task\(\s*["'`]/,
  /Read\(\s*["'`]/,
  /Edit\(\s*["'`]/,
];

describe('Skill Integrity', () => {

  it('all 9 skill directories exist', () => {
    for (const name of EXPECTED_SKILLS) {
      const skillDir = path.join(SKILLS_DIR, name);
      assert.ok(fs.existsSync(skillDir), `Missing skill dir: ${name}`);
    }
  });

  for (const name of EXPECTED_SKILLS) {
    describe(name, () => {
      const skillPath = path.join(SKILLS_DIR, name, 'SKILL.md');

      it('has SKILL.md', () => {
        assert.ok(fs.existsSync(skillPath), `Missing SKILL.md for ${name}`);
      });

      it('SKILL.md has YAML frontmatter with description', () => {
        const content = fs.readFileSync(skillPath, 'utf-8');
        assert.ok(content.startsWith('---'), 'Missing frontmatter opening');
        assert.ok(/^description:/m.test(content), 'Missing description: field');
      });

      it('SKILL.md has no stale Claude Code references', () => {
        const content = fs.readFileSync(skillPath, 'utf-8');
        for (const pattern of STALE_PATTERNS) {
          const match = content.match(pattern);
          assert.ok(!match, `Stale ref in ${name}: ${match ? match[0] : ''}`);
        }
      });

      it('SKILL.md has at least 50 lines', () => {
        const content = fs.readFileSync(skillPath, 'utf-8');
        const lines = content.split('\n').length;
        assert.ok(lines >= 50, `${name} SKILL.md only has ${lines} lines`);
      });
    });
  }
});

describe('Prompt Integrity', () => {

  it('all 28 GSD prompt files exist', () => {
    for (const name of EXPECTED_PROMPTS) {
      const promptPath = path.join(PROMPTS_DIR, `${name}.prompt.md`);
      assert.ok(fs.existsSync(promptPath), `Missing prompt: ${name}.prompt.md`);
    }
  });

  it('all prompts have YAML frontmatter', () => {
    for (const name of EXPECTED_PROMPTS) {
      const content = fs.readFileSync(path.join(PROMPTS_DIR, `${name}.prompt.md`), 'utf-8');
      assert.ok(content.startsWith('---'), `${name} missing frontmatter`);
    }
  });

  it('no stale Claude Code references across all prompts', () => {
    for (const name of EXPECTED_PROMPTS) {
      const content = fs.readFileSync(path.join(PROMPTS_DIR, `${name}.prompt.md`), 'utf-8');
      for (const pattern of STALE_PATTERNS) {
        const match = content.match(pattern);
        assert.ok(!match, `Stale ref in ${name}: ${match ? match[0] : ''}`);
      }
    }
  });
});

describe('Command Coverage', () => {
  // Every source command should have either a prompt or a skill
  const PROMPT_COMMANDS = EXPECTED_PROMPTS.map(p => p.replace('gsd-', ''));

  const EXCLUDED_COMMANDS = ['add-tests', 'join-discord', 'reapply-patches'];

  it('all meaningful source commands are covered by a prompt or skill', () => {
    const sourceDir = path.join(ROOT, 'commands', 'gsd');
    const sourceCommands = fs.readdirSync(sourceDir)
      .filter(f => f.endsWith('.md') && !f.endsWith('.bak'))
      .map(f => f.replace('.md', ''));

    const covered = new Set([...PROMPT_COMMANDS, ...EXCLUDED_COMMANDS]);

    const uncovered = sourceCommands.filter(cmd => !covered.has(cmd));
    assert.deepStrictEqual(uncovered, [], `Uncovered commands: ${uncovered.join(', ')}`);
  });
});
