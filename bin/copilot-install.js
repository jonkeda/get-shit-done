#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colors
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const dim = '\x1b[2m';
const bold = '\x1b[1m';
const reset = '\x1b[0m';

// Package root and version
const pkgRoot = path.join(__dirname, '..');
const pkg = require(path.join(pkgRoot, 'package.json'));

// GSD section markers for copilot-instructions.md
const GSD_BEGIN = '<!-- GSD:BEGIN -->';
const GSD_END = '<!-- GSD:END -->';

// MCP server key
const MCP_SERVER_KEY = 'gsd-tools';

// Banner
const banner = '\n' +
  cyan + '   ██████╗ ███████╗██████╗\n' +
  '  ██╔════╝ ██╔════╝██╔══██╗\n' +
  '  ██║  ███╗███████╗██║  ██║\n' +
  '  ██║   ██║╚════██║██║  ██║\n' +
  '  ╚██████╔╝███████║██████╔╝\n' +
  '   ╚═════╝ ╚══════╝╚═════╝' + reset + '\n' +
  '\n' +
  '  Get Shit Done ' + dim + 'v' + pkg.version + reset + '\n' +
  '  VS Code Copilot Installer\n';

// Parse args
const args = process.argv.slice(2);
const hasUpdate = args.includes('--update');
const hasUninstall = args.includes('--uninstall');
const hasDryRun = args.includes('--dry-run');
const hasForce = args.includes('--force');
const hasVersion = args.includes('--version');
const hasHelp = args.includes('--help') || args.includes('-h');

console.log(banner);

// --- Help ---
if (hasHelp) {
  console.log(`  ${yellow}Usage:${reset} npx gsd-copilot [options]\n`);
  console.log(`  ${yellow}Options:${reset}`);
  console.log(`    ${cyan}--update${reset}      Update existing installation`);
  console.log(`    ${cyan}--uninstall${reset}   Remove GSD files (preserves .planning/)`);
  console.log(`    ${cyan}--dry-run${reset}     Show what would be installed without writing files`);
  console.log(`    ${cyan}--force${reset}       Overwrite files without prompting`);
  console.log(`    ${cyan}--version${reset}     Show installed and latest version`);
  console.log(`    ${cyan}--help${reset}        Show this help message\n`);
  console.log(`  ${yellow}Examples:${reset}`);
  console.log(`    ${dim}# Install into current project${reset}`);
  console.log(`    npx gsd-copilot\n`);
  console.log(`    ${dim}# Update existing installation${reset}`);
  console.log(`    npx gsd-copilot --update\n`);
  console.log(`    ${dim}# Preview changes without writing${reset}`);
  console.log(`    npx gsd-copilot --dry-run\n`);
  console.log(`    ${dim}# Remove GSD from project${reset}`);
  console.log(`    npx gsd-copilot --uninstall\n`);
  process.exit(0);
}

// --- Helpers ---

const cwd = process.cwd();
const actions = []; // track actions for dry-run and reporting

function log(msg) {
  console.log('  ' + msg);
}

function logAction(verb, target) {
  actions.push({ verb, target });
  if (hasDryRun) {
    log(`${dim}[dry-run]${reset} ${verb} ${cyan}${target}${reset}`);
  } else {
    log(`${green}✓${reset} ${verb} ${cyan}${target}${reset}`);
  }
}

function logWarn(msg) {
  log(`${yellow}⚠${reset} ${msg}`);
}

function logError(msg) {
  log(`${red}✗${reset} ${msg}`);
}

