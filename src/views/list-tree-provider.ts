import * as vscode from 'vscode';
import { List, ClipboardEntry } from '../core/types';
import { LoggerService } from '../core/services/logger-service';

export class ListTreeItem extends vscode.TreeItem {
    constructor(
        public readonly list: List,
        public readonly type: 'list' | 'entry',
        public readonly entry?: ClipboardEntry,
        public readonly index?: number
    ) {
        super(
            type === 'list' ? list.name : (entry?.relativePath || ''),
            type === 'list' 
                ? (list.entries.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed)
                : vscode.TreeItemCollapsibleState.None
        );

        if (type === 'list') {
            this.tooltip = `Created: ${new Date(list.createdAt).toLocaleString()}\nLast Modified: ${new Date(list.updatedAt).toLocaleString()}\nEntries: ${list.entries.length}`;
            this.description = `${list.entries.length} entries`;
            this.iconPath = new vscode.ThemeIcon('list-unordered');
            this.contextValue = 'list';
        } else if (entry) {
            this.tooltip = entry.relativePath;
            this.description = new Date(entry.timestamp).toLocaleString();
            this.iconPath = new vscode.ThemeIcon('file');
            this.contextValue = 'entry';
        }
    }
}

export class ListTreeProvider implements vscode.TreeDataProvider<ListTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ListTreeItem | undefined | null | void> = new vscode.EventEmitter<ListTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ListTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        private logger: LoggerService,
        private getLists: () => List[]
    ) {}

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: ListTreeItem): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: ListTreeItem): Promise<ListTreeItem[]> {
        if (!element) {
            // Root level - show lists
            const lists = this.getLists()
                .sort((a, b) => b.updatedAt - a.updatedAt);
            
            this.logger.info(`Found ${lists.length} lists`);
            return lists.map(list => new ListTreeItem(list, 'list'));
        } else if (element.type === 'list') {
            // List level - show entries
            const list = this.getLists().find(l => l.id === element.list.id);
            if (list) {
                this.logger.info(`Showing ${list.entries.length} entries for list: ${list.name}`);
                return list.entries.map(
                    (entry, index) => new ListTreeItem(list, 'entry', entry, index)
                );
            }
        }
        return [];
    }

    public getParent(element: ListTreeItem): vscode.ProviderResult<ListTreeItem> {
        if (element.type === 'entry') {
            return new ListTreeItem(element.list, 'list');
        }
        return null;
    }
} 