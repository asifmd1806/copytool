import * as vscode from 'vscode';
import { ClipboardService } from './clipboard-service';
import { ClipboardEntry } from '../types';

export class FileProcessorService {
    constructor(private clipboardService: ClipboardService) {}

    public async processResource(uri: vscode.Uri): Promise<ClipboardEntry[]> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            this.clipboardService.log('File is not in a workspace', 'error');
            return [];
        }

        const stats = await vscode.workspace.fs.stat(uri);
        const entries: ClipboardEntry[] = [];

        if (stats.type === vscode.FileType.Directory) {
            this.clipboardService.log(`Processing directory: ${uri.fsPath}`, 'info');
            const dirEntries = await this.processDirectory(uri, workspaceFolder);
            entries.push(...dirEntries);
        } else {
            this.clipboardService.log(`Processing file: ${uri.fsPath}`, 'info');
            const fileEntry = await this.processFile(uri);
            if (fileEntry) {
                entries.push(fileEntry);
            }
        }

        return entries;
    }

    private async processDirectory(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder): Promise<ClipboardEntry[]> {
        const entries: ClipboardEntry[] = [];
        const files = await vscode.workspace.fs.readDirectory(uri);

        for (const [name, type] of files) {
            const filePath = vscode.Uri.joinPath(uri, name);
            if (type === vscode.FileType.Directory) {
                const subEntries = await this.processDirectory(filePath, workspaceFolder);
                entries.push(...subEntries);
            } else if (type === vscode.FileType.File) {
                const entry = await this.processFile(filePath);
                if (entry) {
                    entries.push(entry);
                }
            }
        }

        return entries;
    }

    private async processFile(uri: vscode.Uri): Promise<ClipboardEntry | null> {
        try {
            const relativePath = vscode.workspace.asRelativePath(uri, false);
            const content = await this.readFile(uri);
            
            return {
                relativePath,
                content
            };
        } catch (error) {
            this.clipboardService.log(`Error processing file ${uri.fsPath}: ${error}`, 'error');
            return null;
        }
    }

    private async readFile(uri: vscode.Uri): Promise<string> {
        const content = await vscode.workspace.fs.readFile(uri);
        return Buffer.from(content).toString('utf-8');
    }
} 