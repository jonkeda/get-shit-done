import * as fs from 'fs';
import * as path from 'path';
import type * as vscode from 'vscode';

// ── Markers ───────────────────────────────────────────────────────────────────

const GSD_BEGIN = '<!-- GSD:BEGIN -->';
const GSD_END = '<!-- GSD:END -->';
const MCP_SERVER_KEY = 'gsd-tools';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InstallOptions {
  /** Force reinstall even when version matches. */
  force?: boolean;
}

export interface InstallResult {
  /** True when files were written (first install or update). */
  installed: boolean;
  /** True when this was an update to an existing install. */
  updated: boolean;
  /** Number of files written. */
  filesWritten: number;
}

// ── File utilities ────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Copy a single file, creating the destination directory if required.
 * Returns 1 if the file was written, 0 otherwise.
 */
function copyFileSafe(src: string, dest: string): number {
  if (!fs.existsSync(src)) {
    return 0;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return 1;
}

/**
 * Copy all files from `srcDir` whose names start with `prefix` and end with
 * `suffix` to `destDir`. Skips entries that are directories.
 * Returns the number of files copied.
 */
function copyMatchingFiles(
  srcDir: string,
  destDir: string,
  prefix: string,
  suffix: string,
): number {
  if (!fs.existsSync(srcDir)) {
    return 0;
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (prefix && !entry.name.startsWith(prefix)) {
      continue;
    }
    if (suffix && !entry.name.endsWith(suffix)) {
      continue;
    }
    ensureDir(destDir);
    fs.copyFileSync(path.join(srcDir, entry.name), path.join(destDir, entry.name));
    count++;
  }
  return count;
}

/**
 * Recursively copy a directory from `src` to `dest`.
 * Creates `dest` and all intermediate directories as needed.
 * Returns the number of files copied.
 */
function copyDirRecursive(src: string, dest: string): number {
  if (!fs.existsSync(src)) {
    return 0;
  }
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

// ── Version helpers ───────────────────────────────────────────────────────────

/**
 * Read the installed GSD version from `<workspace>/.gsd/VERSION`.
 * Returns `null` if the file does not exist (GSD not yet installed).
 */
function getInstalledVersion(workspacePath: string): string | null {
  const versionFile = path.join(workspacePath, '.gsd', 'VERSION');
  if (!fs.existsSync(versionFile)) {
    return null;
  }
  return fs.readFileSync(versionFile, 'utf8').trim();
}

/**
 * Write the extension version to `<workspace>/.gsd/VERSION`.
 */
function writeVersion(workspacePath: string, version: string): void {
  const versionFile = path.join(workspacePath, '.gsd', 'VERSION');
  ensureDir(path.dirname(versionFile));
  fs.writeFileSync(versionFile, version + '\n', 'utf8');
}

/**
 * Read the bundled extension version from the package manifest.
 */
function getExtensionVersion(context: vscode.ExtensionContext): string {
  return (context.extension.packageJSON as { version: string }).version;
}

// ── .github content installation ─────────────────────────────────────────────

function installAgents(assetsGithub: string, workspacePath: string): number {
  return copyMatchingFiles(
    path.join(assetsGithub, 'agents'),
    path.join(workspacePath, '.github', 'agents'),
    'gsd-',
    '.agent.md',
  );
}

function installSkills(assetsGithub: string, workspacePath: string): number {
  const skillsSrc = path.join(assetsGithub, 'skills');
  const skillsDest = path.join(workspacePath, '.github', 'skills');
  if (!fs.existsSync(skillsSrc)) {
    return 0;
  }
  const entries = fs.readdirSync(skillsSrc, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('gsd-')) {
      continue;
    }
    count += copyDirRecursive(
      path.join(skillsSrc, entry.name),
      path.join(skillsDest, entry.name),
    );
  }
  return count;
}

function installPrompts(assetsGithub: string, workspacePath: string): number {
  return copyMatchingFiles(
    path.join(assetsGithub, 'prompts'),
    path.join(workspacePath, '.github', 'prompts'),
    'gsd-',
    '.prompt.md',
  );
}

function installInstructions(assetsGithub: string, workspacePath: string): number {
  return copyMatchingFiles(
    path.join(assetsGithub, 'instructions'),
    path.join(workspacePath, '.github', 'instructions'),
    'gsd-',
    '.instructions.md',
  );
}

/**
 * Install all .github agent customisation files:
 * agents, skills, prompts, and instructions.
 * Returns total files written.
 */
function installGithubFiles(assetsGithub: string, workspacePath: string): number {
  let count = 0;
  count += installAgents(assetsGithub, workspacePath);
  count += installSkills(assetsGithub, workspacePath);
  count += installPrompts(assetsGithub, workspacePath);
  count += installInstructions(assetsGithub, workspacePath);
  return count;
}

// ── .gsd content installation ────────────────────────────────────────────────

/**
 * Install the GSD tools, references, and templates into the workspace
 * `.gsd/` directory.
 * Returns total files written.
 */
function installGsdContent(assetsGsd: string, workspacePath: string): number {
  let count = 0;
  count += copyDirRecursive(
    path.join(assetsGsd, 'tools'),
    path.join(workspacePath, '.gsd', 'tools'),
  );
  count += copyDirRecursive(
    path.join(assetsGsd, 'references'),
    path.join(workspacePath, '.gsd', 'references'),
  );
  count += copyDirRecursive(
    path.join(assetsGsd, 'templates'),
    path.join(workspacePath, '.gsd', 'templates'),
  );
  return count;
}

// ── Config merges ─────────────────────────────────────────────────────────────

/**
 * Merge the bundled GSD section into `.github/copilot-instructions.md`.
 *
 * - If the file does not exist: create it containing only the GSD section.
 * - If the file exists with GSD markers: replace the content between them.
 * - If the file exists without markers: append the GSD section at the end.
 */
function mergeCopilotInstructions(assetsGithub: string, workspacePath: string): number {
  const srcPath = path.join(assetsGithub, 'copilot-instructions.md');
  if (!fs.existsSync(srcPath)) {
    return 0;
  }
  const destPath = path.join(workspacePath, '.github', 'copilot-instructions.md');
  const gsdContent = fs.readFileSync(srcPath, 'utf8');
  const gsdSection = `${GSD_BEGIN}\n${gsdContent.trim()}\n${GSD_END}`;

  if (fs.existsSync(destPath)) {
    const existing = fs.readFileSync(destPath, 'utf8');
    const beginIdx = existing.indexOf(GSD_BEGIN);
    const endIdx = existing.indexOf(GSD_END);
    if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
      const newContent =
        existing.substring(0, beginIdx) +
        gsdSection +
        existing.substring(endIdx + GSD_END.length);
      fs.writeFileSync(destPath, newContent, 'utf8');
    } else {
      const sep = existing.endsWith('\n') ? '\n' : '\n\n';
      fs.writeFileSync(destPath, existing + sep + gsdSection + '\n', 'utf8');
    }
  } else {
    ensureDir(path.dirname(destPath));
    fs.writeFileSync(destPath, gsdSection + '\n', 'utf8');
  }
  return 1;
}

