import * as vscode from 'vscode';
export declare class GsdStatusBar {
    private item;
    private watchers;
    constructor();
    activate(context: vscode.ExtensionContext): void;
    private refresh;
    dispose(): void;
}