function ensureDir(dir) {
  if (!hasDryRun) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(filePath, content) {
  if (!hasDryRun) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function copyFile(src, dest) {
  if (!hasDryRun) {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

function removeFile(filePath) {
  try {
    if (!hasDryRun && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    logError(`Failed to remove ${filePath}: ${e.message}`);
  }
}

function removeDir(dirPath) {
  try {
    if (!hasDryRun && fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (e) {
    logError(`Failed to remove ${dirPath}: ${e.message}`);
  }
}

/**
 * Recursively copy a directory, preserving structure.
 * Returns number of files copied.
 */
function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return 0;
  let count = 0;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      count += copyDirRecursive(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
      count++;
    }
  }
  return count;
}

/**
 * List files in a directory matching a glob-like pattern.
 */
function listFiles(dir, prefix, suffix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => {
    if (prefix && !f.startsWith(prefix)) return false;
    if (suffix && !f.endsWith(suffix)) return false;
    return true;
  });
}

/**
 * List subdirectories matching a prefix.
 */
function listDirs(dir, prefix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && (!prefix || d.name.startsWith(prefix)))
    .map(d => d.name);
}

// --- Version check ---
if (hasVersion) {
  const versionFile = path.join(cwd, '.gsd', 'VERSION');
  if (fs.existsSync(versionFile)) {
    const installed = fs.readFileSync(versionFile, 'utf8').trim();
    log(`Installed: ${cyan}v${installed}${reset}`);
    log(`Package:   ${cyan}v${pkg.version}${reset}`);
    if (installed === pkg.version) {
      log(`${green}✓${reset} Up to date`);
    } else {
      log(`${yellow}⚠${reset} Update available — run ${cyan}npx gsd-copilot --update${reset}`);
    }
  } else {
    log(`Not installed in this workspace`);
    log(`Package: ${cyan}v${pkg.version}${reset}`);
  }
  process.exit(0);
}

// --- Workspace checks ---
try {
  fs.accessSync(cwd, fs.constants.W_OK);
} catch {
  logError('No write access to current directory');
  process.exit(1);
}

const isGitRepo = fs.existsSync(path.join(cwd, '.git'));
if (!isGitRepo) {
  logWarn('Not a git repository — proceeding anyway');
}

// --- Source paths (from npm package) ---
const srcGithub = path.join(pkgRoot, '.github');
const srcGsd = path.join(pkgRoot, '.gsd');

// --- Uninstall ---
if (hasUninstall) {
  log(`${yellow}Uninstalling GSD from workspace...${reset}\n`);

  // Remove gsd-*.agent.md from .github/agents/
  const agentsDir = path.join(cwd, '.github', 'agents');
  for (const f of listFiles(agentsDir, 'gsd-', '.agent.md')) {
    removeFile(path.join(agentsDir, f));
    logAction('Removed', `.github/agents/${f}`);
  }

  // Remove gsd-*.prompt.md from .github/prompts/
  const promptsDir = path.join(cwd, '.github', 'prompts');
  for (const f of listFiles(promptsDir, 'gsd-', '.prompt.md')) {
    removeFile(path.join(promptsDir, f));
    logAction('Removed', `.github/prompts/${f}`);
  }

  // Remove gsd-*/ from .github/skills/
  const skillsDir = path.join(cwd, '.github', 'skills');
  for (const d of listDirs(skillsDir, 'gsd-')) {
    removeDir(path.join(skillsDir, d));
    logAction('Removed', `.github/skills/${d}/`);
  }

  // Remove gsd-*.instructions.md from .github/instructions/
  const instrDir = path.join(cwd, '.github', 'instructions');
  for (const f of listFiles(instrDir, 'gsd-', '.instructions.md')) {
    removeFile(path.join(instrDir, f));
    logAction('Removed', `.github/instructions/${f}`);
  }

  // Remove GSD section from copilot-instructions.md
  const copilotInstrFile = path.join(cwd, '.github', 'copilot-instructions.md');
  if (fs.existsSync(copilotInstrFile)) {
    try {
      const content = fs.readFileSync(copilotInstrFile, 'utf8');
      const beginIdx = content.indexOf(GSD_BEGIN);
      const endIdx = content.indexOf(GSD_END);
      if (beginIdx !== -1 && endIdx !== -1) {
        const before = content.substring(0, beginIdx).trimEnd();
        const after = content.substring(endIdx + GSD_END.length).trimStart();
        const cleaned = before + (after ? '\n' + after : '');
        if (cleaned.trim().length === 0) {
          removeFile(copilotInstrFile);
          logAction('Removed', '.github/copilot-instructions.md (was GSD-only)');
        } else {
          writeFile(copilotInstrFile, cleaned.trim() + '\n');
          logAction('Cleaned', '.github/copilot-instructions.md (removed GSD section)');
        }
      }
    } catch (e) {
      logError(`Failed to clean copilot-instructions.md: ${e.message}`);
    }
  }

  // Remove gsd-tools from .vscode/mcp.json
  const mcpFile = path.join(cwd, '.vscode', 'mcp.json');
  if (fs.existsSync(mcpFile)) {
    try {
      const mcpContent = JSON.parse(fs.readFileSync(mcpFile, 'utf8'));
      if (mcpContent.servers && mcpContent.servers[MCP_SERVER_KEY]) {
        delete mcpContent.servers[MCP_SERVER_KEY];
        if (Object.keys(mcpContent.servers).length === 0) {
          removeFile(mcpFile);
          logAction('Removed', '.vscode/mcp.json (was GSD-only)');
        } else {
          writeFile(mcpFile, JSON.stringify(mcpContent, null, 2) + '\n');
          logAction('Cleaned', '.vscode/mcp.json (removed gsd-tools)');
        }
      }
    } catch (e) {
      logError(`Failed to clean mcp.json: ${e.message}`);
    }
  }

  // Remove GSD hook entries from JSON configs before removing .gsd/
  const uninstHooksDir = path.join(cwd, '.gsd', 'hooks');
  if (fs.existsSync(uninstHooksDir)) {
    for (const f of fs.readdirSync(uninstHooksDir)) {
      const hookPath = path.join(uninstHooksDir, f);
      if (f.endsWith('.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(hookPath, 'utf8'));
          let modified = false;
          for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
              const filtered = value.filter(item => !JSON.stringify(item).includes('.gsd/hooks/'));
              if (filtered.length !== value.length) {
                data[key] = filtered;
                modified = true;
              }
            } else if (typeof value === 'object' && value !== null) {
              for (const [k, v] of Object.entries(value)) {
                if (JSON.stringify(v).includes('.gsd/hooks/')) {
                  delete data[key][k];
                  modified = true;
                }
              }
            }
          }
          if (modified) {
            logAction('Cleaned', `.gsd/hooks/${f} (removed GSD entries)`);
          }
        } catch { /* ignore parse errors, will be removed with .gsd/ */ }
      } else {
        logAction('Removed', `.gsd/hooks/${f}`);
      }
    }
  }

  // Remove .gsd/ entirely
  const gsdDir = path.join(cwd, '.gsd');
  if (fs.existsSync(gsdDir)) {
    removeDir(gsdDir);
    logAction('Removed', '.gsd/');
  }

  // Remove .gsd/ from .gitignore
  const gitignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    try {
      const lines = fs.readFileSync(gitignorePath, 'utf8').split('\n');
      const filtered = lines.filter(l => l.trim() !== '.gsd/' && l.trim() !== '.gsd');
      if (filtered.length !== lines.length) {
        writeFile(gitignorePath, filtered.join('\n'));
        logAction('Cleaned', '.gitignore (removed .gsd/)');
      }
    } catch (e) {
      logError(`Failed to clean .gitignore: ${e.message}`);
    }
  }

  // Cleanup empty .github/ subdirs
  for (const sub of ['agents', 'prompts', 'skills', 'instructions']) {
    const dir = path.join(cwd, '.github', sub);
    try {
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
      }
    } catch { /* ignore */ }
  }

  console.log();
  log(`${green}GSD uninstalled.${reset} .planning/ was preserved.`);
  console.log();
  process.exit(0);
}

