import * as vscode from 'vscode';

export class LoggerService {
    private outputChannel: vscode.OutputChannel;

    constructor(channelName: string) {
        this.outputChannel = vscode.window.createOutputChannel(channelName);
    }

    public info(message: string): void {
        this.log(message, 'info');
    }

    public warning(message: string): void {
        this.log(message, 'warning');
    }

    public error(message: string): void {
        this.log(message, 'error');
    }

    private log(message: string, level: 'info' | 'warning' | 'error'): void {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        this.outputChannel.appendLine(formattedMessage);
        
        // Show UI notifications for warnings and errors
        if (level === 'error') {
            vscode.window.showErrorMessage(message);
        } else if (level === 'warning') {
            vscode.window.showWarningMessage(message);
        }
    }

    public show(): void {
        this.outputChannel.show();
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
} 