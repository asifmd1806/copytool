import * as vscode from 'vscode';

export interface ClipboardEntry {
    relativePath: string;
    content: string;
    timestamp: number;
}

export interface ClipboardStore {
    entries: ClipboardEntry[];
    name: string;
}

export interface CopyToolConfig {
    allowlist: string[];
    blocklist: string[];
    format: string;
}

export interface FileProcessor {
    processFile(fileUri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, format: string): Promise<void>;
    processDirectory(dirUri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, config: CopyToolConfig): Promise<void>;
}

export interface CopyList {
    id: string;
    name: string;
    entries: ClipboardEntry[];
    created: number;
    lastModified: number;
}

export class CopyListTreeItem extends vscode.TreeItem {
    constructor(
        public readonly list: CopyList,
        public readonly type: 'list' | 'entry',
        public readonly entry?: ClipboardEntry
    ) {
        super(
            type === 'list' ? list.name : entry!.relativePath,
            type === 'list' ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
        );

        this.tooltip = type === 'list' 
            ? `Created: ${new Date(list.created).toLocaleString()}\nLast Modified: ${new Date(list.lastModified).toLocaleString()}`
            : entry!.relativePath;

        this.iconPath = type === 'list' 
            ? new vscode.ThemeIcon('list-unordered')
            : new vscode.ThemeIcon('file');

        this.contextValue = type;
    }
} 