import { error, type RequestEvent } from '@sveltejs/kit';
import { getStorage } from '../../server/storage';
import { MIME_BY_EXTENSION } from '../../server/mime';

/** GET /media/<path>: files from storage (metadata sidecars excluded) */
export const GET = async ({ params, request }: RequestEvent) => {
	const path = `media/${params.path ?? ''}`;
	if (path.toLowerCase().endsWith('.json') || path.includes('..')) error(404);
	const storage = getStorage();
	const fileStat = await storage.stat(path);
	if (!fileStat) error(404);
	const etag = `"${fileStat.size}-${Date.parse(fileStat.mtime)}"`;
	if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304 });
	const bytes = await storage.readBytes(path);
	if (!bytes) error(404);
	const extension = path.split('.').pop()?.toLowerCase() ?? '';
	return new Response(new Uint8Array(bytes), {
		headers: {
			'content-type': MIME_BY_EXTENSION[extension] ?? 'application/octet-stream',
			'content-length': String(bytes.length),
			'cache-control': 'public, max-age=31536000, immutable',
			'x-content-type-options': 'nosniff',
			// No scripts from media (e.g. SVG); still usable as <img>.
			'content-security-policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'",
			etag
		}
	});
};
