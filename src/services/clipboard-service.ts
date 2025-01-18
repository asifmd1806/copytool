import * as vscode from 'vscode';
import { ClipboardEntry } from '../types';

export class ClipboardService {
    private currentClipboard: ClipboardEntry[] = [];
    private outputChannel: vscode.OutputChannel;
    private readonly MAX_CLIPBOARD_ENTRIES = 50; // Limit number of entries
    private readonly MAX_CONTENT_SIZE = 1024 * 1024; // 1MB limit per file

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.log('Copy Tool initialized', 'info');
    }

    public async addToNewClipboard(entry: ClipboardEntry): Promise<void> {
        if (!this.validateEntry(entry)) {
            return;
        }

        // Clear existing entries and add new one
        this.currentClipboard = [entry];
        
        // Format the content for copying
        const formattedContent = this.formatEntry(entry);
        await vscode.env.clipboard.writeText(formattedContent);
        
        this.log(`Started new clipboard with: ${entry.relativePath}`, 'info');
    }

    public async addToExistingClipboard(entry: ClipboardEntry): Promise<void> {
        if (!this.validateEntry(entry)) {
            return;
        }

        // Check size limit
        if (this.currentClipboard.length >= this.MAX_CLIPBOARD_ENTRIES) {
            this.log(`Clipboard is full (max ${this.MAX_CLIPBOARD_ENTRIES} entries). Starting new clipboard.`, 'warning');
            return this.addToNewClipboard(entry);
        }
        
        // Add to existing entries
        this.currentClipboard.push(entry);
        
        // Format all content for copying
        const formattedContent = this.currentClipboard
            .map(e => this.formatEntry(e))
            .join('\n\n');
        
        await vscode.env.clipboard.writeText(formattedContent);
        
        this.log(`Added ${entry.relativePath} to existing clipboard (${this.currentClipboard.length}/${this.MAX_CLIPBOARD_ENTRIES} entries)`, 'info');
    }

    public clearClipboard(): void {
        this.currentClipboard = [];
        this.log('Clipboard cleared', 'info');
    }

    public getCurrentClipboardContents(): ClipboardEntry[] {
        return [...this.currentClipboard];
    }

    private validateEntry(entry: ClipboardEntry): boolean {
        if (!entry.content.trim()) {
            this.log(`Skipping empty file: ${entry.relativePath}`, 'warning');
            return false;
        }

        if (entry.content.length > this.MAX_CONTENT_SIZE) {
            this.log(`File too large (${Math.round(entry.content.length / 1024)}KB), max size is ${Math.round(this.MAX_CONTENT_SIZE / 1024)}KB: ${entry.relativePath}`, 'warning');
            return false;
        }

        return true;
    }

    private formatEntry(entry: ClipboardEntry): string {
        const config = vscode.workspace.getConfiguration('copytool');
        const format = config.get<string>('format') || '{filepath}\n```\n{content}\n```';

        return format
            .replace('{filepath}', entry.relativePath)
            .replace('{content}', entry.content);
    }

    public log(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
        const timestamp = new Date().toISOString();
        const coloredMessage = this.getColoredMessage(message, level);
        this.outputChannel.appendLine(`[${timestamp}] ${coloredMessage}`);
        
        // Also show error messages in the UI
        if (level === 'error') {
            vscode.window.showErrorMessage(message);
        } else if (level === 'warning') {
            vscode.window.showWarningMessage(message);
        } else {
            vscode.window.showInformationMessage(message);
        }
    }

    private getColoredMessage(message: string, level: 'info' | 'warning' | 'error'): string {
        switch (level) {
            case 'info':
                return `[INFO] ${message}`;
            case 'warning':
                return `[WARNING] ${message}`;
            case 'error':
                return `[ERROR] ${message}`;
            default:
                return message;
        }
    }
} 