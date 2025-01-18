import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { ClipboardEntry, CopyList } from '../types';

export class ListService implements vscode.TreeDataProvider<CopyListTreeItem> {
    private lists: Map<string, CopyList> = new Map();
    private _onDidChangeTreeData: vscode.EventEmitter<CopyListTreeItem | undefined | null | void> = new vscode.EventEmitter<CopyListTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CopyListTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private readonly MAX_ENTRIES_PER_LIST = 100;
    private readonly MAX_LISTS = 20;

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

    private validateListName(name: string): boolean {
        if (!name || !name.trim()) {
            this.outputChannel.appendLine('List name cannot be empty');
            return false;
        }

        // Check for duplicates
        const exists = Array.from(this.lists.values()).some(list => list.name === name.trim());
        if (exists) {
            this.outputChannel.appendLine(`A list named "${name}" already exists`);
            return false;
        }

        return true;
    }

    public async createList(name: string): Promise<void> {
        if (!this.validateListName(name)) {
            return;
        }

        if (this.lists.size >= this.MAX_LISTS) {
            this.outputChannel.appendLine(`Cannot create more than ${this.MAX_LISTS} lists`);
            return;
        }

        const id = uuidv4();
        const list: CopyList = {
            id,
            name: name.trim(),
            entries: [],
            created: Date.now(),
            lastModified: Date.now()
        };
        this.lists.set(id, list);
        await this.saveLists();
        this.outputChannel.appendLine(`Created new list: ${name}`);
    }

    public async renameList(listId: string, newName: string): Promise<void> {
        if (!this.validateListName(newName)) {
            return;
        }

        const list = this.lists.get(listId);
        if (list) {
            const oldName = list.name;
            list.name = newName.trim();
            list.lastModified = Date.now();
            await this.saveLists();
            this.outputChannel.appendLine(`Renamed list from "${oldName}" to "${newName}"`);
        }
    }

    public async deleteList(listId: string): Promise<void> {
        const list = this.lists.get(listId);
        if (list) {
            this.lists.delete(listId);
            await this.saveLists();
            this.outputChannel.appendLine(`Deleted list: ${list.name}`);
        }
    }

    public async removeFromList(listId: string, entryIndex: number): Promise<void> {
        const list = this.lists.get(listId);
        if (list && entryIndex >= 0 && entryIndex < list.entries.length) {
            const entry = list.entries[entryIndex];
            list.entries.splice(entryIndex, 1);
            list.lastModified = Date.now();
            await this.saveLists();
            this.outputChannel.appendLine(`Removed ${entry.relativePath} from list: ${list.name}`);
        }
    }

    public async addToList(listId: string, entry: ClipboardEntry): Promise<void> {
        const list = this.lists.get(listId);
        if (list) {
            if (list.entries.length >= this.MAX_ENTRIES_PER_LIST) {
                this.outputChannel.appendLine(`List "${list.name}" is full (max ${this.MAX_ENTRIES_PER_LIST} entries)`);
                return;
            }

            // Check for duplicates
            const isDuplicate = list.entries.some(e => e.relativePath === entry.relativePath);
            if (isDuplicate) {
                this.outputChannel.appendLine(`${entry.relativePath} is already in list: ${list.name}`);
                return;
            }

            list.entries.push(entry);
            list.lastModified = Date.now();
            await this.saveLists();
            this.outputChannel.appendLine(`Added ${entry.relativePath} to list: ${list.name} (${list.entries.length}/${this.MAX_ENTRIES_PER_LIST} entries)`);
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
            if (list.entries.length === 0) {
                this.outputChannel.appendLine(`List "${list.name}" is empty`);
                return;
            }

            const formattedContent = list.entries
                .map(entry => `${entry.relativePath}\n\`\`\`\n${entry.content}\n\`\`\``)
                .join('\n\n');
            await vscode.env.clipboard.writeText(formattedContent);
            this.outputChannel.appendLine(`Copied contents of list: ${list.name} (${list.entries.length} entries)`);
        }
    }

    // TreeDataProvider implementation
    getTreeItem(element: CopyListTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: CopyListTreeItem): Promise<CopyListTreeItem[]> {
        if (!element) {
            // Root level - show lists
            return Array.from(this.lists.values())
                .sort((a, b) => b.lastModified - a.lastModified)
                .map(list => new CopyListTreeItem(list, 'list'));
        } else if (element.type === 'list') {
            // List level - show entries
            const list = this.lists.get(element.list.id);
            if (list) {
                return list.entries.map(
                    (entry, index) => new CopyListTreeItem(list, 'entry', entry, index)
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
        public readonly entry?: ClipboardEntry,
        public readonly index?: number
    ) {
        super(
            type === 'list' ? list.name : (entry?.relativePath || ''),
            type === 'list' ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
        );

        if (type === 'list') {
            this.tooltip = `Created: ${new Date(list.created).toLocaleString()}\nLast Modified: ${new Date(list.lastModified).toLocaleString()}\nEntries: ${list.entries.length}`;
            this.description = `${list.entries.length} entries`;
        } else if (entry) {
            this.tooltip = entry.relativePath;
            this.description = new Date(entry.timestamp).toLocaleString();
        }

        this.iconPath = new vscode.ThemeIcon(
            type === 'list' ? 'list-unordered' : 'file'
        );

        this.contextValue = type;
    }
} 