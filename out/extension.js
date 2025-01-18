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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const clipboard_service_1 = require("./services/clipboard-service");
const file_processor_1 = require("./services/file-processor");
const list_service_1 = require("./services/list-service");
function activate(context) {
    // Create output channel
    const outputChannel = vscode.window.createOutputChannel('Copy Tool');
    context.subscriptions.push(outputChannel);
    outputChannel.show(true);
    // Initialize services
    const clipboardService = new clipboard_service_1.ClipboardService(outputChannel);
    const fileProcessorService = new file_processor_1.FileProcessorService(clipboardService);
    const listService = new list_service_1.ListService(context.globalState, outputChannel);
    // Register list view
    const listTreeView = vscode.window.createTreeView('copyToolLists', {
        treeDataProvider: listService,
        showCollapseAll: true
    });
    context.subscriptions.push(listTreeView);
    // Register status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(clippy) Copy Tool";
    statusBarItem.tooltip = "Click to show Copy Tool output";
    statusBarItem.command = 'workbench.action.output';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Register commands
    let addToNewClipboard = vscode.commands.registerCommand('copytool.addToNewClipboard', async (uri) => {
        try {
            const entries = await fileProcessorService.processResource(uri);
            if (entries.length > 0) {
                await clipboardService.addToNewClipboard(entries[0]);
            }
        }
        catch (error) {
            clipboardService.log(`Error adding to new clipboard: ${error}`, 'error');
        }
    });
    let addToExistingClipboard = vscode.commands.registerCommand('copytool.addToExistingClipboard', async (uri) => {
        try {
            const entries = await fileProcessorService.processResource(uri);
            if (entries.length > 0) {
                await clipboardService.addToExistingClipboard(entries[0]);
            }
        }
        catch (error) {
            clipboardService.log(`Error adding to existing clipboard: ${error}`, 'error');
        }
    });
    let addToList = vscode.commands.registerCommand('copytool.addToList', async (uri) => {
        try {
            const lists = listService.getLists();
            if (lists.length === 0) {
                const create = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: 'No lists found. Create a new list?'
                });
                if (create === 'Yes') {
                    const name = await vscode.window.showInputBox({
                        prompt: 'Enter list name'
                    });
                    if (name) {
                        await listService.createList(name);
                    }
                }
                return;
            }
            const selected = await vscode.window.showQuickPick(lists.map(list => ({ label: list.name, id: list.id })), { placeHolder: 'Select a list to add to' });
            if (selected) {
                const entries = await fileProcessorService.processResource(uri);
                for (const entry of entries) {
                    await listService.addToList(selected.id, entry);
                }
            }
        }
        catch (error) {
            clipboardService.log(`Error adding to list: ${error}`, 'error');
        }
    });
    let createList = vscode.commands.registerCommand('copytool.createList', async () => {
        try {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter list name'
            });
            if (name) {
                await listService.createList(name);
            }
        }
        catch (error) {
            clipboardService.log(`Error creating list: ${error}`, 'error');
        }
    });
    let deleteList = vscode.commands.registerCommand('copytool.deleteList', async (item) => {
        try {
            if (item?.list?.id) {
                const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: `Delete list "${item.list.name}"?`
                });
                if (confirm === 'Yes') {
                    await listService.deleteList(item.list.id);
                }
            }
        }
        catch (error) {
            clipboardService.log(`Error deleting list: ${error}`, 'error');
        }
    });
    let copyListContents = vscode.commands.registerCommand('copytool.copyListContents', async (item) => {
        try {
            if (item?.list?.id) {
                await listService.copyListContents(item.list.id);
            }
        }
        catch (error) {
            clipboardService.log(`Error copying list contents: ${error}`, 'error');
        }
    });
    context.subscriptions.push(addToNewClipboard, addToExistingClipboard, addToList, createList, deleteList, copyListContents);
    // Show welcome message
    outputChannel.appendLine('Copy Tool activated!');
    outputChannel.appendLine('Available commands:');
    outputChannel.appendLine('- Add to New Clipboard');
    outputChannel.appendLine('- Add to Existing Clipboard');
    outputChannel.appendLine('- Add to List');
    outputChannel.appendLine('- Create List');
    outputChannel.appendLine('- Delete List');
    outputChannel.appendLine('- Copy List Contents');
}
function deactivate() {
    // Clean up resources
}
//# sourceMappingURL=extension.js.map