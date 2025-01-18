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
exports.ClipboardService = void 0;
const vscode = __importStar(require("vscode"));
class ClipboardService {
    constructor(outputChannel) {
        this.currentClipboard = [];
        this.outputChannel = outputChannel;
        this.outputChannel.show(true);
        this.log('Copy Tool initialized', 'info');
    }
    async addToNewClipboard(entry) {
        // Clear existing entries and add new one
        this.currentClipboard = [entry];
        // Format the content for copying
        const formattedContent = this.formatEntry(entry);
        await vscode.env.clipboard.writeText(formattedContent);
        this.log(`Started new clipboard with: ${entry.relativePath}`, 'info');
        this.outputChannel.show(true);
    }
    async addToExistingClipboard(entry) {
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
    getCurrentClipboardContents() {
        return [...this.currentClipboard];
    }
    formatEntry(entry) {
        const config = vscode.workspace.getConfiguration('copytool');
        const format = config.get('format') || '{filepath-from-the-project directory}\n```\n{content}\n```';
        return format
            .replace('{filepath-from-the-project directory}', entry.relativePath)
            .replace('{content}', entry.content);
    }
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const coloredMessage = this.getColoredMessage(message, level);
        this.outputChannel.appendLine(`[${timestamp}] ${coloredMessage}`);
        // Also show error messages in the UI
        if (level === 'error') {
            vscode.window.showErrorMessage(message);
        }
        else if (level === 'warning') {
            vscode.window.showWarningMessage(message);
        }
        else {
            vscode.window.showInformationMessage(message);
        }
    }
    getColoredMessage(message, level) {
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
exports.ClipboardService = ClipboardService;
//# sourceMappingURL=clipboard-service.js.map