/**
 * Datei-Uploads aus Formularen: Ablage unter `mail/uploads/<token>/`, Download
 * nur mit Token (Link in der Mail), Aufräumen nach Aufbewahrungsfrist.
 */
import { nanoid } from 'nanoid';
import type { FileField } from '../../fields';
import type { FileRef, ValidationIssue } from '../../types';
import { serverConfig } from '../runtime';
import { getStorage } from '../storage';

const TOKEN_RE = /^[A-Za-z0-9_-]{24}$/;

/** Signaturen, mit denen der vom Browser gemeldete Typ verifiziert wird. */
const MAGIC: Record<string, (b: Buffer) => boolean> = {
	'application/pdf': (b) => b.subarray(0, 4).toString('latin1') === '%PDF',
	'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
	'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
	'image/webp': (b) =>
		b.subarray(0, 4).toString('latin1') === 'RIFF' &&
		b.subarray(8, 12).toString('latin1') === 'WEBP',
	'image/gif': (b) => b.subarray(0, 3).toString('latin1') === 'GIF'
};

const EXT: Record<string, string> = {
	'application/pdf': '.pdf',
	'image/png': '.png',
	'image/jpeg': '.jpg',
	'image/webp': '.webp',
	'image/gif': '.gif'
};

export function safeFileName(name: string, mime: string): string {
	const base =
		String(name || 'datei')
			.split(/[\\/]/)
			.pop() ?? 'datei';
	let cleaned = base
		.replace(/[^\w.\- ]+/g, '_')
		.replace(/\s+/g, '_')
		.replace(/_{2,}/g, '_')
		.slice(-120);
	const ext = EXT[mime];
	if (ext && !cleaned.toLowerCase().endsWith(ext)) cleaned += ext;
	return cleaned || `datei${ext ?? ''}`;
}

export function formatBytes(bytes: number): string {
	const mb = bytes / 1048576;
	return mb < 0.1
		? `${Math.max(1, Math.round(bytes / 1024))} KB`
		: `${mb.toFixed(1).replace('.', ',')} MB`;
}

export interface CheckedFile {
	key: string;
	name: string;
	mime: string;
	bytes: Buffer;
}

/** Prüft eine hochgeladene Datei gegen die Felddefinition (Typ, Signatur, Größe). */
export async function checkFile(
	key: string,
	field: FileField,
	file: File,
	issues: ValidationIssue[]
): Promise<CheckedFile | null> {
	if (file.size <= 0) return null;
	if (field.maxSize && file.size > field.maxSize) {
		issues.push({ path: key, message: `Maximal ${formatBytes(field.maxSize)} je Datei` });
		return null;
	}
	const accept = field.accept ?? [];
	const mime = file.type || 'application/octet-stream';
	if (accept.length && !accept.includes(mime)) {
		issues.push({
			path: key,
			message: `Erlaubte Dateitypen: ${accept.map((m) => EXT[m] ?? m).join(', ')}`
		});
		return null;
	}
	const bytes = Buffer.from(await file.arrayBuffer());
	const sniff = MAGIC[mime];
	if (sniff && !sniff(bytes)) {
		issues.push({ path: key, message: 'Die Datei entspricht nicht ihrem Dateityp' });
		return null;
	}
	return { key, name: file.name, mime, bytes };
}

/** Legt die Dateien einer Sendung ab und liefert die Referenzen mit Download-URLs. */
export async function storeFiles(
	files: CheckedFile[],
	origin: string
): Promise<{ token: string; refs: Record<string, FileRef> }> {
	const token = nanoid(24);
	const storage = getStorage();
	const refs: Record<string, FileRef> = {};
	for (const f of files) {
		const stored = `${f.key}__${safeFileName(f.name, f.mime)}`;
		const path = `mail/uploads/${token}/${stored}`;
		await storage.write(path, f.bytes);
		refs[f.key] = {
			name: f.name,
			size: f.bytes.length,
			mime: f.mime,
			path,
			url: `${origin}/api/mail/download/${token}/${encodeURIComponent(stored)}`
		};
	}
	await storage.write(
		`mail/uploads/${token}/meta.json`,
		JSON.stringify(
			{ token, storedAt: new Date().toISOString(), files: Object.values(refs) },
			null,
			2
		)
	);
	return { token, refs };
}

/** Datei für den Download auflösen — nur mit gültigem Token, nur innerhalb des Ordners. */
export async function resolveUpload(
	token: string,
	name: string
): Promise<{ bytes: Buffer; mime: string; name: string } | null> {
	if (
		!TOKEN_RE.test(token) ||
		name.includes('/') ||
		name.includes('\\') ||
		name.startsWith('.') ||
		name === 'meta.json'
	)
		return null;
	const storage = getStorage();
	const path = `mail/uploads/${token}/${name}`;
	const bytes = await storage.readBytes(path);
	if (!bytes) return null;
	const meta = await storage.read(`mail/uploads/${token}/meta.json`);
	const entry = meta
		? (JSON.parse(meta).files as FileRef[]).find((f) => f.path === path)
		: undefined;
	return { bytes, mime: entry?.mime ?? 'application/octet-stream', name: entry?.name ?? name };
}

/** Löscht Upload-Ordner, die älter als die Aufbewahrungsfrist sind. */
export async function pruneUploads(): Promise<number> {
	const days = serverConfig().mail.uploadRetentionDays;
	if (!days) return 0;
	const storage = getStorage();
	const cutoff = Date.now() - days * 86_400_000;
	let removed = 0;
	const metas = (await storage.list('mail/uploads')).filter((f) => f.endsWith('/meta.json'));
	for (const meta of metas) {
		const st = await storage.stat(meta);
		if (!st || Date.parse(st.mtime) >= cutoff) continue;
		const dir = meta.slice(0, -'/meta.json'.length);
		if (storage.removeDir) await storage.removeDir(dir);
		else for (const f of await storage.list(dir)) await storage.remove(f);
		removed++;
	}
	return removed;
}
