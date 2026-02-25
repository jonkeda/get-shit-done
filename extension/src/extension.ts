import * as vscode from 'vscode';
import { GsdStatusBar } from './statusBar';
import { GsdTreeViewProvider } from './treeView';
import { registerCommands } from './commands';
import { installToWorkspace } from './installer';

let statusBar: GsdStatusBar | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];

  // Set context key for conditional UI
  const hasPlanning = folder
    ? await fileExists(vscode.Uri.joinPath(folder.uri, '.planning'))
    : false;
  await vscode.commands.executeCommand('setContext', 'gsd:hasPlanning', hasPlanning);

  // Watch for .planning/ creation/deletion to toggle UI
  if (folder) {
    const planningWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(folder, '.planning'),
    );
    planningWatcher.onDidCreate(() =>
      vscode.commands.executeCommand('setContext', 'gsd:hasPlanning', true),
    );
    planningWatcher.onDidDelete(() =>
      vscode.commands.executeCommand('setContext', 'gsd:hasPlanning', false),
    );
    context.subscriptions.push(planningWatcher);
  }

  // Status bar
  statusBar = new GsdStatusBar();
  statusBar.activate(context);

  // Tree view
  const treeProvider = new GsdTreeViewProvider();
  treeProvider.activate(context);

  // Commands
  registerCommands(context);

  // Register MCP server from bundled extension path — immediately available
  // before any workspace file copy completes (MCP-01).
  if (folder) {
    const bundledScript = vscode.Uri.joinPath(
      context.extensionUri,
      'assets', 'gsd', 'tools', 'gsd-mcp-server.js',
    );
    const serverDef = new vscode.McpStdioServerDefinition(
      'GSD Tools',
      process.execPath,
      [bundledScript.fsPath],
      { GSD_WORKSPACE: folder.uri.fsPath },
    );
    context.subscriptions.push(
      vscode.lm.registerMcpServerDefinitionProvider('gsd.mcp-servers', {
        provideMcpServerDefinitions() {
          return [serverDef];
        },
      }),
    );
  }

  // Install or update GSD tooling for each workspace folder.
  // Fire-and-forget: version check inside installer handles idempotency (UPDATE-01..04, MCP-02).
  for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
    installToWorkspace(context, workspaceFolder).catch((err) => {
      console.error('[GSD] Install error:', err);
    });
  }
}

export function deactivate(): void {
  statusBar?.dispose();
  statusBar = undefined;
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
