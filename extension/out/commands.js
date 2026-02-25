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
exports.registerCommands = registerCommands;
const vscode = __importStar(require("vscode"));
function openCopilotChat(query) {
    vscode.commands.executeCommand('workbench.action.chat.open', { query });
}
function registerCommands(context) {
    context.subscriptions.push(vscode.commands.registerCommand('gsd.newProject', () => {
        openCopilotChat('/gsd-new-project');
    }), vscode.commands.registerCommand('gsd.planPhase', async () => {
        const phase = await vscode.window.showInputBox({
            prompt: 'Phase number to plan',
            placeHolder: 'e.g. 1',
            validateInput: v => /^\d+$/.test(v) ? null : 'Enter a phase number',
        });
        if (phase) {
            openCopilotChat(`/gsd-plan-phase ${phase}`);
        }
    }), vscode.commands.registerCommand('gsd.executePhase', async () => {
        const phase = await vscode.window.showInputBox({
            prompt: 'Phase number to execute',
            placeHolder: 'e.g. 1',
            validateInput: v => /^\d+$/.test(v) ? null : 'Enter a phase number',
        });
        if (phase) {
            openCopilotChat(`/gsd-execute-phase ${phase}`);
        }
    }), vscode.commands.registerCommand('gsd.quick', async () => {
        const desc = await vscode.window.showInputBox({
            prompt: 'Quick task description',
            placeHolder: 'What needs to be done?',
        });
        if (desc) {
            openCopilotChat(`/gsd-quick "${desc}"`);
        }
    }), vscode.commands.registerCommand('gsd.progress', () => {
        openCopilotChat('/gsd-progress');
    }), vscode.commands.registerCommand('gsd.switchProfile', async () => {
        const profile = await vscode.window.showQuickPick([
            { label: 'quality', description: 'Best models, highest token usage' },
            { label: 'balanced', description: 'Good balance of quality and cost' },
            { label: 'budget', description: 'Fastest, lowest cost' },
        ], { placeHolder: 'Select model profile' });
        if (profile) {
            openCopilotChat(`/gsd-set-profile ${profile.label}`);
        }
    }));
}
//# sourceMappingURL=commands.js.map