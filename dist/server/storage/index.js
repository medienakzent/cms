import { serverConfig } from '../runtime';
import { FsStorage } from './fs';
let instance = null;
/** Storage singleton. Branch here for other adapters (e.g. by `STORAGE_URL`). */
export function getStorage() {
    if (!instance)
        instance = new FsStorage(serverConfig().storageDir);
    return instance;
}
/** Path conventions, defined in exactly one place. */
export const paths = {
    base: (collection, slug) => `content/${collection}/${slug}.json`,
    overlay: (collection, slug, lang) => `content/${collection}/${slug}.${lang}.json`,
    collectionDir: (collection) => `content/${collection}`,
    historyDir: (collection, slug) => `history/${collection}/${slug}`,
    history: (collection, slug, versionId) => `history/${collection}/${slug}/${versionId}.json`,
    media: (year, month, file) => `media/${year}/${month}/${file}`
};
/**
 * Splits a file name under content/<collection>/ into slug + language.
 * `about.json` → { slug: 'about', lang: null }, `about.en.json` → { slug: 'about', lang: 'en' }
 */
export function parseContentFile(file) {
    const match = /^([a-z0-9-]+?)(?:\.([a-z]{2}(?:-[a-zA-Z]{2,4})?))?\.json$/.exec(file);
    if (!match)
        return null;
    return { slug: match[1], lang: match[2] ?? null };
}
