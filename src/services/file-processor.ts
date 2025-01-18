import * as vscode from 'vscode';
import { ClipboardService } from './clipboard-service';
import { ClipboardEntry } from '../types';
import * as path from 'path';
import { Minimatch } from 'minimatch';

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
            if (await this.shouldProcessFile(uri, workspaceFolder)) {
                const fileEntry = await this.processFile(uri);
                if (fileEntry) {
                    entries.push(fileEntry);
                }
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
                if (await this.shouldProcessFile(filePath, workspaceFolder)) {
                    const entry = await this.processFile(filePath);
                    if (entry) {
                        entries.push(entry);
                    }
                }
            }
        }

        return entries;
    }

    private async shouldProcessFile(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('copytool');
        const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath).replace(/\\/g, '/');

        // Check allowlist if enabled
        const enableAllowlists = config.get<boolean>('enableAllowlists', false);
        if (enableAllowlists) {
            const allowlistPatterns = config.get<string>('allowlistPatterns', '**/*')
                .split('\n')
                .map(p => p.trim())
                .filter(p => p);

            const matchesAllowlist = allowlistPatterns.some(pattern => {
                const mm = new Minimatch(pattern, { dot: true });
                return mm.match(relativePath);
            });

            if (!matchesAllowlist) {
                this.clipboardService.log(`Skipping ${relativePath} (not in allowlist)`, 'info');
                return false;
            }
        }

        // Check blocklist if enabled
        const enableBlocklists = config.get<boolean>('enableBlocklists', true);
        if (enableBlocklists) {
            const blocklistPatterns = config.get<string>('blocklistPatterns', '**/node_modules/**\n**/.git/**')
                .split('\n')
                .map(p => p.trim())
                .filter(p => p);

            const matchesBlocklist = blocklistPatterns.some(pattern => {
                const mm = new Minimatch(pattern, { dot: true });
                return mm.match(relativePath);
            });

            if (matchesBlocklist) {
                this.clipboardService.log(`Skipping ${relativePath} (matches blocklist)`, 'info');
                return false;
            }
        }

        return true;
    }

    private async processFile(uri: vscode.Uri): Promise<ClipboardEntry | null> {
        try {
            const relativePath = vscode.workspace.asRelativePath(uri, false);
            const content = await this.readFile(uri);
            
            return {
                relativePath,
                content,
                timestamp: Date.now()
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