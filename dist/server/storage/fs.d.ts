import type { ByteRange, StorageAdapter } from './types';
export declare class FsStorage implements StorageAdapter {
    private root;
    constructor(root: string);
    private absolutePath;
    read(path: string): Promise<string | null>;
    readBytes(path: string): Promise<Buffer | null>;
    readStream(path: string, range?: ByteRange): Promise<ReadableStream<Uint8Array> | null>;
    write(path: string, data: string | Buffer): Promise<void>;
    exists(path: string): Promise<boolean>;
    remove(path: string): Promise<void>;
    removeDir(prefix: string): Promise<void>;
    list(prefix: string): Promise<string[]>;
    stat(path: string): Promise<{
        size: number;
        mtime: string;
    } | null>;
}
