import * as vscode from 'vscode';
import { ClipboardEntry } from '../types';

export class ClipboardService {
    private currentClipboard: ClipboardEntry[] = [];
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.outputChannel.show(true);
        this.log('Copy Tool initialized', 'info');
    }

    public async addToNewClipboard(entry: ClipboardEntry): Promise<void> {
        // Clear existing entries and add new one
        this.currentClipboard = [entry];
        
        // Format the content for copying
        const formattedContent = this.formatEntry(entry);
        await vscode.env.clipboard.writeText(formattedContent);
        
        this.log(`Started new clipboard with: ${entry.relativePath}`, 'info');
        this.outputChannel.show(true);
    }

    public async addToExistingClipboard(entry: ClipboardEntry): Promise<void> {
        // Add to existing entries
        this.currentClipboard.push(entry);
        
        // Format all content for copying
        const formattedContent = this.currentClipboard
            .map(e => this.formatEntry(e))
            .join('\n\n');
        
        await vscode.env.clipboard.writeText(formattedContent);
        
        this.log(`Added ${entry.relativePath} to existing clipboard`, 'info');
        this.outputChannel.show(true);
    }

    public getCurrentClipboardContents(): ClipboardEntry[] {
        return [...this.currentClipboard];
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