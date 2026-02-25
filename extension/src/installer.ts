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
