import * as vscode from 'vscode';
import { ClipboardEntry } from '../types';
import { LoggerService } from './logger-service';

export class ClipboardService {
    private currentClipboard: ClipboardEntry[] = [];
    private readonly MAX_CLIPBOARD_ENTRIES = 50;
    private readonly MAX_CONTENT_SIZE = 1024 * 1024; // 1MB limit per file

    constructor(private logger: LoggerService) {}

    public async setContent(content: string): Promise<void> {
        this.logger.info(`Setting clipboard content (${content.length} bytes)`);
        await vscode.env.clipboard.writeText(content);
    }

    public async addEntry(entry: ClipboardEntry): Promise<void> {
        if (!this.validateEntry(entry)) {
            return;
        }

        this.currentClipboard.push(entry);
        this.logger.info(`Added entry to clipboard (${this.currentClipboard.length}/${this.MAX_CLIPBOARD_ENTRIES} entries)`);
    }

    public async startNewClipboard(entry: ClipboardEntry): Promise<void> {
        if (!this.validateEntry(entry)) {
            return;
        }

        this.currentClipboard = [entry];
        this.logger.info('Started new clipboard with 1 entry');
    }

    public clear(): void {
        const oldLength = this.currentClipboard.length;
        this.currentClipboard = [];
        this.logger.info(`Cleared clipboard (removed ${oldLength} entries)`);
    }

    public getEntries(): ClipboardEntry[] {
        return [...this.currentClipboard];
    }

    public hasSpace(): boolean {
        return this.currentClipboard.length < this.MAX_CLIPBOARD_ENTRIES;
    }

    private validateEntry(entry: ClipboardEntry): boolean {
        if (!entry.content.trim()) {
            this.logger.warning(`Skipping empty file: ${entry.relativePath}`);
            return false;
        }

        if (entry.content.length > this.MAX_CONTENT_SIZE) {
            this.logger.warning(
                `File too large (${Math.round(entry.content.length / 1024)}KB), ` +
                `max size is ${Math.round(this.MAX_CONTENT_SIZE / 1024)}KB: ${entry.relativePath}`
            );
            return false;
        }

        return true;
    }
} 