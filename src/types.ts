export interface ClipboardEntry {
    relativePath: string;
    content: string;
    timestamp: number;
}

export interface CopyList {
    id: string;
    name: string;
    entries: ClipboardEntry[];
    created: number;
    lastModified: number;
} 