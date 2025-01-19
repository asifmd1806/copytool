import * as vscode from 'vscode';
import { Minimatch } from 'minimatch';
import { LoggerService } from './logger-service';

export class FilterService {
    constructor(private logger: LoggerService) {}

    public async shouldProcessFile(relativePath: string): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('copytool');
        this.logger.info(`Checking filters for file: ${relativePath}`);

        if (await this.matchesAllowlist(relativePath, config)) {
            if (await this.matchesBlocklist(relativePath, config)) {
                this.logger.info(`File blocked by blocklist: ${relativePath}`);
                return false;
            }
            this.logger.info(`File passed all filters: ${relativePath}`);
            return true;
        }

        this.logger.info(`File not in allowlist: ${relativePath}`);
        return false;
    }

    private async matchesAllowlist(relativePath: string, config: vscode.WorkspaceConfiguration): Promise<boolean> {
        const enableAllowlists = config.get<boolean>('enableAllowlists', false);
        if (!enableAllowlists) {
            return true;
        }

        const allowlistPatterns = config.get<string>('allowlistPatterns', '**/*')
            .split('\n')
            .map(p => p.trim())
            .filter(p => p);

        this.logger.info(`Checking against ${allowlistPatterns.length} allowlist patterns`);
        return allowlistPatterns.some(pattern => {
            const mm = new Minimatch(pattern, { dot: true });
            const matches = mm.match(relativePath);
            if (matches) {
                this.logger.info(`File matches allowlist pattern: ${pattern}`);
            }
            return matches;
        });
    }

    private async matchesBlocklist(relativePath: string, config: vscode.WorkspaceConfiguration): Promise<boolean> {
        const enableBlocklists = config.get<boolean>('enableBlocklists', true);
        if (!enableBlocklists) {
            return false;
        }

        const blocklistPatterns = config.get<string>('blocklistPatterns', '**/node_modules/**\n**/.git/**')
            .split('\n')
            .map(p => p.trim())
            .filter(p => p);

        this.logger.info(`Checking against ${blocklistPatterns.length} blocklist patterns`);
        return blocklistPatterns.some(pattern => {
            const mm = new Minimatch(pattern, { dot: true });
            const matches = mm.match(relativePath);
            if (matches) {
                this.logger.info(`File matches blocklist pattern: ${pattern}`);
            }
            return matches;
        });
    }
} 