// --- Install / Update ---

// Check for existing install
const versionFile = path.join(cwd, '.gsd', 'VERSION');
const isExisting = fs.existsSync(versionFile);

if (isExisting && !hasUpdate && !hasForce && !hasDryRun) {
  const installed = fs.readFileSync(versionFile, 'utf8').trim();
  if (installed === pkg.version) {
    log(`GSD ${cyan}v${installed}${reset} is already installed.`);
    log(`Use ${cyan}--update${reset} to reinstall or ${cyan}--force${reset} to overwrite.`);
    console.log();
    process.exit(0);
  } else {
    log(`Existing install: ${dim}v${installed}${reset} → updating to ${cyan}v${pkg.version}${reset}`);
    console.log();
  }
} else if (hasUpdate && !isExisting) {
  log(`No existing installation found. Running fresh install.`);
  console.log();
}

const modeLabel = hasDryRun ? `${dim}[dry-run]${reset} ` : '';
log(`${modeLabel}${hasUpdate ? 'Updating' : 'Installing'} GSD for VS Code Copilot...\n`);

// --- 1. Copy agents ---
try {
  const srcAgents = path.join(srcGithub, 'agents');
  const destAgents = path.join(cwd, '.github', 'agents');
  const agentFiles = listFiles(srcAgents, 'gsd-', '.agent.md');
  for (const f of agentFiles) {
    copyFile(path.join(srcAgents, f), path.join(destAgents, f));
    logAction('Copied', `.github/agents/${f}`);
  }
} catch (e) {
  logError(`Agents: ${e.message}`);
}

