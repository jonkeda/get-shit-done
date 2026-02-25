/**
 * GSD Copilot Port Validation — Installer
 * Validates the installer script handles all required operations.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const INSTALLER = path.join(ROOT, 'bin', 'copilot-install.js');

describe('Installer Integrity', () => {
  let content;

  it('copilot-install.js exists', () => {
    assert.ok(fs.existsSync(INSTALLER));
    content = fs.readFileSync(INSTALLER, 'utf-8');
  });

  it('has --update mode', () => {
    content = content || fs.readFileSync(INSTALLER, 'utf-8');
    assert.ok(content.includes('--update'), 'Missing --update flag handling');
  });

  it('has --uninstall mode', () => {
    content = content || fs.readFileSync(INSTALLER, 'utf-8');
    assert.ok(content.includes('--uninstall'), 'Missing --uninstall flag handling');
  });

  it('has --dry-run mode', () => {
    content = content || fs.readFileSync(INSTALLER, 'utf-8');
    assert.ok(content.includes('--dry-run'), 'Missing --dry-run flag handling');
  });

  it('has --force mode', () => {
    content = content || fs.readFileSync(INSTALLER, 'utf-8');
    assert.ok(content.includes('--force'), 'Missing --force flag handling');
  });

  it('copies .gsd/tools/', () => {
    content = content || fs.readFileSync(INSTALLER, 'utf-8');
    assert.ok(content.includes('.gsd/tools/') || content.includes("'tools'"), 'Missing .gsd/tools/ copy');
  });

  it('copies .gsd/hooks/', () => {
    content = content || fs.readFileSync(INSTALLER, 'utf-8');
    assert.ok(content.includes('.gsd/hooks/') || content.includes("'hooks'"), 'Missing .gsd/hooks/ copy');
  });

  it('copies .gsd/references/', () => {
    content = content || fs.readFileSync(INSTALLER, 'utf-8');
    assert.ok(content.includes('.gsd/references/') || content.includes("'references'"), 'Missing .gsd/references/ copy');
  });

  it('copies .gsd/templates/', () => {
    content = content || fs.readFileSync(INSTALLER, 'utf-8');
    assert.ok(content.includes('.gsd/templates/') || content.includes("'templates'"), 'Missing .gsd/templates/ copy');
  });

  it('handles .gitignore', () => {
    content = content || fs.readFileSync(INSTALLER, 'utf-8');
    assert.ok(content.includes('.gitignore'), 'Missing .gitignore handling');
  });

  it('has skip-if-exists logic', () => {
    content = content || fs.readFileSync(INSTALLER, 'utf-8');
    assert.ok(content.includes('existsSync') || content.includes('skip'), 'Missing skip-if-exists');
  });

  it('creates .vscode/mcp.json', () => {
    content = content || fs.readFileSync(INSTALLER, 'utf-8');
    assert.ok(content.includes('mcp.json'), 'Missing mcp.json handling');
  });

  it('has post-install verification', () => {
    content = content || fs.readFileSync(INSTALLER, 'utf-8');
    assert.ok(
      content.includes('verify') || content.includes('critical'),
      'Missing post-install verification'
    );
  });
});
