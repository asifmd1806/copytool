import * as vscode from 'vscode';
import { ClipboardService } from './services/clipboard-service';
import { FileProcessorService } from './services/file-processor';
import { ListService } from './services/list-service';
import { ClipboardEntry } from './types';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    // Create output channel
    const outputChannel = vscode.window.createOutputChannel('Copy Tool');
    context.subscriptions.push(outputChannel);
    
    // Initialize services
    const clipboardService = new ClipboardService(outputChannel);
    const fileProcessorService = new FileProcessorService(clipboardService);
    const listService = new ListService(context.globalState, outputChannel);

    // Register list view
    const listTreeView = vscode.window.createTreeView('copyToolLists', {
        treeDataProvider: listService,
        showCollapseAll: true
    });
    context.subscriptions.push(listTreeView);

    // Register status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(clippy) Copy Tool";
    statusBarItem.tooltip = "Click to show Copy Tool output";
    statusBarItem.command = 'copytool.showOutput';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register show output command
    let showOutput = vscode.commands.registerCommand('copytool.showOutput', () => {
        outputChannel.show(true);
    });

    // Register dynamic submenu provider
    context.subscriptions.push(
        vscode.commands.registerCommand('copytool.listSubmenu', async (uri: vscode.Uri) => {
            const lists = listService.getLists();
            if (lists.length === 0) {
                return [{
                    command: 'copytool.createList',
                    title: 'Create New List...'
                }];
            }

            return lists.map(list => ({
                command: 'copytool.addToSpecificList',
                title: list.name,
                arguments: [uri, list.id]
            }));
        })
    );

    // Register commands
    let addToNewClipboard = vscode.commands.registerCommand('copytool.addToNewClipboard', async (uri: vscode.Uri) => {
        try {
            const entries = await fileProcessorService.processResource(uri);
            if (entries.length > 0) {
                await clipboardService.addToNewClipboard(entries[0]);
            }
        } catch (error) {
            clipboardService.log(`Error adding to new clipboard: ${error}`, 'error');
        }
    });

    let addToExistingClipboard = vscode.commands.registerCommand('copytool.addToExistingClipboard', async (uri: vscode.Uri) => {
        try {
            const entries = await fileProcessorService.processResource(uri);
            if (entries.length > 0) {
                await clipboardService.addToExistingClipboard(entries[0]);
            }
        } catch (error) {
            clipboardService.log(`Error adding to existing clipboard: ${error}`, 'error');
        }
    });

    let addToList = vscode.commands.registerCommand('copytool.addToList', async (uri: vscode.Uri) => {
        try {
            const lists = listService.getLists();
            if (lists.length === 0) {
                const create = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: 'No lists found. Create a new list?'
                });
                if (create === 'Yes') {
                    const name = await vscode.window.showInputBox({
                        prompt: 'Enter list name'
                    });
                    if (name) {
                        await listService.createList(name);
                    }
                }
                return;
            }

            const selected = await vscode.window.showQuickPick(
                lists.map(list => ({ label: list.name, id: list.id })),
                { placeHolder: 'Select a list to add to' }
            );

            if (selected) {
                const entries = await fileProcessorService.processResource(uri);
                for (const entry of entries) {
                    await listService.addToList(selected.id, entry);
                }
            }
        } catch (error) {
            clipboardService.log(`Error adding to list: ${error}`, 'error');
        }
    });

    let createList = vscode.commands.registerCommand('copytool.createList', async () => {
        try {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter list name'
            });
            if (name) {
                await listService.createList(name);
            }
        } catch (error) {
            clipboardService.log(`Error creating list: ${error}`, 'error');
        }
    });

    let deleteList = vscode.commands.registerCommand('copytool.deleteList', async (item: any) => {
        try {
            if (item?.list?.id) {
                const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: `Delete list "${item.list.name}"?`
                });
                if (confirm === 'Yes') {
                    await listService.deleteList(item.list.id);
                }
            }
        } catch (error) {
            clipboardService.log(`Error deleting list: ${error}`, 'error');
        }
    });

    let copyListContents = vscode.commands.registerCommand('copytool.copyListContents', async (item: any) => {
        try {
            if (item?.list?.id) {
                await listService.copyListContents(item.list.id);
            }
        } catch (error) {
            clipboardService.log(`Error copying list contents: ${error}`, 'error');
        }
    });

    let importFromGitignore = vscode.commands.registerCommand('copytool.importFromGitignore', async () => {
        try {
            // Find all .gitignore files in the workspace
            const files = await vscode.workspace.findFiles('**/.gitignore');
            
            if (files.length === 0) {
                clipboardService.log('No .gitignore files found in workspace', 'warning');
                return;
            }

            // Let user select which .gitignore to import from if multiple exist
            let selectedFile: vscode.Uri;
            if (files.length === 1) {
                selectedFile = files[0];
            } else {
                const items = files.map(file => ({
                    label: vscode.workspace.asRelativePath(file),
                    uri: file
                }));
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select .gitignore file to import from'
                });
                if (!selected) {
                    return;
                }
                selectedFile = selected.uri;
            }

            // Read the .gitignore file
            const content = await vscode.workspace.fs.readFile(selectedFile);
            const patterns = content.toString()
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));

            // Get the relative path to the .gitignore file's directory
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(selectedFile);
            const gitignoreDir = path.dirname(selectedFile.fsPath);
            const relativePrefix = workspaceFolder 
                ? path.relative(workspaceFolder.uri.fsPath, gitignoreDir)
                : '';

            // Add the patterns to the blocklist
            const config = vscode.workspace.getConfiguration('copytool');
            const currentPatterns = config.get<string>('blocklistPatterns', '').split('\n').filter(p => p.trim());
            
            // Add prefix to patterns if needed and combine with existing patterns
            const newPatterns = patterns.map(pattern => {
                if (relativePrefix && !pattern.startsWith('/')) {
                    return path.join(relativePrefix, pattern).replace(/\\/g, '/');
                }
                return pattern;
            });
            
            const combinedPatterns = [...new Set([...currentPatterns, ...newPatterns])];
            
            // Update the configuration
            await config.update('blocklistPatterns', combinedPatterns.join('\n'), vscode.ConfigurationTarget.Workspace);
            await config.update('enableBlocklists', true, vscode.ConfigurationTarget.Workspace);
            
            clipboardService.log(`Imported ${patterns.length} patterns from ${vscode.workspace.asRelativePath(selectedFile)}`, 'info');
        } catch (error) {
            clipboardService.log(`Error importing from .gitignore: ${error}`, 'error');
        }
    });

    let addToSpecificList = vscode.commands.registerCommand('copytool.addToSpecificList', async (uri: vscode.Uri, listId: string) => {
        try {
            const entries = await fileProcessorService.processResource(uri);
            for (const entry of entries) {
                await listService.addToList(listId, entry);
            }
        } catch (error) {
            clipboardService.log(`Error adding to list: ${error}`, 'error');
        }
    });

    let clearClipboard = vscode.commands.registerCommand('copytool.clearClipboard', () => {
        try {
            clipboardService.clearClipboard();
        } catch (error) {
            clipboardService.log(`Error clearing clipboard: ${error}`, 'error');
        }
    });

    let renameList = vscode.commands.registerCommand('copytool.renameList', async (item: any) => {
        try {
            if (item?.list?.id) {
                const newName = await vscode.window.showInputBox({
                    prompt: 'Enter new list name',
                    value: item.list.name
                });
                if (newName) {
                    await listService.renameList(item.list.id, newName);
                }
            }
        } catch (error) {
            clipboardService.log(`Error renaming list: ${error}`, 'error');
        }
    });

    let removeFromList = vscode.commands.registerCommand('copytool.removeFromList', async (item: any) => {
        try {
            if (item?.list?.id && typeof item.index === 'number') {
                const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: `Remove ${item.entry?.relativePath} from list "${item.list.name}"?`
                });
                if (confirm === 'Yes') {
                    await listService.removeFromList(item.list.id, item.index);
                }
            }
        } catch (error) {
            clipboardService.log(`Error removing from list: ${error}`, 'error');
        }
    });

    // Register all commands
    context.subscriptions.push(
        addToNewClipboard,
        addToExistingClipboard,
        clearClipboard,
        createList,
        renameList,
        deleteList,
        removeFromList,
        copyListContents,
        importFromGitignore,
        addToSpecificList,
        showOutput
    );

    // Show welcome message and output channel
    outputChannel.appendLine('Copy Tool activated!');
    outputChannel.appendLine('Available commands:');
    outputChannel.appendLine('- Add to New Clipboard');
    outputChannel.appendLine('- Add to Existing Clipboard');
    outputChannel.appendLine('- Clear Clipboard');
    outputChannel.appendLine('- Create List');
    outputChannel.appendLine('- Rename List');
    outputChannel.appendLine('- Delete List');
    outputChannel.appendLine('- Remove from List');
    outputChannel.appendLine('- Copy List Contents');
    outputChannel.appendLine('- Import from .gitignore');
    outputChannel.show(true);
}

export function deactivate() {
    // Clean up resources
} 