'use strict';
/**
 * Installer integration test.
 *
 * Compiles the extension TypeScript, then runs installToWorkspace against a
 * real temporary directory and asserts all expected outputs exist.
 *
 * Run from the workspace root: node scripts/test-installer.js
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const EXTENSION_DIR = path.join(WORKSPACE_ROOT, 'extension');

// ── 1. Compile TypeScript ─────────────────────────────────────────────────────

console.log('Compiling extension TypeScript...');
execSync('npx tsc', { cwd: EXTENSION_DIR, stdio: 'inherit' });
console.log('Compile OK\n');

// ── 2. Load compiled installer ────────────────────────────────────────────────

const { installToWorkspace } = require(path.join(EXTENSION_DIR, 'out', 'installer'));

// ── 3. Build mock context ─────────────────────────────────────────────────────

/**
 * Minimal mock for vscode.ExtensionContext.
 * installer.ts only accesses:
 *   context.extensionUri.fsPath  — path to the extension root
 *   context.extension.packageJSON.version — version string
 */
const mockContext = {
  extensionUri: { fsPath: EXTENSION_DIR },
  extension: { packageJSON: { version: '0.1.7' } },
};

// ── 4. Create temp workspace ──────────────────────────────────────────────────

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-installer-test-'));
console.log('Temp workspace:', tempDir);

/** Minimal mock for vscode.WorkspaceFolder */
const mockFolder = { uri: { fsPath: tempDir } };

// ── 5. Run install and assertions ─────────────────────────────────────────────

async function runTests() {
  // -- First install ----------------------------------------------------------
  console.log('\nRunning installToWorkspace (first install)...');
  const result1 = await installToWorkspace(mockContext, mockFolder);
  console.log('result:', JSON.stringify(result1));

  const checks = [
    {
      label: '.github/agents/ has at least one agent file',
      pass: (() => {
        const dir = path.join(tempDir, '.github', 'agents');
        return fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith('.agent.md'));
      })(),
    },
    {
      label: '.github/skills/ has at least one skill directory',
      pass: (() => {
        const dir = path.join(tempDir, '.github', 'skills');
        return (
          fs.existsSync(dir) &&
          fs.readdirSync(dir, { withFileTypes: true }).some((e) => e.isDirectory())
        );
      })(),
    },
    {
      label: '.github/prompts/ has at least one prompt file',
      pass: (() => {
        const dir = path.join(tempDir, '.github', 'prompts');
        return fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith('.prompt.md'));
      })(),
    },
    {
      label: '.github/instructions/ has at least one instructions file',
      pass: (() => {
        const dir = path.join(tempDir, '.github', 'instructions');
        return (
          fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith('.instructions.md'))
        );
      })(),
    },
    {
      label: '.github/copilot-instructions.md exists with GSD markers',
      pass: (() => {
        const f = path.join(tempDir, '.github', 'copilot-instructions.md');
        if (!fs.existsSync(f)) return false;
        const content = fs.readFileSync(f, 'utf8');
        return content.includes('<!-- GSD:BEGIN -->') && content.includes('<!-- GSD:END -->');
      })(),
    },
    {
      label: '.gsd/tools/gsd-mcp-server.js exists',
      pass: fs.existsSync(path.join(tempDir, '.gsd', 'tools', 'gsd-mcp-server.js')),
    },
    {
      label: '.gsd/references/ exists',
      pass: fs.existsSync(path.join(tempDir, '.gsd', 'references')),
    },
    {
      label: '.gsd/templates/ exists',
      pass: fs.existsSync(path.join(tempDir, '.gsd', 'templates')),
    },
    {
      label: '.vscode/mcp.json exists with gsd-tools key',
      pass: (() => {
        const f = path.join(tempDir, '.vscode', 'mcp.json');
        if (!fs.existsSync(f)) return false;
        try {
          const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
          return cfg.servers && cfg.servers['gsd-tools'] !== undefined;
        } catch {
          return false;
        }
      })(),
    },
    {
      label: '.gsd/VERSION contains version string',
      pass: (() => {
        const f = path.join(tempDir, '.gsd', 'VERSION');
        return fs.existsSync(f) && fs.readFileSync(f, 'utf8').trim().length > 0;
      })(),
    },
    {
      label: '.gitignore contains .gsd/',
      pass: (() => {
        const f = path.join(tempDir, '.gitignore');
        return fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes('.gsd/');
      })(),
    },
    {
      label: 'result.installed === true (first install)',
      pass: result1.installed === true,
    },
    {
      label: 'result.updated === false (fresh install)',
      pass: result1.updated === false,
    },
    {
      label: 'result.filesWritten > 0',
      pass: result1.filesWritten > 0,
    },
  ];

  // -- Second call: same version, no force → should skip -----------------------
  console.log('Running installToWorkspace (same version, no force — should skip)...');
  const result2 = await installToWorkspace(mockContext, mockFolder);
  checks.push({
    label: 'Same-version re-install returns installed=false',
    pass: result2.installed === false,
  });

  // -- Report ------------------------------------------------------------------
  let allPassed = true;
  console.log('\n--- Results ---');
  for (const { label, pass } of checks) {
    const marker = pass ? '  PASS' : '  FAIL';
    console.log(`${marker}  ${label}`);
    if (!pass) allPassed = false;
  }

  return allPassed;
}

runTests()
  .then((passed) => {
    // Cleanup regardless of result
    fs.rmSync(tempDir, { recursive: true });
    if (passed) {
      console.log('\nAll checks passed!');
      process.exit(0);
    } else {
      console.error('\nSome checks FAILED.');
      process.exit(1);
    }
  })
  .catch((err) => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.error('\nTest error:', err);
    process.exit(1);
  });
