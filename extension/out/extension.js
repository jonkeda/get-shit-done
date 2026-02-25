"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const statusBar_1 = require("./statusBar");
const treeView_1 = require("./treeView");
const commands_1 = require("./commands");
let statusBar;
async function activate(context) {
    const folder = vscode.workspace.workspaceFolders?.[0];
    // Set context key for conditional UI
    const hasPlanning = folder
        ? await fileExists(vscode.Uri.joinPath(folder.uri, '.planning'))
        : false;
    await vscode.commands.executeCommand('setContext', 'gsd:hasPlanning', hasPlanning);
    // Watch for .planning/ creation/deletion to toggle UI
    if (folder) {
        const planningWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, '.planning'));
        planningWatcher.onDidCreate(() => vscode.commands.executeCommand('setContext', 'gsd:hasPlanning', true));
        planningWatcher.onDidDelete(() => vscode.commands.executeCommand('setContext', 'gsd:hasPlanning', false));
        context.subscriptions.push(planningWatcher);
    }
    // Status bar
    statusBar = new statusBar_1.GsdStatusBar();
    statusBar.activate(context);
    // Tree view
    const treeProvider = new treeView_1.GsdTreeViewProvider();
    treeProvider.activate(context);
    // Commands
    (0, commands_1.registerCommands)(context);
    // MCP server provider — dynamically registers the bundled GSD MCP server
    if (typeof vscode.lm?.registerMcpServerDefinitionProvider === 'function') {
        const mcpServerPath = vscode.Uri.joinPath(context.extensionUri, 'mcp-server', 'gsd-mcp-server.js');
        context.subscriptions.push(vscode.lm.registerMcpServerDefinitionProvider('gsd-tools', {
            provideMcpServerDefinitions: () => {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
                return [
                    new vscode.McpStdioServerDefinition('GSD Tools', 'node', [mcpServerPath.fsPath], { GSD_WORKSPACE: workspaceFolder }, '1.0.0'),
                ];
            },
        }));
    }
}
function deactivate() {
    statusBar?.dispose();
    statusBar = undefined;
}
async function fileExists(uri) {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=extension.js.map