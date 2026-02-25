import * as vscode from 'vscode';
type ItemKind = 'project' | 'progress' | 'phase' | 'plan' | 'todo' | 'blocker' | 'section';
declare class GsdTreeItem extends vscode.TreeItem {
    readonly kind: ItemKind;
    readonly fileUri?: vscode.Uri | undefined;
    constructor(label: string, kind: ItemKind, collapsible?: vscode.TreeItemCollapsibleState, fileUri?: vscode.Uri | undefined);
}
export declare class GsdTreeViewProvider implements vscode.TreeDataProvider<GsdTreeItem> {
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<void | GsdTreeItem | undefined>;
    private state;
    private phases;
    private watcher;
    activate(context: vscode.ExtensionContext): void;
    refresh(): Promise<void>;
    getTreeItem(element: GsdTreeItem): vscode.TreeItem;
    getChildren(element?: GsdTreeItem): Promise<GsdTreeItem[]>;
    private getRootItems;
    private getSectionChildren;
    private getPhaseChildren;
}
export {};
