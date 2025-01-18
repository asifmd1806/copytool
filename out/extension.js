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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const clipboard_service_1 = require("./services/clipboard-service");
const file_processor_1 = require("./services/file-processor");
function activate(context) {
    // Initialize services
    const outputChannel = vscode.window.createOutputChannel('Copy Tool');
    const clipboardService = new clipboard_service_1.ClipboardService(outputChannel);
    const fileProcessor = new file_processor_1.FileProcessorService(clipboardService, outputChannel);
    // Register commands
    let addToClipboard = vscode.commands.registerCommand('copytool.addToClipboard', async (resource) => {
        try {
            const config = vscode.workspace.getConfiguration('copytool');
            const copyToolConfig = {
                allowlist: config.get('allowlist') || ['**/*'],
                blocklist: config.get('blocklist') || ['**/node_modules/**', '**/.git/**'],
                format: config.get('format') || '{filepath-from-the-project directory}\n```\n{content}\n```'
            };
            if (!resource) {
                resource = vscode.window.activeTextEditor?.document.uri;
            }
            if (!resource) {
                throw new Error('No file selected');
            }
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(resource);
            if (!workspaceFolder) {
                throw new Error('File is not in a workspace');
            }
            const stats = await vscode.workspace.fs.stat(resource);
            if (stats.type === vscode.FileType.Directory) {
                await fileProcessor.processDirectory(resource, workspaceFolder, copyToolConfig);
            }
            else {
                await fileProcessor.processFile(resource, workspaceFolder, copyToolConfig.format);
            }
            // Show the output channel
            outputChannel.show();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            outputChannel.appendLine(`Error: ${errorMessage}`);
            vscode.window.showErrorMessage(`Copy Tool error: ${errorMessage}`);
        }
    });
    let createNewClipboard = vscode.commands.registerCommand('copytool.createNewClipboard', async () => {
        try {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter name for new clipboard',
                placeHolder: 'clipboard name',
                validateInput: (value) => {
                    return value && value.trim().length > 0 ? null : 'Please enter a valid name';
                }
            });
            if (name) {
                await clipboardService.createNewClipboard(name.trim());
                outputChannel.show();
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            outputChannel.appendLine(`Error: ${errorMessage}`);
            vscode.window.showErrorMessage(`Copy Tool error: ${errorMessage}`);
        }
    });
    context.subscriptions.push(addToClipboard, createNewClipboard);
}
exports.activate = activate;
function deactivate() {
    // Cleanup if needed
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map