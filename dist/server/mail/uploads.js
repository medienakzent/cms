/**
 * Form file uploads: stored under `mail/uploads/<token>/`, downloadable only
 * with the token (link in the mail), pruned after the retention period.
 */
import { nanoid } from 'nanoid';
import { serverConfig } from '../runtime';
import { getStorage } from '../storage';
import { formatBytes } from '../../format';
import { extensionFor } from '../mime';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24}$/;
/** File signatures used to verify the type reported by the browser. */
const MAGIC = {
    'application/pdf': (bytes) => bytes.subarray(0, 4).toString('latin1') === '%PDF',
    'image/png': (bytes) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
    'image/jpeg': (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    'image/webp': (bytes) => bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
        bytes.subarray(8, 12).toString('latin1') === 'WEBP',
    'image/gif': (bytes) => bytes.subarray(0, 3).toString('latin1') === 'GIF'
};
export function safeFileName(name, mime) {
    const base = String(name || 'datei')
        .split(/[\\/]/)
        .pop() ?? 'datei';
    let cleaned = base
        .replace(/[^\w.\- ]+/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_{2,}/g, '_')
        .slice(-120);
    const extension = extensionFor(mime);
    if (extension && !cleaned.toLowerCase().endsWith(extension))
        cleaned += extension;
    return cleaned || `datei${extension ?? ''}`;
}
/** Checks an uploaded file against the field definition (type, signature, size). */
export async function checkFile(key, field, file, issues) {
    if (file.size <= 0)
        return null;
    if (field.maxSize && file.size > field.maxSize) {
        issues.push({ path: key, message: `Maximal ${formatBytes(field.maxSize)} je Datei` });
        return null;
    }
    const accept = field.accept ?? [];
    const mime = file.type || 'application/octet-stream';
    if (accept.length && !accept.includes(mime)) {
        issues.push({
            path: key,
            message: `Erlaubte Dateitypen: ${accept.map((type) => extensionFor(type) ?? type).join(', ')}`
        });
        return null;
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const matchesSignature = MAGIC[mime];
    if (matchesSignature && !matchesSignature(bytes)) {
        issues.push({ path: key, message: 'Die Datei entspricht nicht ihrem Dateityp' });
        return null;
    }
    return { key, name: file.name, mime, bytes };
}
/** Stores the files of one submission and returns the references with download URLs. */
export async function storeFiles(files, origin) {
    const token = nanoid(24);
    const storage = getStorage();
    const refs = {};
    for (const file of files) {
        const storedName = `${file.key}__${safeFileName(file.name, file.mime)}`;
        const path = `mail/uploads/${token}/${storedName}`;
        await storage.write(path, file.bytes);
        refs[file.key] = {
            name: file.name,
            size: file.bytes.length,
            mime: file.mime,
            path,
            url: `${origin}/api/mail/download/${token}/${encodeURIComponent(storedName)}`
        };
    }
    await storage.write(`mail/uploads/${token}/meta.json`, JSON.stringify({ token, storedAt: new Date().toISOString(), files: Object.values(refs) }, null, 2));
    return { token, refs };
}
async function readUploadMeta(token) {
    const raw = await getStorage().read(`mail/uploads/${token}/meta.json`);
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.files) ? { files: parsed.files } : null;
    }
    catch {
        return null;
    }
}
/** Resolves a file for download: valid token only, never outside the folder. */
export async function resolveUpload(token, name) {
    if (!TOKEN_PATTERN.test(token) ||
        name.includes('/') ||
        name.includes('\\') ||
        name.startsWith('.') ||
        name === 'meta.json')
        return null;
    const storage = getStorage();
    const path = `mail/uploads/${token}/${name}`;
    const bytes = await storage.readBytes(path);
    if (!bytes)
        return null;
    const entry = (await readUploadMeta(token))?.files.find((file) => file.path === path);
    return { bytes, mime: entry?.mime ?? 'application/octet-stream', name: entry?.name ?? name };
}
/** Deletes upload folders older than the retention period. */
export async function pruneUploads() {
    const days = serverConfig().mail.uploadRetentionDays;
    if (!days)
        return 0;
    const storage = getStorage();
    const cutoff = Date.now() - days * 86_400_000;
    let removed = 0;
    const metaFiles = (await storage.list('mail/uploads')).filter((file) => file.endsWith('/meta.json'));
    for (const metaFile of metaFiles) {
        const stat = await storage.stat(metaFile);
        if (!stat || Date.parse(stat.mtime) >= cutoff)
            continue;
        const directory = metaFile.slice(0, -'/meta.json'.length);
        if (storage.removeDir)
            await storage.removeDir(directory);
        else
            for (const file of await storage.list(directory))
                await storage.remove(file);
        removed++;
    }
    return removed;
}