/**
 * Remove the legacy `gsd-tools` key from `.vscode/mcp.json` if present.
 *
 * The MCP server is now registered programmatically by the extension itself
 * (always-on, from bundled assets). Writing it also to `mcp.json` creates a
 * duplicate server entry in Copilot Chat. This function cleans up any
 * previously written entry so upgrades don't leave stale config behind.
 */
function cleanupMcpJson(workspacePath: string): void {
  const mcpFile = path.join(workspacePath, '.vscode', 'mcp.json');
  if (!fs.existsSync(mcpFile)) { return; }
  let mcpConfig: Record<string, unknown>;
  try {
    mcpConfig = JSON.parse(fs.readFileSync(mcpFile, 'utf8')) as Record<string, unknown>;
  } catch {
    return; // Malformed file — leave it alone
  }
  const servers = mcpConfig.servers;
  if (!servers || typeof servers !== 'object' || Array.isArray(servers)) { return; }
  if (!(MCP_SERVER_KEY in (servers as Record<string, unknown>))) { return; }
  delete (servers as Record<string, unknown>)[MCP_SERVER_KEY];
  // Remove empty servers object to keep the file clean
  if (Object.keys(servers as object).length === 0) {
    delete mcpConfig.servers;
  }
  fs.writeFileSync(mcpFile, JSON.stringify(mcpConfig, null, 2) + '\n', 'utf8');
}

/**
 * Ensure `.gsd/` is listed in the workspace `.gitignore`.
 * Creates the file if it does not exist. Does nothing if the entry is already present.
 */
function updateGitignore(workspacePath: string): void {
  const gitignorePath = path.join(workspacePath, '.gitignore');
  const gsdEntry = '.gsd/';

  if (fs.existsSync(gitignorePath)) {
    const existing = fs.readFileSync(gitignorePath, 'utf8');
    const lines = existing.split('\n').map((l) => l.trim());
    if (lines.includes(gsdEntry) || lines.includes(gsdEntry.replace(/\/$/, ''))) {
      return;
    }
    const sep = existing.endsWith('\n') ? '' : '\n';
    fs.writeFileSync(gitignorePath, existing + sep + gsdEntry + '\n', 'utf8');
  } else {
    fs.writeFileSync(gitignorePath, gsdEntry + '\n', 'utf8');
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Install or update GSD tooling in the given workspace folder.
 *
 * Checks `.gsd/VERSION` against the current extension version. If the versions
 * match, skips the install unless `options.force` is true.
 *
 * Operations performed:
 *  1. Copy agent customisation files to `.github/`
 *  2. Merge GSD section into `.github/copilot-instructions.md`
 *  3. Copy `.gsd/` tools, references, and templates
 *  4. Remove legacy `gsd-tools` entry from `.vscode/mcp.json` (now registered by extension)
 *  5. Ensure `.gsd/` is in `.gitignore`
 *  6. Write `.gsd/VERSION`
 */
export async function installToWorkspace(
  context: vscode.ExtensionContext,
  folder: vscode.WorkspaceFolder,
  options?: InstallOptions,
): Promise<InstallResult> {
  const workspacePath = folder.uri.fsPath;
  const assetsRoot = path.join(context.extensionUri.fsPath, 'assets');
  const assetsGithub = path.join(assetsRoot, 'github');
  const assetsGsd = path.join(assetsRoot, 'gsd');

  const extVersion = getExtensionVersion(context);
  const installedVersion = getInstalledVersion(workspacePath);

  if (installedVersion === extVersion && !options?.force) {
    return { installed: false, updated: false, filesWritten: 0 };
  }

  let filesWritten = 0;
  filesWritten += installGithubFiles(assetsGithub, workspacePath);
  filesWritten += mergeCopilotInstructions(assetsGithub, workspacePath);
  filesWritten += installGsdContent(assetsGsd, workspacePath);
  cleanupMcpJson(workspacePath);
  updateGitignore(workspacePath);
  writeVersion(workspacePath, extVersion);

  return {
    installed: true,
    updated: installedVersion !== null,
    filesWritten,
  };
}
