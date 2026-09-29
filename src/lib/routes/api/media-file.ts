import { error, type RequestEvent } from '@sveltejs/kit';
import { getStorage } from '../../server/storage';

const MIME: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif',
	avif: 'image/avif',
	svg: 'image/svg+xml',
	mp4: 'video/mp4',
	webm: 'video/webm',
	pdf: 'application/pdf'
};

/** GET /media/<pfad> — Dateien aus dem Storage (Metadaten-Sidecars ausgenommen). */
export const GET = async ({ params, request }: RequestEvent) => {
	const path = `media/${params.path ?? ''}`;
	if (path.endsWith('.json') || path.includes('..')) error(404);
	const storage = getStorage();
	const st = await storage.stat(path);
	if (!st) error(404);
	const etag = `"${st.size}-${Date.parse(st.mtime)}"`;
	if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304 });
	const bytes = await storage.readBytes(path);
	if (!bytes) error(404);
	const ext = path.split('.').pop()?.toLowerCase() ?? '';
	return new Response(new Uint8Array(bytes), {
		headers: {
			'content-type': MIME[ext] ?? 'application/octet-stream',
			'content-length': String(bytes.length),
			'cache-control': 'public, max-age=31536000, immutable',
			'x-content-type-options': 'nosniff',
			// Kein Skript aus Medien (z. B. SVG) — als <img> weiterhin nutzbar.
			'content-security-policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'",
			etag
		}
	});
};
