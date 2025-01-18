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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileProcessorService = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const minimatch_1 = __importDefault(require("minimatch"));
class FileProcessorService {
    constructor(clipboardService, outputChannel) {
        this.clipboardService = clipboardService;
        this.outputChannel = outputChannel;
    }
    async processFile(fileUri, workspaceFolder, _format) {
        try {
            const content = await vscode.workspace.fs.readFile(fileUri);
            const relativePath = path.relative(workspaceFolder.uri.fsPath, fileUri.fsPath);
            const entry = {
                relativePath,
                content: content.toString(),
                timestamp: Date.now()
            };
            await this.clipboardService.addToClipboard(entry);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.log(`Error processing file ${fileUri.fsPath}: ${errorMessage}`, 'error');
            throw error;
        }
    }
    async processDirectory(dirUri, workspaceFolder, config) {
        try {
            const files = await vscode.workspace.fs.readDirectory(dirUri);
            for (const [name, type] of files) {
                const fullPath = path.join(dirUri.fsPath, name);
                const fileUri = vscode.Uri.file(fullPath);
                const relativePath = path.relative(workspaceFolder.uri.fsPath, fullPath);
                const isAllowed = config.allowlist.some(pattern => (0, minimatch_1.default)(relativePath, pattern));
                const isBlocked = config.blocklist.some(pattern => (0, minimatch_1.default)(relativePath, pattern));
                if (!isAllowed || isBlocked) {
                    this.log(`Skipping ${relativePath} (filtered by patterns)`, 'warning');
                    continue;
                }
                if (type === vscode.FileType.Directory) {
                    await this.processDirectory(fileUri, workspaceFolder, config);
                }
                else {
                    await this.processFile(fileUri, workspaceFolder, config.format);
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.log(`Error processing directory ${dirUri.fsPath}: ${errorMessage}`, 'error');
            throw error;
        }
    }
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const coloredMessage = this.getColoredMessage(message, level);
        this.outputChannel.appendLine(`[${timestamp}] ${coloredMessage}`);
    }
    getColoredMessage(message, level) {
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
exports.FileProcessorService = FileProcessorService;
//# sourceMappingURL=file-processor.js.map