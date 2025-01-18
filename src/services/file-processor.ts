import * as vscode from 'vscode';
import { ClipboardService } from './clipboard-service';
import { ClipboardEntry } from '../types';
import * as path from 'path';
import { Minimatch } from 'minimatch';

export class FileProcessorService {
    constructor(private clipboardService: ClipboardService) {
        this.clipboardService.log('FileProcessorService initialized', 'info');
    }

    public async processResource(uri: vscode.Uri): Promise<ClipboardEntry[]> {
        this.clipboardService.log(`Starting to process resource: ${uri.fsPath}`, 'info');
        
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            this.clipboardService.log('File is not in a workspace', 'error');
            return [];
        }
        this.clipboardService.log(`Found workspace folder: ${workspaceFolder.uri.fsPath}`, 'info');

        const stats = await vscode.workspace.fs.stat(uri);
        const entries: ClipboardEntry[] = [];

        if (stats.type === vscode.FileType.Directory) {
            this.clipboardService.log(`Processing directory: ${uri.fsPath}`, 'info');
            const dirEntries = await this.processDirectory(uri, workspaceFolder);
            this.clipboardService.log(`Found ${dirEntries.length} entries in directory`, 'info');
            
            // Process first entry differently
            if (dirEntries.length > 0) {
                await this.clipboardService.addToNewClipboard(dirEntries[0]);
                
                // Process remaining entries
                for (let i = 1; i < dirEntries.length; i++) {
                    await this.clipboardService.addToExistingClipboard(dirEntries[i]);
                }
            }
            
            entries.push(...dirEntries);
        } else {
            this.clipboardService.log(`Processing file: ${uri.fsPath}`, 'info');
            if (await this.shouldProcessFile(uri, workspaceFolder)) {
                const fileEntry = await this.processFile(uri);
                if (fileEntry) {
                    await this.clipboardService.addToNewClipboard(fileEntry);
                    entries.push(fileEntry);
                    this.clipboardService.log(`Successfully processed file: ${uri.fsPath}`, 'info');
                } else {
                    this.clipboardService.log(`Failed to process file: ${uri.fsPath}`, 'warning');
                }
            } else {
                this.clipboardService.log(`Skipping file due to filters: ${uri.fsPath}`, 'info');
            }
        }

        this.clipboardService.log(`Finished processing resource. Total entries: ${entries.length}`, 'info');
        return entries;
    }

    private async processDirectory(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder): Promise<ClipboardEntry[]> {
        this.clipboardService.log(`Starting to process directory: ${uri.fsPath}`, 'info');
        const entries: ClipboardEntry[] = [];
        
        try {
            const files = await vscode.workspace.fs.readDirectory(uri);
            this.clipboardService.log(`Found ${files.length} items in directory: ${uri.fsPath}`, 'info');

            for (const [name, type] of files) {
                const filePath = vscode.Uri.joinPath(uri, name);
                this.clipboardService.log(`Processing item: ${name} (${type === vscode.FileType.Directory ? 'directory' : 'file'})`, 'info');
                
                if (type === vscode.FileType.Directory) {
                    const subEntries = await this.processDirectory(filePath, workspaceFolder);
                    this.clipboardService.log(`Found ${subEntries.length} entries in subdirectory: ${name}`, 'info');
                    entries.push(...subEntries);
                } else if (type === vscode.FileType.File) {
                    if (await this.shouldProcessFile(filePath, workspaceFolder)) {
                        const entry = await this.processFile(filePath);
                        if (entry) {
                            entries.push(entry);
                            this.clipboardService.log(`Added file to entries: ${name}`, 'info');
                        }
                    } else {
                        this.clipboardService.log(`Skipping file due to filters: ${name}`, 'info');
                    }
                }
            }
        } catch (error) {
            this.clipboardService.log(`Error reading directory ${uri.fsPath}: ${error}`, 'error');
        }

        this.clipboardService.log(`Finished processing directory. Total entries: ${entries.length}`, 'info');
        return entries;
    }

    private async shouldProcessFile(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('copytool');
        const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath).replace(/\\/g, '/');
        this.clipboardService.log(`Checking filters for file: ${relativePath}`, 'info');

        // Check allowlist if enabled
        const enableAllowlists = config.get<boolean>('enableAllowlists', false);
        if (enableAllowlists) {
            const allowlistPatterns = config.get<string>('allowlistPatterns', '**/*')
                .split('\n')
                .map(p => p.trim())
                .filter(p => p);

            this.clipboardService.log(`Checking against ${allowlistPatterns.length} allowlist patterns`, 'info');
            const matchesAllowlist = allowlistPatterns.some(pattern => {
                const mm = new Minimatch(pattern, { dot: true });
                const matches = mm.match(relativePath);
                if (matches) {
                    this.clipboardService.log(`File matches allowlist pattern: ${pattern}`, 'info');
                }
                return matches;
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

            this.clipboardService.log(`Checking against ${blocklistPatterns.length} blocklist patterns`, 'info');
            const matchesBlocklist = blocklistPatterns.some(pattern => {
                const mm = new Minimatch(pattern, { dot: true });
                const matches = mm.match(relativePath);
                if (matches) {
                    this.clipboardService.log(`File matches blocklist pattern: ${pattern}`, 'info');
                }
                return matches;
            });

            if (matchesBlocklist) {
                this.clipboardService.log(`Skipping ${relativePath} (matches blocklist)`, 'info');
                return false;
            }
        }

        this.clipboardService.log(`File passed all filters: ${relativePath}`, 'info');
        return true;
    }

    private async processFile(uri: vscode.Uri): Promise<ClipboardEntry | null> {
        try {
            this.clipboardService.log(`Reading file content: ${uri.fsPath}`, 'info');
            const relativePath = vscode.workspace.asRelativePath(uri, false);
            const content = await this.readFile(uri);
            
            this.clipboardService.log(`Successfully read file: ${relativePath} (${content.length} bytes)`, 'info');
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
        const text = Buffer.from(content).toString('utf-8');
        this.clipboardService.log(`Read ${text.length} bytes from file: ${uri.fsPath}`, 'info');
        return text;
    }
} 