# VS Code Copy Tool Extension

A VS Code extension that provides advanced file and folder copying capabilities with customizable formats and pattern-based filtering.

## Features

- Copy files and folders with customizable output format
- Multiple clipboard support
- Pattern-based file filtering (allowlist/blocklist)
- Colored console logging
- Context menu integration

## Usage

1. Right-click on a file or folder in the VS Code explorer
2. Select either:
   - "Add to Clipboard" to add to the current clipboard
   - "Create New Clipboard" to start a new clipboard collection

## Settings

The extension can be configured through VS Code settings:

- `copytool.allowlist`: Patterns to include in copying (glob patterns)
  - Default: `["**/*"]`
- `copytool.blocklist`: Patterns to exclude from copying (glob patterns)
  - Default: `["**/node_modules/**", "**/.git/**"]`
- `copytool.format`: Format template for copied content
  - Default: `{filepath-from-the-project directory}\n```\n{content}\n```"
  - Variables:
    - `{filepath-from-the-project directory}`: Relative path from workspace root
    - `{content}`: File content



## Development

1. Clone the repository
2. Run `npm install`
3. Press F5 to start debugging

## Requirements

- VS Code 1.60.0 or higher 
