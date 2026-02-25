/**
 * GSD Copilot Port Validation — Agents
 * Validates all 11 agents have correct frontmatter, no stale refs, and minimum content.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(ROOT, '.github', 'agents');

const EXPECTED_AGENTS = [
  'gsd-codebase-mapper',
  'gsd-debugger',
  'gsd-executor',
  'gsd-integration-checker',
  'gsd-phase-researcher',
  'gsd-plan-checker',
  'gsd-planner',
  'gsd-project-researcher',
  'gsd-research-synthesizer',
  'gsd-roadmapper',
  'gsd-verifier',
];

const STALE_PATTERNS = [
  /gsd-tools\.cjs/,
  /~\/\.claude/,
  /~\/\.gsd\/get-shit-done/,
  /Bash\(\s*["'`]/,
  /Task\(\s*["'`]/,
  /Read\(\s*["'`]/,
  /Edit\(\s*["'`]/,
];

describe('Agent Integrity', () => {

  it('all 11 agent files exist', () => {
    for (const name of EXPECTED_AGENTS) {
      const agentPath = path.join(AGENTS_DIR, `${name}.agent.md`);
      assert.ok(fs.existsSync(agentPath), `Missing agent: ${name}.agent.md`);
    }
  });

  it('no extra unexpected GSD agent files', () => {
    const actual = fs.readdirSync(AGENTS_DIR)
      .filter(f => f.endsWith('.agent.md') && f.startsWith('gsd-'));
    const expected = EXPECTED_AGENTS.map(n => `${n}.agent.md`);
    const unexpected = actual.filter(f => !expected.includes(f));
    assert.deepStrictEqual(unexpected, [], `Unexpected GSD agents: ${unexpected.join(', ')}`);
  });

  for (const name of EXPECTED_AGENTS) {
    describe(name, () => {
      let content;

      it('has YAML frontmatter', () => {
        content = fs.readFileSync(path.join(AGENTS_DIR, `${name}.agent.md`), 'utf-8');
        assert.ok(content.startsWith('---'), 'Missing YAML frontmatter opening');
        const secondDash = content.indexOf('---', 4);
        assert.ok(secondDash > 0, 'Missing YAML frontmatter closing');
      });

      it('has model: field', () => {
        content = content || fs.readFileSync(path.join(AGENTS_DIR, `${name}.agent.md`), 'utf-8');
        assert.ok(/^model:/m.test(content), 'Missing model: field');
      });

      it('has description: field', () => {
        content = content || fs.readFileSync(path.join(AGENTS_DIR, `${name}.agent.md`), 'utf-8');
        assert.ok(/^description:/m.test(content), 'Missing description: field');
      });

      it('has no stale Claude Code references', () => {
        content = content || fs.readFileSync(path.join(AGENTS_DIR, `${name}.agent.md`), 'utf-8');
        for (const pattern of STALE_PATTERNS) {
          const match = content.match(pattern);
          assert.ok(!match, `Stale ref found: ${match ? match[0] : ''}`);
        }
      });

      it('has at least 50 lines of content', () => {
        content = content || fs.readFileSync(path.join(AGENTS_DIR, `${name}.agent.md`), 'utf-8');
        const lines = content.split('\n').length;
        assert.ok(lines >= 50, `Only ${lines} lines — seems too short`);
      });
    });
  }
});
