import * as vscode from 'vscode';
import { List } from '../core/types';
import { LoggerService } from '../core/services/logger-service';

export class StorageService {
    private static readonly LISTS_KEY = 'copytool.lists';

    constructor(
        private context: vscode.ExtensionContext,
        private logger: LoggerService
    ) {}

    public async saveLists(lists: Map<string, List>): Promise<void> {
        try {
            const listsArray = Array.from(lists.values());
            await this.context.globalState.update(StorageService.LISTS_KEY, listsArray);
            this.logger.info(`Saved ${listsArray.length} lists to storage`);
        } catch (error) {
            this.logger.error(`Error saving lists to storage: ${error}`);
        }
    }

    public async loadLists(): Promise<Map<string, List>> {
        try {
            const listsArray = this.context.globalState.get<List[]>(StorageService.LISTS_KEY, []);
            const listsMap = new Map<string, List>();
            
            for (const list of listsArray) {
                listsMap.set(list.id, list);
            }
            
            this.logger.info(`Loaded ${listsMap.size} lists from storage`);
            return listsMap;
        } catch (error) {
            this.logger.error(`Error loading lists from storage: ${error}`);
            return new Map<string, List>();
        }
    }

    public async clearLists(): Promise<void> {
        try {
            await this.context.globalState.update(StorageService.LISTS_KEY, []);
            this.logger.info('Cleared all lists from storage');
        } catch (error) {
            this.logger.error(`Error clearing lists from storage: ${error}`);
        }
    }
} 