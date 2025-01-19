import * as vscode from 'vscode';
import { ClipboardService } from './services/clipboard-service';
import { FileService } from './services/file-service';
import { FilterService } from './services/filter-service';
import { LoggerService } from './services/logger-service';
import { ContentFormatterService } from './services/content-formatter-service';
import { ListService } from './services/list-service';
import { ResourceProcessorService } from './services/resource-processor-service';

export function activate(context: vscode.ExtensionContext) {
    // Initialize services
    const logger = new LoggerService('Code Copy');
    const fileService = new FileService(logger);
    const filterService = new FilterService(logger);
    const clipboardService = new ClipboardService(logger);
    const formatter = new ContentFormatterService(logger);
    const listService = new ListService(logger, formatter, clipboardService);
    const processor = new ResourceProcessorService(
        logger,
        fileService,
        filterService,
        clipboardService,
        formatter
    );

    // Register list view
<<<<<<< HEAD
    const listView = vscode.window.createTreeView('copyToolLists', {
=======
    const listView = vscode.window.createTreeView('copyLists', {
>>>>>>> edddacc5feb454450113445a291e64fcb7f18557
        treeDataProvider: listService,
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
                    const list = listService.createList(name);
                    const entries = await processor.processResource(uri);
                    for (const entry of entries) {
                        listService.addEntryToList(list.id, entry);
                    }
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
                    listService.addEntryToList(selected.id, entry);
                }
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
                    listService.createList(name);
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
                        listService.deleteList(item.list.id);
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
    logger.show();
}

export function deactivate() {
    // Clean up resources
} 