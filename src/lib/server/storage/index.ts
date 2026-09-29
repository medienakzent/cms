import { serverConfig } from '../runtime';
import { FsStorage } from './fs';
import type { StorageAdapter } from './types';

export type { StorageAdapter } from './types';

let instance: StorageAdapter | null = null;

/** Storage-Singleton. Für andere Adapter hier verzweigen (z. B. nach `STORAGE_URL`). */
export function getStorage(): StorageAdapter {
	if (!instance) instance = new FsStorage(serverConfig().storageDir);
	return instance;
}

/** Pfad-Konventionen — an genau einer Stelle definiert. */
export const paths = {
	base: (collection: string, slug: string) => `content/${collection}/${slug}.json`,
	overlay: (collection: string, slug: string, lang: string) =>
		`content/${collection}/${slug}.${lang}.json`,
	collectionDir: (collection: string) => `content/${collection}`,
	historyDir: (collection: string, slug: string) => `history/${collection}/${slug}`,
	history: (collection: string, slug: string, versionId: string) =>
		`history/${collection}/${slug}/${versionId}.json`,
	media: (year: string, month: string, file: string) => `media/${year}/${month}/${file}`
};

/**
 * Zerlegt einen Dateinamen unter content/<collection>/ in Slug + Sprache.
 * `about.json` → { slug: 'about', lang: null }, `about.en.json` → { slug: 'about', lang: 'en' }
 */
export function parseContentFile(file: string): { slug: string; lang: string | null } | null {
	const m = /^([a-z0-9-]+?)(?:\.([a-z]{2}(?:-[a-zA-Z]{2,4})?))?\.json$/.exec(file);
	if (!m) return null;
	return { slug: m[1], lang: m[2] ?? null };
}
