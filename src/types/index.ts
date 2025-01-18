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