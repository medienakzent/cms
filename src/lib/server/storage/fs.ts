import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import type { StorageAdapter } from './types';

export class FsStorage implements StorageAdapter {
	private root: string;

	constructor(root: string) {
		this.root = resolve(root);
	}

	private abs(path: string): string {
		const full = resolve(this.root, normalize(path));
		if (full !== this.root && !full.startsWith(this.root + sep)) {
			throw new Error(`Storage: Pfad außerhalb des Wurzelverzeichnisses: ${path}`);
		}
		return full;
	}

	async read(path: string): Promise<string | null> {
		try {
			return await readFile(this.abs(path), 'utf8');
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw e;
		}
	}

	async readBytes(path: string): Promise<Buffer | null> {
		try {
			return await readFile(this.abs(path));
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw e;
		}
	}

	async write(path: string, data: string | Buffer): Promise<void> {
		const full = this.abs(path);
		await mkdir(dirname(full), { recursive: true });
		const tmp = `${full}.${process.pid}.${Date.now()}.tmp`;
		await writeFile(tmp, data);
		await rename(tmp, full);
	}

	async exists(path: string): Promise<boolean> {
		return (await this.stat(path)) !== null;
	}

	async remove(path: string): Promise<void> {
		await rm(this.abs(path), { force: true });
	}

	async removeDir(prefix: string): Promise<void> {
		await rm(this.abs(prefix), { recursive: true, force: true });
	}

	async list(prefix: string): Promise<string[]> {
		const base = this.abs(prefix);
		let entries: import('node:fs').Dirent[];
		try {
			entries = await readdir(base, { withFileTypes: true, recursive: true });
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
			throw e;
		}
		const out: string[] = [];
		for (const entry of entries) {
			if (!entry.isFile() || entry.name.endsWith('.tmp') || entry.name.startsWith('.')) continue;
			const parent =
				(entry as { parentPath?: string; path?: string }).parentPath ?? entry.path ?? base;
			const full = join(parent, entry.name);
			out.push(
				full
					.slice(this.root.length + 1)
					.split(sep)
					.join('/')
			);
		}
		return out.sort();
	}

	async stat(path: string): Promise<{ size: number; mtime: string } | null> {
		try {
			const s = await stat(this.abs(path));
			return s.isFile() ? { size: s.size, mtime: s.mtime.toISOString() } : null;
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw e;
		}
	}
}