// --- 2. Copy skills ---
try {
  const srcSkills = path.join(srcGithub, 'skills');
  const destSkills = path.join(cwd, '.github', 'skills');
  const skillDirs = listDirs(srcSkills, 'gsd-');
  for (const d of skillDirs) {
    const count = copyDirRecursive(path.join(srcSkills, d), path.join(destSkills, d));
    logAction('Copied', `.github/skills/${d}/ (${count} files)`);
  }
} catch (e) {
  logError(`Skills: ${e.message}`);
}

// --- 3. Copy prompts ---
try {
  const srcPrompts = path.join(srcGithub, 'prompts');
  const destPrompts = path.join(cwd, '.github', 'prompts');
  const promptFiles = listFiles(srcPrompts, 'gsd-', '.prompt.md');
  for (const f of promptFiles) {
    copyFile(path.join(srcPrompts, f), path.join(destPrompts, f));
    logAction('Copied', `.github/prompts/${f}`);
  }
} catch (e) {
  logError(`Prompts: ${e.message}`);
}

// --- 4. Copy instructions (skip existing unless --force) ---
try {
  const srcInstr = path.join(srcGithub, 'instructions');
  const destInstr = path.join(cwd, '.github', 'instructions');
  const instrFiles = listFiles(srcInstr, 'gsd-', '.instructions.md');
  for (const f of instrFiles) {
    const destPath = path.join(destInstr, f);
    if (fs.existsSync(destPath) && !hasForce) {
      logWarn(`Skipping ${f} (already exists, use --force to overwrite)`);
      continue;
    }
    copyFile(path.join(srcInstr, f), destPath);
    logAction('Copied', `.github/instructions/${f}`);
  }
} catch (e) {
  logError(`Instructions: ${e.message}`);
}

// --- 5. Section-append copilot-instructions.md ---
try {
  const srcCopilotInstr = path.join(srcGithub, 'copilot-instructions.md');
  const destCopilotInstr = path.join(cwd, '.github', 'copilot-instructions.md');
  const gsdContent = fs.readFileSync(srcCopilotInstr, 'utf8');
  const gsdSection = `${GSD_BEGIN}\n${gsdContent.trim()}\n${GSD_END}`;

  if (fs.existsSync(destCopilotInstr)) {
    const existing = fs.readFileSync(destCopilotInstr, 'utf8');
    const beginIdx = existing.indexOf(GSD_BEGIN);
    const endIdx = existing.indexOf(GSD_END);

    if (beginIdx !== -1 && endIdx !== -1) {
      // Replace between markers
      const before = existing.substring(0, beginIdx);
      const after = existing.substring(endIdx + GSD_END.length);
      writeFile(destCopilotInstr, before + gsdSection + after);
      logAction('Updated', '.github/copilot-instructions.md (replaced GSD section)');
    } else {
      // Append at end
      const separator = existing.endsWith('\n') ? '\n' : '\n\n';
      writeFile(destCopilotInstr, existing + separator + gsdSection + '\n');
      logAction('Updated', '.github/copilot-instructions.md (appended GSD section)');
    }
  } else {
    // Create new
    writeFile(destCopilotInstr, gsdSection + '\n');
    logAction('Created', '.github/copilot-instructions.md');
  }
} catch (e) {
  logError(`copilot-instructions.md: ${e.message}`);
}

