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
exports.CopyListTreeItem = exports.ListService = void 0;
const vscode = __importStar(require("vscode"));
const uuid_1 = require("uuid");
class ListService {
    constructor(globalState, outputChannel) {
        this.globalState = globalState;
        this.outputChannel = outputChannel;
        this.lists = new Map();
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.loadLists();
    }
    loadLists() {
        const savedLists = this.globalState.get('copytool.lists', []);
        this.lists.clear();
        for (const list of savedLists) {
            this.lists.set(list.id, list);
        }
    }
    async saveLists() {
        const listsArray = Array.from(this.lists.values());
        await this.globalState.update('copytool.lists', listsArray);
        this.refresh();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    async createList(name) {
        const id = (0, uuid_1.v4)();
        const list = {
            id,
            name,
            entries: [],
            created: Date.now(),
            lastModified: Date.now()
        };
        this.lists.set(id, list);
        await this.saveLists();
        this.outputChannel.appendLine(`Created new list: ${name}`);
    }
    async deleteList(listId) {
        const list = this.lists.get(listId);
        if (list) {
            this.lists.delete(listId);
            await this.saveLists();
            this.outputChannel.appendLine(`Deleted list: ${list.name}`);
        }
    }
    async addToList(listId, entry) {
        const list = this.lists.get(listId);
        if (list) {
            list.entries.push(entry);
            list.lastModified = Date.now();
            await this.saveLists();
            this.outputChannel.appendLine(`Added ${entry.relativePath} to list: ${list.name}`);
        }
    }
    getLists() {
        return Array.from(this.lists.values());
    }
    getList(listId) {
        return this.lists.get(listId);
    }
    async copyListContents(listId) {
        const list = this.lists.get(listId);
        if (list) {
            const formattedContent = list.entries
                .map(entry => `${entry.relativePath}\n\`\`\`\n${entry.content}\n\`\`\``)
                .join('\n\n');
            await vscode.env.clipboard.writeText(formattedContent);
            this.outputChannel.appendLine(`Copied contents of list: ${list.name}`);
        }
    }
    // TreeDataProvider implementation
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // Root level - show lists
            return Array.from(this.lists.values()).map(list => new CopyListTreeItem(list, 'list'));
        }
        else if (element.type === 'list') {
            // List level - show entries
            const list = this.lists.get(element.list.id);
            if (list) {
                return list.entries.map(entry => new CopyListTreeItem(list, 'entry', entry));
            }
        }
        return [];
    }
    getParent(element) {
        if (element.type === 'entry') {
            return new CopyListTreeItem(element.list, 'list');
        }
        return null;
    }
}
exports.ListService = ListService;
class CopyListTreeItem extends vscode.TreeItem {
    constructor(list, type, entry) {
        super(type === 'list' ? list.name : (entry?.relativePath || ''), type === 'list' ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
        this.list = list;
        this.type = type;
        this.entry = entry;
        this.tooltip = type === 'list'
            ? `Created: ${new Date(list.created).toLocaleString()}\nLast Modified: ${new Date(list.lastModified).toLocaleString()}`
            : entry?.relativePath;
        this.iconPath = new vscode.ThemeIcon(type === 'list' ? 'list-unordered' : 'file');
        this.contextValue = type;
    }
}
exports.CopyListTreeItem = CopyListTreeItem;
//# sourceMappingURL=list-service.js.map