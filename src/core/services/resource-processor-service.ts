import * as vscode from 'vscode';
import { ClipboardEntry } from '../types';
import { LoggerService } from './logger-service';
import { FileService } from './file-service';
import { FilterService } from './filter-service';
import { ClipboardService } from './clipboard-service';
import { ContentFormatterService } from './content-formatter-service';

export class ResourceProcessorService {
    constructor(
        private logger: LoggerService,
        private fileService: FileService,
        private filterService: FilterService,
        private clipboardService: ClipboardService,
        private formatter: ContentFormatterService
    ) {}

    public async processResource(uri: vscode.Uri): Promise<ClipboardEntry[]> {
        this.logger.info(`Starting to process resource: ${uri.fsPath}`);
        
        const workspaceFolder = this.fileService.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            this.logger.error('File is not in a workspace');
            return [];
        }

        const stats = await vscode.workspace.fs.stat(uri);
        const entries: ClipboardEntry[] = [];

        if (stats.type === vscode.FileType.Directory) {
            const dirEntries = await this.processDirectory(uri, workspaceFolder);
            
            // Start with a new clipboard
            if (dirEntries.length > 0) {
                await this.clipboardService.startNewClipboard(dirEntries[0]);
                
                // Add remaining entries
                for (let i = 1; i < dirEntries.length; i++) {
                    if (!this.clipboardService.hasSpace()) {
                        this.logger.warning('Clipboard is full, stopping processing');
                        break;
                    }
                    await this.clipboardService.addEntry(dirEntries[i]);
                }
            }
            
            entries.push(...dirEntries);
        } else {
            const fileEntry = await this.processFile(uri, workspaceFolder);
            if (fileEntry) {
                await this.clipboardService.startNewClipboard(fileEntry);
                entries.push(fileEntry);
            }
        }

        // Format and set clipboard content
        if (entries.length > 0) {
            const formattedContent = this.formatter.formatEntries(entries);
            await this.clipboardService.setContent(formattedContent);
        }

        this.logger.info(`Finished processing resource. Total entries: ${entries.length}`);
        return entries;
    }

    private async processDirectory(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder): Promise<ClipboardEntry[]> {
        this.logger.info(`Processing directory: ${uri.fsPath}`);
        const entries: ClipboardEntry[] = [];
        
        try {
            const files = await this.fileService.readDirectory(uri);
            
            for (const [name, type] of files) {
                const filePath = vscode.Uri.joinPath(uri, name);
                
                if (type === vscode.FileType.Directory) {
                    const subEntries = await this.processDirectory(filePath, workspaceFolder);
                    entries.push(...subEntries);
                } else if (type === vscode.FileType.File) {
                    const entry = await this.processFile(filePath, workspaceFolder);
                    if (entry) {
                        entries.push(entry);
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Error reading directory ${uri.fsPath}: ${error}`);
        }

        return entries;
    }

    private async processFile(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder): Promise<ClipboardEntry | null> {
        const relativePath = this.fileService.getRelativePath(uri, workspaceFolder);
        
        try {
            if (await this.filterService.shouldProcessFile(relativePath)) {
                const content = await this.fileService.readFile(uri);
                return {
                    relativePath,
                    content,
                    timestamp: Date.now()
                };
            }
        } catch (error) {
            this.logger.error(`Error processing file ${uri.fsPath}: ${error}`);
        }
        
        return null;
    }
} 