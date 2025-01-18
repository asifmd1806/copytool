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
exports.CopyListTreeItem = void 0;
const vscode = __importStar(require("vscode"));
class CopyListTreeItem extends vscode.TreeItem {
    constructor(list, type, entry) {
        super(type === 'list' ? list.name : entry.relativePath, type === 'list' ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
        this.list = list;
        this.type = type;
        this.entry = entry;
        this.tooltip = type === 'list'
            ? `Created: ${new Date(list.created).toLocaleString()}\nLast Modified: ${new Date(list.lastModified).toLocaleString()}`
            : entry.relativePath;
        this.iconPath = type === 'list'
            ? new vscode.ThemeIcon('list-unordered')
            : new vscode.ThemeIcon('file');
        this.contextValue = type;
    }
}
exports.CopyListTreeItem = CopyListTreeItem;
//# sourceMappingURL=index.js.map