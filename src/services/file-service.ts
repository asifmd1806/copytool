import * as vscode from 'vscode';
import { LoggerService } from './logger-service';

export class FileService {
    constructor(private logger: LoggerService) {}

    public async readFile(uri: vscode.Uri): Promise<string> {
        this.logger.info(`Reading file: ${uri.fsPath}`);
        try {
            const content = await vscode.workspace.fs.readFile(uri);
            const text = Buffer.from(content).toString('utf-8');
            this.logger.info(`Read ${text.length} bytes from file: ${uri.fsPath}`);
            return text;
        } catch (error) {
            this.logger.error(`Error reading file ${uri.fsPath}: ${error}`);
            throw error;
        }
    }

    public async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        this.logger.info(`Reading directory: ${uri.fsPath}`);
        try {
            const entries = await vscode.workspace.fs.readDirectory(uri);
            this.logger.info(`Found ${entries.length} items in directory: ${uri.fsPath}`);
            return entries;
        } catch (error) {
            this.logger.error(`Error reading directory ${uri.fsPath}: ${error}`);
            throw error;
        }
    }

    public getWorkspaceFolder(uri: vscode.Uri): vscode.WorkspaceFolder | undefined {
        return vscode.workspace.getWorkspaceFolder(uri);
    }

    public getRelativePath(uri: vscode.Uri, workspaceFolder?: vscode.WorkspaceFolder): string {
        if (workspaceFolder) {
            return vscode.workspace.asRelativePath(uri, false);
        }
        return uri.fsPath;
    }
} 