// --- 6. Copy .gsd/ files ---
try {
  // .gsd/tools/
  const srcTools = path.join(srcGsd, 'tools');
  const destTools = path.join(cwd, '.gsd', 'tools');
  if (fs.existsSync(srcTools)) {
    const count = copyDirRecursive(srcTools, destTools);
    logAction('Copied', `.gsd/tools/ (${count} files)`);
  }

  // .gsd/hooks/ — merge JSON configs, overwrite JS scripts
  const srcHooks = path.join(srcGsd, 'hooks');
  const destHooks = path.join(cwd, '.gsd', 'hooks');
  if (fs.existsSync(srcHooks)) {
    ensureDir(destHooks);
    let hookCount = 0;
    const hookEntries = fs.readdirSync(srcHooks, { withFileTypes: true });
    for (const entry of hookEntries) {
      if (entry.isDirectory()) {
        copyDirRecursive(path.join(srcHooks, entry.name), path.join(destHooks, entry.name));
        hookCount++;
        continue;
      }
      const srcPath = path.join(srcHooks, entry.name);
      const destPath = path.join(destHooks, entry.name);
      if (entry.name.endsWith('.json') && fs.existsSync(destPath)) {
        // Merge GSD entries into existing JSON without overwriting user entries
        if (!hasDryRun) {
          try {
            const srcData = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
            const destData = JSON.parse(fs.readFileSync(destPath, 'utf8'));
            for (const [key, value] of Object.entries(srcData)) {
              if (Array.isArray(value)) {
                if (!Array.isArray(destData[key])) destData[key] = [];
                for (const item of value) {
                  const itemStr = JSON.stringify(item);
                  if (!destData[key].some(e => JSON.stringify(e) === itemStr)) {
                    destData[key].push(item);
                  }
                }
              } else if (typeof value === 'object' && value !== null) {
                if (!destData[key] || typeof destData[key] !== 'object') destData[key] = {};
                for (const [k, v] of Object.entries(value)) {
                  if (!(k in destData[key]) || JSON.stringify(v).includes('.gsd/hooks/')) {
                    destData[key][k] = v;
                  }
                }
              } else {
                destData[key] = value;
              }
            }
            fs.writeFileSync(destPath, JSON.stringify(destData, null, 2) + '\n', 'utf8');
          } catch (mergeErr) {
            fs.copyFileSync(srcPath, destPath);
          }
        }
        logAction('Merged', `.gsd/hooks/${entry.name}`);
        hookCount++;
      } else {
        // JS files and new JSON files: copy normally
        copyFile(srcPath, destPath);
        hookCount++;
      }
    }
    logAction('Copied', `.gsd/hooks/ (${hookCount} files)`);
  }

  // .gsd/references/
  const srcRefs = path.join(srcGsd, 'references');
  const destRefs = path.join(cwd, '.gsd', 'references');
  if (fs.existsSync(srcRefs)) {
    const count = copyDirRecursive(srcRefs, destRefs);
    logAction('Copied', `.gsd/references/ (${count} files)`);
  }

  // .gsd/templates/
  const srcTemplates = path.join(srcGsd, 'templates');
  const destTemplates = path.join(cwd, '.gsd', 'templates');
  if (fs.existsSync(srcTemplates)) {
    const count = copyDirRecursive(srcTemplates, destTemplates);
    logAction('Copied', `.gsd/templates/ (${count} files)`);
  }
} catch (e) {
  logError(`.gsd/ files: ${e.message}`);
}

