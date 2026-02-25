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
