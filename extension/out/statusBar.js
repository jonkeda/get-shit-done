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
exports.GsdStatusBar = void 0;
const vscode = __importStar(require("vscode"));
const stateParser_1 = require("./stateParser");
class GsdStatusBar {
    constructor() {
        this.watchers = [];
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
        this.item.command = 'gsd.progress';
        this.item.tooltip = 'Click to show GSD progress';
    }
    activate(context) {
        context.subscriptions.push(this.item);
        this.refresh();
        const stateWatcher = vscode.workspace.createFileSystemWatcher('**/.planning/STATE.md');
        const roadmapWatcher = vscode.workspace.createFileSystemWatcher('**/.planning/ROADMAP.md');
        const refresh = () => this.refresh();
        stateWatcher.onDidChange(refresh);
        stateWatcher.onDidCreate(refresh);
        stateWatcher.onDidDelete(refresh);
        roadmapWatcher.onDidChange(refresh);
        roadmapWatcher.onDidCreate(refresh);
        roadmapWatcher.onDidDelete(refresh);
        this.watchers.push(stateWatcher, roadmapWatcher);
        context.subscriptions.push(stateWatcher, roadmapWatcher);
    }
    async refresh() {
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
            this.item.hide();
            return;
        }
        const stateUri = vscode.Uri.joinPath(folder.uri, '.planning', 'STATE.md');
        let stateContent;
        try {
            const bytes = await vscode.workspace.fs.readFile(stateUri);
            stateContent = Buffer.from(bytes).toString('utf-8');
        }
        catch {
            this.item.hide();
            return;
        }
        const state = (0, stateParser_1.parseStateMd)(stateContent);
        const phaseText = state.phase != null
            ? `Phase ${state.phase}${state.totalPhases ? '/' + state.totalPhases : ''}`
            : 'No phase';
        const planText = state.plan != null ? `Plan ${state.plan}` : '';
        const parts = [phaseText, planText].filter(Boolean).join(' | ');
        this.item.text = `$(rocket) GSD: ${parts}`;
        // Color-code by status
        const status = (state.status || '').toLowerCase();
        if (status.includes('block')) {
            this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
        else if (status.includes('execut') || status.includes('active')) {
            this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
        else {
            this.item.backgroundColor = undefined;
        }
        this.item.show();
    }
    dispose() {
        this.item.dispose();
        for (const w of this.watchers) {
            w.dispose();
        }
    }
}
exports.GsdStatusBar = GsdStatusBar;
//# sourceMappingURL=statusBar.js.map