#!/usr/bin/env node

/**
 * Package the GSD VS Code extension as a VSIX.
 *
 * Usage:
 *   node scripts/package-extension.js [--patch|--minor|--major]
 *
 * Steps:
 *   1. Bump version in extension/package.json (default: patch)
 *   2. npm install in extension/
 *   3. Compile TypeScript
 *   4. Package with @vscode/vsce
 *   5. Install the VSIX into VS Code
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Paths
const ROOT = path.resolve(__dirname, '..');
const EXT_DIR = path.join(ROOT, 'extension');
const EXT_PKG_PATH = path.join(EXT_DIR, 'package.json');

// Parse args
const args = process.argv.slice(2);
const bumpType = args.includes('--major') ? 'major'
  : args.includes('--minor') ? 'minor'
  : 'patch';
const skipInstall = args.includes('--no-install');

// Colors
const c = { green: '\x1b[32m', cyan: '\x1b[36m', yellow: '\x1b[33m', red: '\x1b[31m', dim: '\x1b[2m', reset: '\x1b[0m' };

function log(msg) { console.log(`  ${c.cyan}→${c.reset} ${msg}`); }
function ok(msg) { console.log(`  ${c.green}✓${c.reset} ${msg}`); }
function warn(msg) { console.log(`  ${c.yellow}⚠${c.reset} ${msg}`); }
function fail(msg) { console.error(`  ${c.red}✗${c.reset} ${msg}`); process.exit(1); }

function run(cmd, cmdArgs, opts = {}) {
  const cwd = opts.cwd || EXT_DIR;
  try {
    return execFileSync(cmd, cmdArgs, { cwd, stdio: opts.stdio || 'pipe', encoding: 'utf8', shell: true });
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString().trim() : e.message;
    fail(`${cmd} ${cmdArgs.join(' ')} failed:\n    ${stderr}`);
  }
}

// --- Helpers for asset copy ---

function copyMatchingFiles(srcDir, destDir, prefix, suffix) {
  if (!fs.existsSync(srcDir)) { warn(`Asset source missing: ${srcDir}`); return 0; }
  fs.mkdirSync(destDir, { recursive: true });
  let count = 0;
  for (const f of fs.readdirSync(srcDir)) {
    if (prefix && !f.startsWith(prefix)) continue;
    if (suffix && !f.endsWith(suffix)) continue;
    const stat = fs.statSync(path.join(srcDir, f));
    if (!stat.isFile()) continue;
    fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
    count++;
  }
  return count;
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) { warn(`Asset source missing: ${src}`); return 0; }
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.gitkeep') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += copyDirRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
      count++;
    }
  }
  return count;
}

// --- 1. Bump version ---
log(`Bumping ${bumpType} version...`);
const extPkg = JSON.parse(fs.readFileSync(EXT_PKG_PATH, 'utf8'));
const oldVersion = extPkg.version;
const parts = oldVersion.split('.').map(Number);

if (bumpType === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; }
else if (bumpType === 'minor') { parts[1]++; parts[2] = 0; }
else { parts[2]++; }

const newVersion = parts.join('.');
extPkg.version = newVersion;
fs.writeFileSync(EXT_PKG_PATH, JSON.stringify(extPkg, null, 2) + '\n');
ok(`Version: ${oldVersion} → ${newVersion}`);

// --- 2. Install dependencies ---
log('Installing dependencies...');
run('npm', ['install', '--no-audit', '--no-fund'], { stdio: 'inherit' });
ok('Dependencies installed');

// --- 3. Copy MCP server into extension ---
log('Copying MCP server...');
const mcpSrc = path.join(ROOT, '.gsd', 'tools');
const mcpDst = path.join(EXT_DIR, 'mcp-server');

// Clean previous copy
if (fs.existsSync(mcpDst)) {
  fs.rmSync(mcpDst, { recursive: true });
}

fs.mkdirSync(path.join(mcpDst, 'lib'), { recursive: true });

// Copy main server file
fs.copyFileSync(
  path.join(mcpSrc, 'gsd-mcp-server.js'),
  path.join(mcpDst, 'gsd-mcp-server.js'),
);

// Copy lib/*.js files
for (const f of fs.readdirSync(path.join(mcpSrc, 'lib'))) {
  if (f.endsWith('.js')) {
    fs.copyFileSync(
      path.join(mcpSrc, 'lib', f),
      path.join(mcpDst, 'lib', f),
    );
  }
}
ok('MCP server copied to extension/mcp-server/');

// --- 3.5. Copy GSD content assets into extension/assets/ ---
log('Copying GSD content assets...');
{
  const ASSETS_DIR = path.join(EXT_DIR, 'assets');
  const GITHUB_SRC = path.join(ROOT, '.github');
  const GSD_SRC = path.join(ROOT, '.gsd');

  // Clean previous assets
  if (fs.existsSync(ASSETS_DIR)) {
    fs.rmSync(ASSETS_DIR, { recursive: true, force: true });
  }

  // .github/agents/gsd-*.agent.md
  const agentCount = copyMatchingFiles(
    path.join(GITHUB_SRC, 'agents'),
    path.join(ASSETS_DIR, 'github', 'agents'),
    'gsd-', '.agent.md',
  );

  // .github/skills/gsd-*/ (recursive)
  let skillCount = 0;
  const skillsSrc = path.join(GITHUB_SRC, 'skills');
  const skillsDest = path.join(ASSETS_DIR, 'github', 'skills');
  if (fs.existsSync(skillsSrc)) {
    for (const entry of fs.readdirSync(skillsSrc, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith('gsd-')) continue;
      copyDirRecursive(path.join(skillsSrc, entry.name), path.join(skillsDest, entry.name));
      skillCount++;
    }
  }

  // .github/prompts/gsd-*.prompt.md
  const promptCount = copyMatchingFiles(
    path.join(GITHUB_SRC, 'prompts'),
    path.join(ASSETS_DIR, 'github', 'prompts'),
    'gsd-', '.prompt.md',
  );

  // .github/instructions/gsd-*.instructions.md
  const instrCount = copyMatchingFiles(
    path.join(GITHUB_SRC, 'instructions'),
    path.join(ASSETS_DIR, 'github', 'instructions'),
    'gsd-', '.instructions.md',
  );

  // .github/copilot-instructions.md
  const ciSrc = path.join(GITHUB_SRC, 'copilot-instructions.md');
  if (fs.existsSync(ciSrc)) {
    fs.mkdirSync(path.join(ASSETS_DIR, 'github'), { recursive: true });
    fs.copyFileSync(ciSrc, path.join(ASSETS_DIR, 'github', 'copilot-instructions.md'));
  }

  // .gsd/tools/ — JS files only (gsd-mcp-server.js + lib/*.js)
  const toolSrc = path.join(GSD_SRC, 'tools');
  const toolDest = path.join(ASSETS_DIR, 'gsd', 'tools');
  let toolLibCount = 0;
  if (fs.existsSync(toolSrc)) {
    fs.mkdirSync(path.join(toolDest, 'lib'), { recursive: true });
    const serverSrc = path.join(toolSrc, 'gsd-mcp-server.js');
    if (fs.existsSync(serverSrc)) {
      fs.copyFileSync(serverSrc, path.join(toolDest, 'gsd-mcp-server.js'));
    }
    const libSrc = path.join(toolSrc, 'lib');
    if (fs.existsSync(libSrc)) {
      for (const f of fs.readdirSync(libSrc)) {
        if (!f.endsWith('.js')) continue;
        fs.copyFileSync(path.join(libSrc, f), path.join(toolDest, 'lib', f));
        toolLibCount++;
      }
    }
  }

  // .gsd/references/ and .gsd/templates/ (recursive)
  const refCount = copyDirRecursive(
    path.join(GSD_SRC, 'references'),
    path.join(ASSETS_DIR, 'gsd', 'references'),
  );
  const tplCount = copyDirRecursive(
    path.join(GSD_SRC, 'templates'),
    path.join(ASSETS_DIR, 'gsd', 'templates'),
  );

  ok(
    `GSD assets: ${agentCount} agents, ${skillCount} skills, ${promptCount} prompts, ` +
    `${instrCount} instructions, tools(${toolLibCount} lib), ` +
    `${refCount} refs, ${tplCount} templates`,
  );
}

