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
exports.GsdTreeViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const stateParser_1 = require("./stateParser");
class GsdTreeItem extends vscode.TreeItem {
    constructor(label, kind, collapsible = vscode.TreeItemCollapsibleState.None, fileUri) {
        super(label, collapsible);
        this.kind = kind;
        this.fileUri = fileUri;
        this.contextValue = kind;
        switch (kind) {
            case 'project':
                this.iconPath = new vscode.ThemeIcon('project');
                break;
            case 'progress':
                this.iconPath = new vscode.ThemeIcon('graph');
                break;
            case 'phase':
                this.iconPath = new vscode.ThemeIcon('target');
                break;
            case 'plan':
                this.iconPath = new vscode.ThemeIcon('file-text');
                if (fileUri) {
                    this.command = {
                        command: 'vscode.open',
                        title: 'Open Plan',
                        arguments: [fileUri],
                    };
                }
                break;
            case 'todo':
                this.iconPath = new vscode.ThemeIcon('checklist');
                break;
            case 'blocker':
                this.iconPath = new vscode.ThemeIcon('bug');
                break;
            case 'section':
                this.iconPath = new vscode.ThemeIcon('symbol-folder');
                break;
        }
    }
}
class GsdTreeViewProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.state = {};
        this.phases = [];
    }
    async activate(context) {
        // Pre-load state so the tree view is populated on first render.
        // Without this, VS Code calls getChildren() before the async refresh()
        // completes, resulting in an empty tree if the panel isn't visible when
        // the _onDidChangeTreeData event fires.
        await this.refresh();
        const treeView = vscode.window.createTreeView('gsdProjectView', {
            treeDataProvider: this,
            showCollapseAll: true,
        });
        context.subscriptions.push(treeView);
        this.watcher = vscode.workspace.createFileSystemWatcher('**/.planning/**');
        this.watcher.onDidChange(() => this.refresh());
        this.watcher.onDidCreate(() => this.refresh());
        this.watcher.onDidDelete(() => this.refresh());
        context.subscriptions.push(this.watcher);
    }
    async refresh() {
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
            return;
        }
        const stateUri = vscode.Uri.joinPath(folder.uri, '.planning', 'STATE.md');
        try {
            const bytes = await vscode.workspace.fs.readFile(stateUri);
            this.state = (0, stateParser_1.parseStateMd)(Buffer.from(bytes).toString('utf-8'));
        }
        catch {
            this.state = {};
        }
        const roadmapUri = vscode.Uri.joinPath(folder.uri, '.planning', 'ROADMAP.md');
        try {
            const bytes = await vscode.workspace.fs.readFile(roadmapUri);
            this.phases = (0, stateParser_1.parseRoadmapMd)(Buffer.from(bytes).toString('utf-8'));
        }
        catch {
            this.phases = [];
        }
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            return this.getRootItems();
        }
        switch (element.kind) {
            case 'section':
                return this.getSectionChildren(element.label);
            case 'phase':
                return this.getPhaseChildren(element);
            default:
                return [];
        }
    }
    getRootItems() {
        const items = [];
        // Project name
        if (this.state.milestone) {
            items.push(new GsdTreeItem(this.state.milestone, 'project'));
        }
        // Progress
        if (this.state.progress || this.state.phase != null) {
            const progressText = this.state.progress
                || `Phase ${this.state.phase ?? '?'}${this.state.totalPhases ? '/' + this.state.totalPhases : ''}`;
            items.push(new GsdTreeItem(progressText, 'progress'));
        }
        // Phases section
        if (this.phases.length > 0) {
            items.push(new GsdTreeItem('Phases', 'section', vscode.TreeItemCollapsibleState.Expanded));
        }
        // Todos section
        if (this.state.todos && this.state.todos.length > 0) {
            items.push(new GsdTreeItem(`Todos (${this.state.todos.length})`, 'section', vscode.TreeItemCollapsibleState.Collapsed));
        }
        // Blockers section
        if (this.state.blockers && this.state.blockers.length > 0) {
            items.push(new GsdTreeItem(`Blockers (${this.state.blockers.length})`, 'section', vscode.TreeItemCollapsibleState.Expanded));
        }
        return items;
    }
    getSectionChildren(label) {
        if (label === 'Phases' || label.startsWith('Phases')) {
            return this.phases.map(p => {
                const statusIcon = p.status === 'complete' ? '$(check)' :
                    p.status === 'active' ? '$(play)' :
                        p.status === 'skipped' ? '$(debug-step-over)' : '$(circle-outline)';
                return new GsdTreeItem(`${statusIcon} ${p.number}. ${p.name}`, 'phase', vscode.TreeItemCollapsibleState.Collapsed);
            });
        }
        if (label.startsWith('Todos')) {
            return (this.state.todos || []).map(t => new GsdTreeItem(t, 'todo'));
        }
        if (label.startsWith('Blockers')) {
            return (this.state.blockers || []).map(b => new GsdTreeItem(b, 'blocker'));
        }
        return [];
    }
    async getPhaseChildren(element) {
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
            return [];
        }
        // Extract phase number from label like "$(icon) 1. Name"
        const numMatch = element.label.match(/(\d+)\./);
        if (!numMatch) {
            return [];
        }
        const phaseNum = numMatch[1].padStart(2, '0');
        // Find matching phase directory
        const phasesDir = vscode.Uri.joinPath(folder.uri, '.planning', 'phases');
        try {
            const entries = await vscode.workspace.fs.readDirectory(phasesDir);
            for (const [name, type] of entries) {
                if (type === vscode.FileType.Directory && name.startsWith(phaseNum + '-')) {
                    const dirUri = vscode.Uri.joinPath(phasesDir, name);
                    const plans = await (0, stateParser_1.parsePhaseDir)(dirUri);
                    return plans.map(p => new GsdTreeItem(p.name, 'plan', vscode.TreeItemCollapsibleState.None, p.uri));
                }
            }
        }
        catch {
            // phases dir may not exist
        }
        return [];
    }
}
exports.GsdTreeViewProvider = GsdTreeViewProvider;
//# sourceMappingURL=treeView.js.map