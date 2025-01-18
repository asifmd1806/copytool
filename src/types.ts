export interface ClipboardEntry {
    relativePath: string;
    content: string;
}

export interface CopyList {
    id: string;
    name: string;
    entries: ClipboardEntry[];
    created: number;
    lastModified: number;
} 