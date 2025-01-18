import * as vscode from 'vscode';
import { ClipboardEntry } from '../types';

export class ClipboardService {
    private currentClipboard: ClipboardEntry[] = [];
    private outputChannel: vscode.OutputChannel;
    private readonly MAX_CLIPBOARD_ENTRIES = 50; // Limit number of entries
    private readonly MAX_CONTENT_SIZE = 1024 * 1024; // 1MB limit per file

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.log('ClipboardService initialized', 'info');
    }

    public async addToNewClipboard(entry: ClipboardEntry): Promise<void> {
        this.log(`Attempting to add to new clipboard: ${entry.relativePath}`, 'info');
        
        if (!this.validateEntry(entry)) {
            this.log('Entry validation failed, skipping', 'warning');
            return;
        }

        // Clear existing entries and add new one
        this.currentClipboard = [entry];
        this.log(`Cleared existing clipboard (${this.currentClipboard.length} entries)`, 'info');
        
        // Format the content for copying
        const formattedContent = this.formatEntry(entry);
        this.log(`Formatted content length: ${formattedContent.length} bytes`, 'info');
        
        await vscode.env.clipboard.writeText(formattedContent);
        this.log(`Content written to clipboard`, 'info');
        
        this.log(`Started new clipboard with: ${entry.relativePath}`, 'info');
    }

    public async addToExistingClipboard(entry: ClipboardEntry): Promise<void> {
        this.log(`Attempting to add to existing clipboard: ${entry.relativePath}`, 'info');
        
        if (!this.validateEntry(entry)) {
            this.log('Entry validation failed, skipping', 'warning');
            return;
        }

        // Check size limit
        if (this.currentClipboard.length >= this.MAX_CLIPBOARD_ENTRIES) {
            this.log(`Clipboard is full (max ${this.MAX_CLIPBOARD_ENTRIES} entries). Starting new clipboard.`, 'warning');
            return this.addToNewClipboard(entry);
        }
        
        // Add to existing entries
        this.currentClipboard.push(entry);
        this.log(`Added entry to clipboard (${this.currentClipboard.length}/${this.MAX_CLIPBOARD_ENTRIES} entries)`, 'info');
        
        // Format all content for copying
        const formattedContent = this.currentClipboard
            .map(e => this.formatEntry(e))
            .join('\n\n');
        
        this.log(`Total formatted content length: ${formattedContent.length} bytes`, 'info');
        await vscode.env.clipboard.writeText(formattedContent);
        this.log(`Content written to clipboard`, 'info');
        
        this.log(`Added ${entry.relativePath} to existing clipboard (${this.currentClipboard.length}/${this.MAX_CLIPBOARD_ENTRIES} entries)`, 'info');
    }

    public clearClipboard(): void {
        const oldLength = this.currentClipboard.length;
        this.currentClipboard = [];
        this.log(`Clipboard cleared (removed ${oldLength} entries)`, 'info');
    }

    public getCurrentClipboardContents(): ClipboardEntry[] {
        this.log(`Getting current clipboard contents (${this.currentClipboard.length} entries)`, 'info');
        return [...this.currentClipboard];
    }

    private validateEntry(entry: ClipboardEntry): boolean {
        this.log(`Validating entry: ${entry.relativePath}`, 'info');
        
        if (!entry.content.trim()) {
            this.log(`Skipping empty file: ${entry.relativePath}`, 'warning');
            return false;
        }

        if (entry.content.length > this.MAX_CONTENT_SIZE) {
            this.log(`File too large (${Math.round(entry.content.length / 1024)}KB), max size is ${Math.round(this.MAX_CONTENT_SIZE / 1024)}KB: ${entry.relativePath}`, 'warning');
            return false;
        }

        this.log(`Entry validation passed: ${entry.relativePath}`, 'info');
        return true;
    }

    private formatEntry(entry: ClipboardEntry): string {
        this.log(`Formatting entry: ${entry.relativePath}`, 'info');
        
        const config = vscode.workspace.getConfiguration('copytool');
        const format = config.get<string>('format') || '{filepath}\n```\n{content}\n```';
        this.log(`Using format template: ${format}`, 'info');

        const formatted = format
            .replace('{filepath}', entry.relativePath)
            .replace('{content}', entry.content);
            
        this.log(`Formatted content length: ${formatted.length} bytes`, 'info');
        return formatted;
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