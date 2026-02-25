import * as vscode from 'vscode';
import { parseStateMd, parseRoadmapMd } from './stateParser';

export class GsdStatusBar {
  private item: vscode.StatusBarItem;
  private watchers: vscode.FileSystemWatcher[] = [];

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
    this.item.command = 'gsd.progress';
    this.item.tooltip = 'Click to show GSD progress';
  }

  activate(context: vscode.ExtensionContext): void {
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

  private async refresh(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      this.item.hide();
      return;
    }

    const stateUri = vscode.Uri.joinPath(folder.uri, '.planning', 'STATE.md');
    let stateContent: string;
    try {
      const bytes = await vscode.workspace.fs.readFile(stateUri);
      stateContent = Buffer.from(bytes).toString('utf-8');
    } catch {
      this.item.hide();
      return;
    }

    const state = parseStateMd(stateContent);
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
    } else if (status.includes('execut') || status.includes('active')) {
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.item.backgroundColor = undefined;
    }

    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
    for (const w of this.watchers) {
      w.dispose();
    }
  }
}
