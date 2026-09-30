import type { StorageAdapter } from './types';
export type { ByteRange, StorageAdapter } from './types';
/** Storage singleton. Branch here for other adapters (e.g. by `STORAGE_URL`). */
export declare function getStorage(): StorageAdapter;
/** Path conventions, defined in exactly one place. */
export declare const paths: {
    base: (collection: string, slug: string) => string;
    overlay: (collection: string, slug: string, lang: string) => string;
    collectionDir: (collection: string) => string;
    historyDir: (collection: string, slug: string) => string;
    history: (collection: string, slug: string, versionId: string) => string;
    media: (year: string, month: string, file: string) => string;
};
/**
 * Splits a file name under content/<collection>/ into slug + language.
 * `about.json` → { slug: 'about', lang: null }, `about.en.json` → { slug: 'about', lang: 'en' }
 */
export declare function parseContentFile(file: string): {
    slug: string;
    lang: string | null;
} | null;