// --- 7. MCP config merge ---
try {
  const mcpFile = path.join(cwd, '.vscode', 'mcp.json');
  const gsdServer = {
    type: 'stdio',
    command: 'node',
    args: ['${workspaceFolder}/.gsd/tools/gsd-mcp-server.js'],
    env: { GSD_WORKSPACE: '${workspaceFolder}' }
  };

  let mcpConfig;
  if (fs.existsSync(mcpFile)) {
    try {
      mcpConfig = JSON.parse(fs.readFileSync(mcpFile, 'utf8'));
    } catch {
      mcpConfig = {};
    }
  } else {
    mcpConfig = {};
  }

  if (!mcpConfig.servers) mcpConfig.servers = {};
  mcpConfig.servers[MCP_SERVER_KEY] = gsdServer;

  writeFile(mcpFile, JSON.stringify(mcpConfig, null, 2) + '\n');
  logAction('Configured', '.vscode/mcp.json (gsd-tools server)');
} catch (e) {
  logError(`mcp.json: ${e.message}`);
}

// --- 8. Gitignore ---
try {
  const gitignorePath = path.join(cwd, '.gitignore');
  const gsdEntry = '.gsd/';

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    const lines = content.split('\n').map(l => l.trim());
    if (!lines.includes(gsdEntry) && !lines.includes('.gsd')) {
      const separator = content.endsWith('\n') ? '' : '\n';
      writeFile(gitignorePath, content + separator + gsdEntry + '\n');
      logAction('Updated', '.gitignore (added .gsd/)');
    }
  } else {
    writeFile(gitignorePath, gsdEntry + '\n');
    logAction('Created', '.gitignore');
  }
} catch (e) {
  logError(`.gitignore: ${e.message}`);
}

// --- 9. Write version ---
try {
  writeFile(versionFile, pkg.version + '\n');
  logAction('Wrote', `.gsd/VERSION (v${pkg.version})`);
} catch (e) {
  logError(`VERSION file: ${e.message}`);
}

// --- Summary ---
console.log();

if (hasDryRun) {
  log(`${dim}Dry run complete — ${actions.length} actions would be performed.${reset}`);
  console.log();
  process.exit(0);
}

const hasErrors = actions.length === 0;
if (hasErrors) {
  logError('No files were installed. Check errors above.');
  process.exit(1);
}

// Post-install verification
const criticalFiles = [
  '.github/copilot-instructions.md',
  '.github/agents/gsd-planner.agent.md',
  '.gsd/tools/gsd-mcp-server.js',
  '.vscode/mcp.json',
];
const missing = criticalFiles.filter(f => !fs.existsSync(path.join(cwd, f)));
if (missing.length > 0) {
  log('');
  log(`${yellow}⚠ WARNING: Some critical files are missing after install:${reset}`);
  missing.forEach(f => log('  - ' + f));
  log(`  Run with ${cyan}--force${reset} to re-copy, or check file permissions.`);
}

// Success box
const box = [
  `╔═══════════════════════════════════════════╗`,
  `║  ${green}✅ GSD installed successfully!${reset}            ║`,
  `╠═══════════════════════════════════════════╣`,
  `║  Quick start:                             ║`,
  `║  1. Open VS Code Copilot chat             ║`,
  `║  2. Type ${cyan}/gsd-new-project${reset}                 ║`,
  `║  3. Follow the interactive setup          ║`,
  `║                                           ║`,
  `║  For help: ${cyan}/gsd-help${reset}                       ║`,
  `╚═══════════════════════════════════════════╝`,
];

if (hasUpdate) {
  box[1] = `║  ${green}✅ GSD updated to v${pkg.version}!${reset}` +
    ' '.repeat(Math.max(0, 23 - pkg.version.length)) + `║`;
}

console.log();
for (const line of box) {
  console.log('  ' + line);
}
console.log();
