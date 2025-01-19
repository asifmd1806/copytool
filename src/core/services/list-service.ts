import * as vscode from 'vscode';
import { List, ClipboardEntry } from '../types';
import { LoggerService } from './logger-service';
import { ContentFormatterService } from './content-formatter-service';
import { ClipboardService } from './clipboard-service';
import { StorageService } from '../../storage/storage-service';

export class ListService {
    private lists: Map<string, List> = new Map();

    constructor(
        private logger: LoggerService,
        private formatter: ContentFormatterService,
        private clipboard: ClipboardService,
        private storage: StorageService
    ) {
        this.loadLists();
    }

    private async loadLists(): Promise<void> {
        this.lists = await this.storage.loadLists();
        this.logger.info(`Loaded ${this.lists.size} lists from storage`);
    }

    private async saveLists(): Promise<void> {
        await this.storage.saveLists(this.lists);
    }

    public getAllLists(): List[] {
        return Array.from(this.lists.values());
    }

    public getList(id: string): List | undefined {
        return this.lists.get(id);
    }

    public async createList(name: string): Promise<List> {
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
        await this.saveLists();
        return list;
    }

    public async deleteList(id: string): Promise<boolean> {
        const deleted = this.lists.delete(id);
        if (deleted) {
            this.logger.info(`Deleted list: ${id}`);
            await this.saveLists();
        }
        return deleted;
    }

    public async addEntryToList(listId: string, entry: ClipboardEntry): Promise<boolean> {
        const list = this.lists.get(listId);
        if (!list) {
            this.logger.warning(`List not found: ${listId}`);
            return false;
        }

        list.entries.push(entry);
        list.updatedAt = Date.now();
        this.logger.info(`Added entry to list ${list.name}: ${entry.relativePath}`);
        await this.saveLists();
        return true;
    }

    public async removeEntryFromList(listId: string, entryIndex: number): Promise<boolean> {
        const list = this.lists.get(listId);
        if (!list || entryIndex < 0 || entryIndex >= list.entries.length) {
            return false;
        }

        list.entries.splice(entryIndex, 1);
        list.updatedAt = Date.now();
        this.logger.info(`Removed entry at index ${entryIndex} from list ${list.name}`);
        await this.saveLists();
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