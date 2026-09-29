import sharp from 'sharp';
import { extensionFor } from './mime';
import { nanoid } from 'nanoid';
import { extname } from 'node:path';
import type { MediaItem } from '../types';
import { serverConfig, siteConfig } from './runtime';
import { badRequest, notFound } from './errors';
import { getStorage, paths } from './storage';
import { getIndex } from './index/index';
import type { Actor } from './content';

const RASTER = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/avif',
	'image/tiff',
	'image/gif'
]);

function kindOf(mime: string): MediaItem['kind'] {
	if (mime.startsWith('image/')) return 'image';
	if (mime.startsWith('video/')) return 'video';
	return 'file';
}

function safeExtension(name: string, mime: string): string {
	const extension = extname(name)
		.toLowerCase()
		.replace(/[^a-z0-9.]/g, '');
	if (extension && extension.length <= 6) return extension;
	return extensionFor(mime) ?? '.bin';
}

/** Sidecar file next to the original; makes the media index reconstructible from the storage. */
const sidecarPath = (src: string) => src.replace(/\.[^./]+$/, '') + '.json';

export async function uploadMedia(file: File, actor: Actor): Promise<MediaItem> {
	if (file.size <= 0) throw badRequest('Leere Datei');
	if (file.size > serverConfig().maxUploadBytes) throw badRequest('Datei zu groß');
	const mime = file.type || 'application/octet-stream';
	const id = nanoid(12);
	const now = new Date();
	const year = String(now.getUTCFullYear());
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');
	const src = paths.media(year, month, `${id}${safeExtension(file.name, mime)}`);
	const storage = getStorage();
	const bytes = Buffer.from(await file.arrayBuffer());
	await storage.write(src, bytes);

	let width: number | null = null;
	let height: number | null = null;
	const variants: Record<string, string> = {};
	if (RASTER.has(mime)) {
		try {
			const metadata = await sharp(bytes).metadata();
			width = metadata.width ?? null;
			height = metadata.height ?? null;
			for (const [name, targetWidth] of Object.entries(siteConfig().media.imageVariants)) {
				if (width && targetWidth >= width) continue;
				const resized = await sharp(bytes)
					.rotate()
					.resize({ width: targetWidth, withoutEnlargement: true })
					.webp({ quality: siteConfig().media.imageQuality })
					.toBuffer();
				const variantSrc = paths.media(year, month, `${id}__${name}.webp`);
				await storage.write(variantSrc, resized);
				variants[name] = variantSrc;
			}
		} catch (error) {
			console.warn('Bildverarbeitung fehlgeschlagen', error);
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
	for (const variantSrc of Object.values(item.variants)) await storage.remove(variantSrc);
	await index.removeMedia(id);
}

export async function reindexMedia(): Promise<number> {
	const storage = getStorage();
	const index = await getIndex();
	await index.clearMedia();
	let count = 0;
	for (const file of await storage.list('media')) {
		if (!file.endsWith('.json')) continue;
		const raw = await storage.read(file);
		if (!raw) continue;
		try {
			const item = JSON.parse(raw) as MediaItem;
			if (item.id && item.src) {
				await index.insertMedia(item);
				count++;
			}
		} catch {
			console.warn('Ungültige Medien-Sidecar-Datei', file);
		}
	}
	return count;
}

export const media = {
	upload: uploadMedia,
	updateAlt: updateMediaAlt,
	remove: deleteMedia,
	reindex: reindexMedia,
	async get(id: string) {
		return (await getIndex()).getMedia(id);
	},
	async list(options: { kind?: string; q?: string; limit?: number; offset?: number } = {}) {
		return (await getIndex()).listMedia(options);
	}
};
