import * as vscode from 'vscode';
import { ClipboardEntry } from '../types';
import { LoggerService } from './logger-service';
import { ContentFormatterService } from './content-formatter-service';
import { ClipboardService } from './clipboard-service';

export interface List {
    id: string;
    name: string;
    entries: ClipboardEntry[];
    createdAt: number;
    updatedAt: number;
}

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

export class ListService implements vscode.TreeDataProvider<ListTreeItem> {
    private lists: Map<string, List> = new Map();
    private _onDidChangeTreeData: vscode.EventEmitter<ListTreeItem | undefined | null | void> = new vscode.EventEmitter<ListTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ListTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        private logger: LoggerService,
        private formatter: ContentFormatterService,
        private clipboard: ClipboardService
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
            const lists = Array.from(this.lists.values())
                .sort((a, b) => b.updatedAt - a.updatedAt);
            
            this.logger.info(`Found ${lists.length} lists`);
            return lists.map(list => new ListTreeItem(list, 'list'));
        } else if (element.type === 'list') {
            // List level - show entries
            const list = this.lists.get(element.list.id);
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

    public createList(name: string): List {
        const id = Date.now().toString();
        const list: List = {
            id,
            name,
            entries: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        this.lists.set(id, list);
        this.logger.info(`Created new list: ${name} (${id})`);
        this.refresh();
        return list;
    }

    public getList(id: string): List | undefined {
        return this.lists.get(id);
    }

    public getAllLists(): List[] {
        return Array.from(this.lists.values());
    }

    public deleteList(id: string): boolean {
        const deleted = this.lists.delete(id);
        if (deleted) {
            this.logger.info(`Deleted list: ${id}`);
            this.refresh();
        }
        return deleted;
    }

    public addEntryToList(listId: string, entry: ClipboardEntry): boolean {
        const list = this.lists.get(listId);
        if (!list) {
            this.logger.warning(`List not found: ${listId}`);
            return false;
        }

        list.entries.push(entry);
        list.updatedAt = Date.now();
        this.logger.info(`Added entry to list ${list.name}: ${entry.relativePath}`);
        this.refresh();
        return true;
    }

    public removeEntryFromList(listId: string, entryIndex: number): boolean {
        const list = this.lists.get(listId);
        if (!list || entryIndex < 0 || entryIndex >= list.entries.length) {
            return false;
        }

        list.entries.splice(entryIndex, 1);
        list.updatedAt = Date.now();
        this.logger.info(`Removed entry at index ${entryIndex} from list ${list.name}`);
        this.refresh();
        return true;
    }

    public async copyListToClipboard(listId: string): Promise<boolean> {
        const list = this.lists.get(listId);
        if (!list) {
            this.logger.warning(`List not found: ${listId}`);
            return false;
        }

        if (list.entries.length === 0) {
            this.logger.warning(`List is empty: ${list.name}`);
            return false;
        }

        const formattedContent = this.formatter.formatEntries(list.entries);
        await this.clipboard.setContent(formattedContent);
        this.logger.info(`Copied list ${list.name} to clipboard (${list.entries.length} entries)`);
        return true;
    }
} 