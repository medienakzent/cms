/**
 * Storage adapter: content, history and media live here as files, NOT in the
 * database. The database is only a derived index. Default: file system (fs.ts);
 * further adapters (S3, …) implement this interface.
 */
/** Byte range of a file, both ends inclusive (as in HTTP `Content-Range`). */
export interface ByteRange {
    start: number;
    end: number;
}
export interface StorageAdapter {
    read(path: string): Promise<string | null>;
    readBytes(path: string): Promise<Buffer | null>;
    /** Atomic: write to a temporary file, then rename. Creates directories. */
    write(path: string, data: string | Buffer): Promise<void>;
    exists(path: string): Promise<boolean>;
    remove(path: string): Promise<void>;
    /** All files (relative paths) under `prefix`, recursive, sorted. */
    list(prefix: string): Promise<string[]>;
    stat(path: string): Promise<{
        size: number;
        mtime: string;
    } | null>;
    /**
     * Stream a file or a byte range of it (`end` inclusive), `null` if missing (optional).
     * Lets the media route answer range requests (video) without loading whole files into memory;
     * adapters without it fall back to `readBytes`.
     */
    readStream?(path: string, range?: ByteRange): Promise<ReadableStream<Uint8Array> | null>;
    /** Remove a directory with its contents (optional; otherwise empty folders remain). */
    removeDir?(prefix: string): Promise<void>;
}
