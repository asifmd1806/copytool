import * as vscode from 'vscode';
import * as path from 'path';
import minimatch from 'minimatch';
import { ClipboardEntry, CopyToolConfig, FileProcessor } from '../types';
import { ClipboardService } from './clipboard-service';

export class FileProcessorService implements FileProcessor {
    constructor(
        private clipboardService: ClipboardService,
        private outputChannel: vscode.OutputChannel
    ) {}

    public async processFile(
        fileUri: vscode.Uri,
        workspaceFolder: vscode.WorkspaceFolder,
        _format: string
    ): Promise<void> {
        try {
            const content = await vscode.workspace.fs.readFile(fileUri);
            const relativePath = path.relative(workspaceFolder.uri.fsPath, fileUri.fsPath);

            const entry: ClipboardEntry = {
                relativePath,
                content: content.toString(),
                timestamp: Date.now()
            };

            await this.clipboardService.addToClipboard(entry);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.log(`Error processing file ${fileUri.fsPath}: ${errorMessage}`, 'error');
            throw error;
        }
    }

    public async processDirectory(
        dirUri: vscode.Uri,
        workspaceFolder: vscode.WorkspaceFolder,
        config: CopyToolConfig
    ): Promise<void> {
        try {
            const files = await vscode.workspace.fs.readDirectory(dirUri);
            
            for (const [name, type] of files) {
                const fullPath = path.join(dirUri.fsPath, name);
                const fileUri = vscode.Uri.file(fullPath);
                const relativePath = path.relative(workspaceFolder.uri.fsPath, fullPath);

                const isAllowed = config.allowlist.some(pattern => minimatch(relativePath, pattern));
                const isBlocked = config.blocklist.some(pattern => minimatch(relativePath, pattern));

                if (!isAllowed || isBlocked) {
                    this.log(`Skipping ${relativePath} (filtered by patterns)`, 'warning');
                    continue;
                }

                if (type === vscode.FileType.Directory) {
                    await this.processDirectory(fileUri, workspaceFolder, config);
                } else {
                    await this.processFile(fileUri, workspaceFolder, config.format);
                }
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.log(`Error processing directory ${dirUri.fsPath}: ${errorMessage}`, 'error');
            throw error;
        }
    }

    private log(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
        const timestamp = new Date().toISOString();
        const coloredMessage = this.getColoredMessage(message, level);
        this.outputChannel.appendLine(`[${timestamp}] ${coloredMessage}`);
    }

    private getColoredMessage(message: string, level: 'info' | 'warning' | 'error'): string {
        switch (level) {
            case 'info':
                return `\x1b[32m${message}\x1b[0m`; // Green
            case 'warning':
                return `\x1b[33m${message}\x1b[0m`; // Yellow
            case 'error':
                return `\x1b[31m${message}\x1b[0m`; // Red
            default:
                return message;
        }
    }
} 