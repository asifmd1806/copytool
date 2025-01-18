import * as vscode from 'vscode';
import { ClipboardService } from './services/clipboard-service';
import { FileProcessorService } from './services/file-processor';
import { CopyToolConfig } from './types';

export function activate(context: vscode.ExtensionContext) {
    // Initialize services
    const outputChannel = vscode.window.createOutputChannel('Copy Tool');
    const clipboardService = new ClipboardService(outputChannel);
    const fileProcessor = new FileProcessorService(clipboardService, outputChannel);

    // Register commands
    let addToClipboard = vscode.commands.registerCommand('copytool.addToClipboard', async (resource: vscode.Uri) => {
        try {
            const config = vscode.workspace.getConfiguration('copytool');
            const copyToolConfig: CopyToolConfig = {
                allowlist: config.get('allowlist') || ['**/*'],
                blocklist: config.get('blocklist') || ['**/node_modules/**', '**/.git/**'],
                format: config.get('format') || '{filepath-from-the-project directory}\n```\n{content}\n```'
            };

            if (!resource) {
                resource = vscode.window.activeTextEditor?.document.uri!;
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
            } else {
                await fileProcessor.processFile(resource, workspaceFolder, copyToolConfig.format);
            }

            // Show the output channel
            outputChannel.show();
        } catch (error: unknown) {
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
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            outputChannel.appendLine(`Error: ${errorMessage}`);
            vscode.window.showErrorMessage(`Copy Tool error: ${errorMessage}`);
        }
    });

    context.subscriptions.push(addToClipboard, createNewClipboard);
}

export function deactivate() {
    // Cleanup if needed
} 