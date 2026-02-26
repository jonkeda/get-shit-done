import * as vscode from 'vscode';
import * as path from 'path';
import { parseStateMd, parseRoadmapMd, parsePhaseDir, GsdState, RoadmapPhase } from './stateParser';

type ItemKind = 'project' | 'progress' | 'phase' | 'plan' | 'todo' | 'blocker' | 'section';

class GsdTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly kind: ItemKind,
    collapsible: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
    public readonly fileUri?: vscode.Uri,
  ) {
    super(label, collapsible);
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

export class GsdTreeViewProvider implements vscode.TreeDataProvider<GsdTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<GsdTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private state: GsdState = {};
  private phases: RoadmapPhase[] = [];
  private watcher: vscode.FileSystemWatcher | undefined;

  async activate(context: vscode.ExtensionContext): Promise<void> {
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

  async refresh(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) { return; }

    const stateUri = vscode.Uri.joinPath(folder.uri, '.planning', 'STATE.md');
    try {
      const bytes = await vscode.workspace.fs.readFile(stateUri);
      this.state = parseStateMd(Buffer.from(bytes).toString('utf-8'));
    } catch {
      this.state = {};
    }

    const roadmapUri = vscode.Uri.joinPath(folder.uri, '.planning', 'ROADMAP.md');
    try {
      const bytes = await vscode.workspace.fs.readFile(roadmapUri);
      this.phases = parseRoadmapMd(Buffer.from(bytes).toString('utf-8'));
    } catch {
      this.phases = [];
    }

    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: GsdTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: GsdTreeItem): Promise<GsdTreeItem[]> {
    if (!element) {
      return this.getRootItems();
    }

    switch (element.kind) {
      case 'section':
        return this.getSectionChildren(element.label as string);
      case 'phase':
        return this.getPhaseChildren(element);
      default:
        return [];
    }
  }

  private getRootItems(): GsdTreeItem[] {
    const items: GsdTreeItem[] = [];

    // Project name
    if (this.state.milestone) {
      items.push(new GsdTreeItem(
        this.state.milestone,
        'project',
      ));
    }

    // Progress
    if (this.state.progress || this.state.phase != null) {
      const progressText = this.state.progress
        || `Phase ${this.state.phase ?? '?'}${this.state.totalPhases ? '/' + this.state.totalPhases : ''}`;
      items.push(new GsdTreeItem(progressText, 'progress'));
    }

    // Phases section
    if (this.phases.length > 0) {
      items.push(new GsdTreeItem(
        'Phases',
        'section',
        vscode.TreeItemCollapsibleState.Expanded,
      ));
    }

    // Todos section
    if (this.state.todos && this.state.todos.length > 0) {
      items.push(new GsdTreeItem(
        `Todos (${this.state.todos.length})`,
        'section',
        vscode.TreeItemCollapsibleState.Collapsed,
      ));
    }

    // Blockers section
    if (this.state.blockers && this.state.blockers.length > 0) {
      items.push(new GsdTreeItem(
        `Blockers (${this.state.blockers.length})`,
        'section',
        vscode.TreeItemCollapsibleState.Expanded,
      ));
    }

    return items;
  }

  private getSectionChildren(label: string): GsdTreeItem[] {
    if (label === 'Phases' || label.startsWith('Phases')) {
      return this.phases.map(p => {
        const statusIcon = p.status === 'complete' ? '$(check)' :
          p.status === 'active' ? '$(play)' :
          p.status === 'skipped' ? '$(debug-step-over)' : '$(circle-outline)';
        return new GsdTreeItem(
          `${statusIcon} ${p.number}. ${p.name}`,
          'phase',
          vscode.TreeItemCollapsibleState.Collapsed,
        );
      });
    }

    if (label.startsWith('Todos')) {
      return (this.state.todos || []).map(t =>
        new GsdTreeItem(t, 'todo'),
      );
    }

    if (label.startsWith('Blockers')) {
      return (this.state.blockers || []).map(b =>
        new GsdTreeItem(b, 'blocker'),
      );
    }

    return [];
  }

  private async getPhaseChildren(element: GsdTreeItem): Promise<GsdTreeItem[]> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) { return []; }

    // Extract phase number from label like "$(icon) 1. Name"
    const numMatch = (element.label as string).match(/(\d+)\./);
    if (!numMatch) { return []; }
    const phaseNum = numMatch[1].padStart(2, '0');

    // Find matching phase directory
    const phasesDir = vscode.Uri.joinPath(folder.uri, '.planning', 'phases');
    try {
      const entries = await vscode.workspace.fs.readDirectory(phasesDir);
      for (const [name, type] of entries) {
        if (type === vscode.FileType.Directory && name.startsWith(phaseNum + '-')) {
          const dirUri = vscode.Uri.joinPath(phasesDir, name);
          const plans = await parsePhaseDir(dirUri);
          return plans.map(p =>
            new GsdTreeItem(p.name, 'plan', vscode.TreeItemCollapsibleState.None, p.uri),
          );
        }
      }
    } catch {
      // phases dir may not exist
    }

    return [];
  }
}
