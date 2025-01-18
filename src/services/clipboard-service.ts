import * as vscode from 'vscode';
import { ClipboardEntry, ClipboardStore } from '../types';

export class ClipboardService {
    private clipboards: Map<string, ClipboardStore>;
    private currentClipboard: string;
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.clipboards = new Map();
        this.currentClipboard = 'default';
        this.outputChannel = outputChannel;
        this.initializeDefaultClipboard();
    }

    private initializeDefaultClipboard() {
        this.clipboards.set('default', {
            entries: [],
            name: 'default'
        });
    }

    public getCurrentClipboard(): string {
        return this.currentClipboard;
    }

    public async createNewClipboard(name: string): Promise<void> {
        if (this.clipboards.has(name)) {
            throw new Error(`Clipboard "${name}" already exists`);
        }

        this.clipboards.set(name, {
            entries: [],
            name
        });
        this.currentClipboard = name;
        this.log(`Created new clipboard: ${name}`, 'info');
    }

    public async addToClipboard(entry: ClipboardEntry): Promise<void> {
        const clipboard = this.clipboards.get(this.currentClipboard);
        if (!clipboard) {
            throw new Error(`Clipboard "${this.currentClipboard}" not found`);
        }

        clipboard.entries.push(entry);
        
        // Format the content for copying
        const formattedContent = this.formatEntry(entry);
        await vscode.env.clipboard.writeText(formattedContent);
        
        this.log(`Added ${entry.relativePath} to clipboard: ${this.currentClipboard}`, 'info');
    }

    public getClipboardContents(name?: string): ClipboardEntry[] {
        const clipboardName = name || this.currentClipboard;
        const clipboard = this.clipboards.get(clipboardName);
        if (!clipboard) {
            throw new Error(`Clipboard "${clipboardName}" not found`);
        }
        return clipboard.entries;
    }

    private formatEntry(entry: ClipboardEntry): string {
        const config = vscode.workspace.getConfiguration('copytool');
        const format = config.get<string>('format') || '{filepath-from-the-project directory}\n```\n{content}\n```';

        return format
            .replace('{filepath-from-the-project directory}', entry.relativePath)
            .replace('{content}', entry.content);
    }

    private log(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
        const timestamp = new Date().toISOString();
        const coloredMessage = this.getColoredMessage(message, level);
        this.outputChannel.appendLine(`[${timestamp}] ${coloredMessage}`);
        
        // Also show error messages in the UI
        if (level === 'error') {
            vscode.window.showErrorMessage(message);
        }
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