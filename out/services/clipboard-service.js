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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClipboardService = void 0;
const vscode = __importStar(require("vscode"));
class ClipboardService {
    constructor(outputChannel) {
        this.clipboards = new Map();
        this.currentClipboard = 'default';
        this.outputChannel = outputChannel;
        this.initializeDefaultClipboard();
    }
    initializeDefaultClipboard() {
        this.clipboards.set('default', {
            entries: [],
            name: 'default'
        });
    }
    getCurrentClipboard() {
        return this.currentClipboard;
    }
    async createNewClipboard(name) {
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
    async addToClipboard(entry) {
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
    getClipboardContents(name) {
        const clipboardName = name || this.currentClipboard;
        const clipboard = this.clipboards.get(clipboardName);
        if (!clipboard) {
            throw new Error(`Clipboard "${clipboardName}" not found`);
        }
        return clipboard.entries;
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
exports.ClipboardService = ClipboardService;
//# sourceMappingURL=clipboard-service.js.map