import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { extname } from 'node:path';
import type { MediaItem } from '../types';
import { serverConfig, siteConfig } from './runtime';
import { badRequest, notFound } from './errors';
import { getStorage, paths } from './storage';
import { getIndex } from './index/index';
import type { Actor } from './content';

const RASTER = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff', 'image/gif']);

function kindOf(mime: string): MediaItem['kind'] {
	if (mime.startsWith('image/')) return 'image';
	if (mime.startsWith('video/')) return 'video';
	return 'file';
}

function safeExt(name: string, mime: string): string {
	const ext = extname(name).toLowerCase().replace(/[^a-z0-9.]/g, '');
	if (ext && ext.length <= 6) return ext;
	const byMime: Record<string, string> = {
		'image/jpeg': '.jpg',
		'image/png': '.png',
		'image/webp': '.webp',
		'image/gif': '.gif',
		'image/svg+xml': '.svg',
		'video/mp4': '.mp4',
		'application/pdf': '.pdf'
	};
	return byMime[mime] ?? '.bin';
}

/** Sidecar-Datei neben dem Original: macht den Medien-Index aus dem Storage rekonstruierbar. */
const sidecarPath = (src: string) => src.replace(/\.[^./]+$/, '') + '.json';

export async function uploadMedia(file: File, actor: Actor): Promise<MediaItem> {
	if (file.size <= 0) throw badRequest('Leere Datei');
	if (file.size > serverConfig().maxUploadBytes) throw badRequest('Datei zu groß');
	const mime = file.type || 'application/octet-stream';
	const id = nanoid(12);
	const now = new Date();
	const year = String(now.getUTCFullYear());
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');
	const src = paths.media(year, month, `${id}${safeExt(file.name, mime)}`);
	const storage = getStorage();
	const bytes = Buffer.from(await file.arrayBuffer());
	await storage.write(src, bytes);

	let width: number | null = null;
	let height: number | null = null;
	const variants: Record<string, string> = {};
	if (RASTER.has(mime)) {
		try {
			const meta = await sharp(bytes).metadata();
			width = meta.width ?? null;
			height = meta.height ?? null;
			for (const [name, targetWidth] of Object.entries(siteConfig().media.imageVariants)) {
				if (width && targetWidth >= width) continue; // nicht hochskalieren
				const out = await sharp(bytes)
					.rotate()
					.resize({ width: targetWidth, withoutEnlargement: true })
					.webp({ quality: siteConfig().media.imageQuality })
					.toBuffer();
				const vsrc = paths.media(year, month, `${id}__${name}.webp`);
				await storage.write(vsrc, out);
				variants[name] = vsrc;
			}
		} catch (e) {
			console.warn('Bildverarbeitung fehlgeschlagen', e);
		}
	}

	const item: MediaItem = {
		id,
		src,
		mime,
		kind: kindOf(mime),
		width,
		height,
		alt: '',
		variants,
		originalName: file.name,
		size: file.size,
		createdAt: now.toISOString(),
		createdBy: actor.name
	};
	await storage.write(sidecarPath(src), JSON.stringify(item, null, 2));
	await (await getIndex()).insertMedia(item);
	return item;
}

export async function updateMediaAlt(id: string, alt: string): Promise<MediaItem> {
	const index = await getIndex();
	const item = await index.getMedia(id);
	if (!item) throw notFound('Medium');
	item.alt = alt;
	await getStorage().write(sidecarPath(item.src), JSON.stringify(item, null, 2));
	await index.updateMediaAlt(id, alt);
	return item;
}

export async function deleteMedia(id: string): Promise<void> {
	const index = await getIndex();
	const item = await index.getMedia(id);
	if (!item) throw notFound('Medium');
	const storage = getStorage();
	await storage.remove(item.src);
	await storage.remove(sidecarPath(item.src));
	for (const v of Object.values(item.variants)) await storage.remove(v);
	await index.removeMedia(id);
}

export async function reindexMedia(): Promise<number> {
	const storage = getStorage();
	const index = await getIndex();
	await index.clearMedia();
	let n = 0;
	for (const file of await storage.list('media')) {
		if (!file.endsWith('.json')) continue;
		const raw = await storage.read(file);
		if (!raw) continue;
		try {
			const item = JSON.parse(raw) as MediaItem;
			if (item.id && item.src) {
				await index.insertMedia(item);
				n++;
			}
		} catch {
			console.warn('Ungültige Medien-Sidecar-Datei', file);
		}
	}
	return n;
}

export const media = {
	upload: uploadMedia,
	updateAlt: updateMediaAlt,
	remove: deleteMedia,
	reindex: reindexMedia,
	async get(id: string) {
		return (await getIndex()).getMedia(id);
	},
	async list(opts: { kind?: string; q?: string; limit?: number; offset?: number } = {}) {
		return (await getIndex()).listMedia(opts);
	}
};
