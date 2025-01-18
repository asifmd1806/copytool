"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileProcessorService = void 0;
const vscode = __importStar(require("vscode"));
class FileProcessorService {
    constructor(clipboardService) {
        this.clipboardService = clipboardService;
    }
    async processResource(uri) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            this.clipboardService.log('File is not in a workspace', 'error');
            return [];
        }
        const stats = await vscode.workspace.fs.stat(uri);
        const entries = [];
        if (stats.type === vscode.FileType.Directory) {
            this.clipboardService.log(`Processing directory: ${uri.fsPath}`, 'info');
            const dirEntries = await this.processDirectory(uri, workspaceFolder);
            entries.push(...dirEntries);
        }
        else {
            this.clipboardService.log(`Processing file: ${uri.fsPath}`, 'info');
            const fileEntry = await this.processFile(uri);
            if (fileEntry) {
                entries.push(fileEntry);
            }
        }
        return entries;
    }
    async processDirectory(uri, workspaceFolder) {
        const entries = [];
        const files = await vscode.workspace.fs.readDirectory(uri);
        for (const [name, type] of files) {
            const filePath = vscode.Uri.joinPath(uri, name);
            if (type === vscode.FileType.Directory) {
                const subEntries = await this.processDirectory(filePath, workspaceFolder);
                entries.push(...subEntries);
            }
            else if (type === vscode.FileType.File) {
                const entry = await this.processFile(filePath);
                if (entry) {
                    entries.push(entry);
                }
            }
        }
        return entries;
    }
    async processFile(uri) {
        try {
            const relativePath = vscode.workspace.asRelativePath(uri, false);
            const content = await this.readFile(uri);
            return {
                relativePath,
                content
            };
        }
        catch (error) {
            this.clipboardService.log(`Error processing file ${uri.fsPath}: ${error}`, 'error');
            return null;
        }
    }
    async readFile(uri) {
        const content = await vscode.workspace.fs.readFile(uri);
        return Buffer.from(content).toString('utf-8');
    }
}
exports.FileProcessorService = FileProcessorService;
//# sourceMappingURL=file-processor.js.map