import * as vscode from 'vscode';
import { GsdStatusBar } from './statusBar';
import { GsdTreeViewProvider } from './treeView';
import { registerCommands } from './commands';

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

  // MCP server provider — dynamically registers the bundled GSD MCP server
  if (typeof vscode.lm?.registerMcpServerDefinitionProvider === 'function') {
    const mcpServerPath = vscode.Uri.joinPath(context.extensionUri, 'mcp-server', 'gsd-mcp-server.js');
    context.subscriptions.push(
      vscode.lm.registerMcpServerDefinitionProvider('gsd-tools', {
        provideMcpServerDefinitions: () => {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
          return [
            new vscode.McpStdioServerDefinition(
              'GSD Tools',
              'node',
              [mcpServerPath.fsPath],
              { GSD_WORKSPACE: workspaceFolder },
              '1.0.0',
            ),
          ];
        },
      }),
    );
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