// --- 4. Compile TypeScript ---
log('Compiling TypeScript...');
run('npx', ['tsc', '-p', './'], { stdio: 'inherit' });
ok('TypeScript compiled');

// --- 5. Package VSIX ---
log('Packaging VSIX...');

// Ensure vsce is available
const vsceBin = path.join(EXT_DIR, 'node_modules', '.bin', 'vsce');
if (!fs.existsSync(vsceBin) && !fs.existsSync(vsceBin + '.cmd')) {
  log('Installing @vscode/vsce...');
  run('npm', ['install', '--no-save', '@vscode/vsce'], { stdio: 'inherit' });
}

const vsixName = `gsd-copilot-${newVersion}.vsix`;
const vsixPath = path.join(EXT_DIR, vsixName);

// Remove old vsix files
for (const f of fs.readdirSync(EXT_DIR)) {
  if (f.endsWith('.vsix')) fs.unlinkSync(path.join(EXT_DIR, f));
}

// Copy LICENSE from root if missing
const extLicense = path.join(EXT_DIR, 'LICENSE');
const rootLicense = path.join(ROOT, 'LICENSE');
if (!fs.existsSync(extLicense) && fs.existsSync(rootLicense)) {
  fs.copyFileSync(rootLicense, extLicense);
}

run('npx', ['vsce', 'package', '--no-dependencies', '--allow-missing-repository', '-o', vsixName], { stdio: 'inherit' });
ok(`VSIX: extension/${vsixName}`);

// --- 6. Install into VS Code ---
if (!skipInstall) {
  log('Installing extension into VS Code...');
  // Try both 'code' and 'code-insiders'
  const editors = ['code-insiders', 'code'];
  let installed = false;
  for (const editor of editors) {
    try {
      run(editor, ['--install-extension', vsixPath], { cwd: ROOT, stdio: 'inherit' });
      ok(`Installed into ${editor}`);
      installed = true;
      break;
    } catch {
      // try next
    }
  }
  if (!installed) {
    warn('Could not find code or code-insiders. Install manually:');
    console.log(`    code --install-extension ${vsixPath}`);
  }
} else {
  log('Skipping install (--no-install)');
}

console.log(`\n  ${c.green}Done!${c.reset} GSD Copilot extension v${newVersion} packaged.`);
if (!skipInstall) {
  console.log(`  ${c.dim}Reload VS Code window to activate.${c.reset}\n`);
}
