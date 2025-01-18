import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { ClipboardEntry, CopyList } from '../types';

export class ListService implements vscode.TreeDataProvider<CopyListTreeItem> {
    private lists: Map<string, CopyList> = new Map();
    private _onDidChangeTreeData: vscode.EventEmitter<CopyListTreeItem | undefined | null | void> = new vscode.EventEmitter<CopyListTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CopyListTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        private globalState: vscode.Memento,
        private outputChannel: vscode.OutputChannel
    ) {
        this.loadLists();
    }

    private loadLists(): void {
        const savedLists = this.globalState.get<CopyList[]>('copytool.lists', []);
        this.lists.clear();
        for (const list of savedLists) {
            this.lists.set(list.id, list);
        }
    }

    private async saveLists(): Promise<void> {
        const listsArray = Array.from(this.lists.values());
        await this.globalState.update('copytool.lists', listsArray);
        this.refresh();
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    public async createList(name: string): Promise<void> {
        const id = uuidv4();
        const list: CopyList = {
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

    public async deleteList(listId: string): Promise<void> {
        const list = this.lists.get(listId);
        if (list) {
            this.lists.delete(listId);
            await this.saveLists();
            this.outputChannel.appendLine(`Deleted list: ${list.name}`);
        }
    }

    public async addToList(listId: string, entry: ClipboardEntry): Promise<void> {
        const list = this.lists.get(listId);
        if (list) {
            list.entries.push(entry);
            list.lastModified = Date.now();
            await this.saveLists();
            this.outputChannel.appendLine(`Added ${entry.relativePath} to list: ${list.name}`);
        }
    }

    public getLists(): CopyList[] {
        return Array.from(this.lists.values());
    }

    public getList(listId: string): CopyList | undefined {
        return this.lists.get(listId);
    }

    public async copyListContents(listId: string): Promise<void> {
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
    getTreeItem(element: CopyListTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: CopyListTreeItem): Promise<CopyListTreeItem[]> {
        if (!element) {
            // Root level - show lists
            return Array.from(this.lists.values()).map(
                list => new CopyListTreeItem(list, 'list')
            );
        } else if (element.type === 'list') {
            // List level - show entries
            const list = this.lists.get(element.list.id);
            if (list) {
                return list.entries.map(
                    entry => new CopyListTreeItem(list, 'entry', entry)
                );
            }
        }
        return [];
    }

    getParent(element: CopyListTreeItem): vscode.ProviderResult<CopyListTreeItem> {
        if (element.type === 'entry') {
            return new CopyListTreeItem(element.list, 'list');
        }
        return null;
    }
}

export class CopyListTreeItem extends vscode.TreeItem {
    constructor(
        public readonly list: CopyList,
        public readonly type: 'list' | 'entry',
        public readonly entry?: ClipboardEntry
    ) {
        super(
            type === 'list' ? list.name : (entry?.relativePath || ''),
            type === 'list' ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
        );

        this.tooltip = type === 'list'
            ? `Created: ${new Date(list.created).toLocaleString()}\nLast Modified: ${new Date(list.lastModified).toLocaleString()}`
            : entry?.relativePath;

        this.iconPath = new vscode.ThemeIcon(
            type === 'list' ? 'list-unordered' : 'file'
        );

        this.contextValue = type;
    }
} 