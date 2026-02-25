import * as vscode from 'vscode';

function openCopilotChat(query: string): void {
  vscode.commands.executeCommand('workbench.action.chat.open', { query });
}

export function registerCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('gsd.newProject', () => {
      openCopilotChat('/gsd-new-project');
    }),

    vscode.commands.registerCommand('gsd.planPhase', async () => {
      const phase = await vscode.window.showInputBox({
        prompt: 'Phase number to plan',
        placeHolder: 'e.g. 1',
        validateInput: v => /^\d+$/.test(v) ? null : 'Enter a phase number',
      });
      if (phase) {
        openCopilotChat(`/gsd-plan-phase ${phase}`);
      }
    }),

    vscode.commands.registerCommand('gsd.executePhase', async () => {
      const phase = await vscode.window.showInputBox({
        prompt: 'Phase number to execute',
        placeHolder: 'e.g. 1',
        validateInput: v => /^\d+$/.test(v) ? null : 'Enter a phase number',
      });
      if (phase) {
        openCopilotChat(`/gsd-execute-phase ${phase}`);
      }
    }),

    vscode.commands.registerCommand('gsd.quick', async () => {
      const desc = await vscode.window.showInputBox({
        prompt: 'Quick task description',
        placeHolder: 'What needs to be done?',
      });
      if (desc) {
        openCopilotChat(`/gsd-quick "${desc}"`);
      }
    }),

    vscode.commands.registerCommand('gsd.progress', () => {
      openCopilotChat('/gsd-progress');
    }),

    vscode.commands.registerCommand('gsd.switchProfile', async () => {
      const profile = await vscode.window.showQuickPick(
        [
          { label: 'quality', description: 'Best models, highest token usage' },
          { label: 'balanced', description: 'Good balance of quality and cost' },
          { label: 'budget', description: 'Fastest, lowest cost' },
        ],
        { placeHolder: 'Select model profile' },
      );
      if (profile) {
        openCopilotChat(`/gsd-set-profile ${profile.label}`);
      }
    }),
  );
}
