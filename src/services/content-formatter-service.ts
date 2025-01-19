import * as vscode from 'vscode';
import { ClipboardEntry } from '../types';
import { LoggerService } from './logger-service';

export class ContentFormatterService {
    constructor(private logger: LoggerService) {}

    public formatEntries(entries: ClipboardEntry[]): string {
        this.logger.info(`Formatting ${entries.length} entries`);
        return entries.map(entry => this.formatEntry(entry)).join('\n\n');
    }

    private formatEntry(entry: ClipboardEntry): string {
        this.logger.info(`Formatting entry: ${entry.relativePath}`);
        
        const config = vscode.workspace.getConfiguration('copytool');
        const format = config.get<string>('format') || '{filepath}\n```\n{content}\n```';
        
        const formatted = format
            .replace('{filepath}', entry.relativePath)
            .replace('{content}', entry.content);
            
        this.logger.info(`Formatted content length: ${formatted.length} bytes`);
        return formatted;
    }
} 