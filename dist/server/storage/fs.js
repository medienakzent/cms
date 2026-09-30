import { mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
export class FsStorage {
    root;
    constructor(root) {
        this.root = resolve(root);
    }
    absolutePath(path) {
        const full = resolve(this.root, normalize(path));
        if (full !== this.root && !full.startsWith(this.root + sep)) {
            throw new Error(`Storage: Pfad außerhalb des Wurzelverzeichnisses: ${path}`);
        }
        return full;
    }
    async read(path) {
        try {
            return await readFile(this.absolutePath(path), 'utf8');
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return null;
            throw error;
        }
    }
    async readBytes(path) {
        try {
            return await readFile(this.absolutePath(path));
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return null;
            throw error;
        }
    }
    async readStream(path, range) {
        let handle;
        try {
            handle = await open(this.absolutePath(path), 'r');
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return null;
            throw error;
        }
        // autoClose releases the handle when the stream ends, fails or the client cancels.
        const stream = handle.createReadStream({
            start: range?.start,
            end: range?.end,
            autoClose: true
        });
        return Readable.toWeb(stream);
    }
    async write(path, data) {
        const full = this.absolutePath(path);
        await mkdir(dirname(full), { recursive: true });
        const temporaryPath = `${full}.${process.pid}.${Date.now()}.tmp`;
        await writeFile(temporaryPath, data);
        await rename(temporaryPath, full);
    }
    async exists(path) {
        return (await this.stat(path)) !== null;
    }
    async remove(path) {
        await rm(this.absolutePath(path), { force: true });
    }
    async removeDir(prefix) {
        await rm(this.absolutePath(prefix), { recursive: true, force: true });
    }
    async list(prefix) {
        const base = this.absolutePath(prefix);
        let entries;
        try {
            entries = await readdir(base, { withFileTypes: true, recursive: true });
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return [];
            throw error;
        }
        const files = [];
        for (const entry of entries) {
            if (!entry.isFile() || entry.name.endsWith('.tmp') || entry.name.startsWith('.'))
                continue;
            const parent = entry.parentPath ?? entry.path ?? base;
            const full = join(parent, entry.name);
            files.push(full
                .slice(this.root.length + 1)
                .split(sep)
                .join('/'));
        }
        return files.sort();
    }
    async stat(path) {
        try {
            const stats = await stat(this.absolutePath(path));
            return stats.isFile() ? { size: stats.size, mtime: stats.mtime.toISOString() } : null;
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return null;
            throw error;
        }
    }
}
