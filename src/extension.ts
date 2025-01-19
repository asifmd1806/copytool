import * as vscode from 'vscode';
import { ClipboardService } from './core/services/clipboard-service';
import { FileService } from './core/services/file-service';
import { FilterService } from './core/services/filter-service';
import { LoggerService } from './core/services/logger-service';
import { ContentFormatterService } from './core/services/content-formatter-service';
import { ListService } from './core/services/list-service';
import { ResourceProcessorService } from './core/services/resource-processor-service';
import { StorageService } from './storage/storage-service';
import { ListTreeProvider } from './views/list-tree-provider';

export function activate(context: vscode.ExtensionContext) {
    // Initialize services
    const logger = new LoggerService('Code Copy');
    const fileService = new FileService(logger);
    const filterService = new FilterService(logger);
    const clipboardService = new ClipboardService(logger);
    const formatter = new ContentFormatterService(logger);
    const storage = new StorageService(context, logger);
    const listService = new ListService(logger, formatter, clipboardService, storage);
    const processor = new ResourceProcessorService(
        logger,
        fileService,
        filterService,
        clipboardService,
        formatter
    );

    // Register list view
    const listTreeProvider = new ListTreeProvider(logger, () => listService.getAllLists());
    const listView = vscode.window.createTreeView('copyToolLists', {
        treeDataProvider: listTreeProvider,
        showCollapseAll: true
    });

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('copytool.addToNewClipboard', async (uri: vscode.Uri) => {
            try {
                await processor.processResource(uri);
                vscode.window.showInformationMessage('Added to new clipboard');
            } catch (error) {
                logger.error(`Error adding to new clipboard: ${error}`);
            }
        }),

        vscode.commands.registerCommand('copytool.addToExistingClipboard', async (uri: vscode.Uri) => {
            try {
                await processor.processResource(uri);
                vscode.window.showInformationMessage('Added to existing clipboard');
            } catch (error) {
                logger.error(`Error adding to existing clipboard: ${error}`);
            }
        }),

        vscode.commands.registerCommand('copytool.addToList', async (uri: vscode.Uri) => {
            try {
                const lists = listService.getAllLists();
                if (lists.length === 0) {
                    const name = await vscode.window.showInputBox({
                        prompt: 'Enter list name',
                        placeHolder: 'My List'
                    });
                    if (!name) {
                        return;
                    }
                    const list = await listService.createList(name);
                    const entries = await processor.processResource(uri);
                    for (const entry of entries) {
                        await listService.addEntryToList(list.id, entry);
                    }
                    listTreeProvider.refresh();
                    return;
                }

                const selected = await vscode.window.showQuickPick(
                    lists.map(list => ({ label: list.name, id: list.id })),
                    { placeHolder: 'Select a list' }
                );
                if (!selected) {
                    return;
                }

                const entries = await processor.processResource(uri);
                for (const entry of entries) {
                    await listService.addEntryToList(selected.id, entry);
                }
                listTreeProvider.refresh();
            } catch (error) {
                logger.error(`Error adding to list: ${error}`);
            }
        }),

        vscode.commands.registerCommand('copytool.createList', async () => {
            try {
                const name = await vscode.window.showInputBox({
                    prompt: 'Enter list name',
                    placeHolder: 'My List'
                });
                if (name) {
                    await listService.createList(name);
                    listTreeProvider.refresh();
                }
            } catch (error) {
                logger.error(`Error creating list: ${error}`);
            }
        }),

        vscode.commands.registerCommand('copytool.deleteList', async (item: any) => {
            try {
                if (item?.list?.id) {
                    const confirmed = await vscode.window.showWarningMessage(
                        `Are you sure you want to delete list "${item.list.name}"?`,
                        { modal: true },
                        'Delete'
                    );
                    if (confirmed === 'Delete') {
                        await listService.deleteList(item.list.id);
                        listTreeProvider.refresh();
                    }
                }
            } catch (error) {
                logger.error(`Error deleting list: ${error}`);
            }
        }),

        vscode.commands.registerCommand('copytool.copyList', async (item: any) => {
            try {
                if (item?.list?.id) {
                    await listService.copyListToClipboard(item.list.id);
                }
            } catch (error) {
                logger.error(`Error copying list contents: ${error}`);
            }
        }),

        vscode.commands.registerCommand('copytool.clearClipboard', async () => {
            try {
                clipboardService.clear();
                vscode.window.showInformationMessage('Clipboard cleared');
            } catch (error) {
                logger.error(`Error clearing clipboard: ${error}`);
            }
        }),

        vscode.commands.registerCommand('copytool.openOutputChannel', () => {
            logger.show();
        })
    );

    // Show welcome message
    logger.info('Code Copy extension activated');
    logger.info('Available commands:');
    logger.info('- Add to New Clipboard');
    logger.info('- Add to Existing Clipboard');
    logger.info('- Add to List');
    logger.info('- Create List');
    logger.info('- Delete List');
    logger.info('- Copy List');
    logger.show();
}

export function deactivate() {
    // Clean up resources
} 