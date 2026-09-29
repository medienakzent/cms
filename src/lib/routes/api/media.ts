import type { RequestEvent } from '@sveltejs/kit';
import { actorOf, api, readJsonBody } from '../../server/api';
import { CmsError } from '../../server/errors';
import { media } from '../../server/media';

/** GET /api/v1/media?kind=image&q=&limit=&offset= */
export const GET = (event: RequestEvent) =>
	api(async () => {
		const p = event.url.searchParams;
		return media.list({ kind: p.get('kind') ?? undefined, q: p.get('q') ?? undefined, limit: Number(p.get('limit') ?? 60), offset: Number(p.get('offset') ?? 0) });
	});

/** POST /api/v1/media  multipart/form-data, Feld `file` (mehrfach erlaubt) */
export const POST = (event: RequestEvent) =>
	api(async () => {
		const form = await event.request.formData();
		const files = form.getAll('file').filter((f): f is File => f instanceof File);
		if (!files.length) throw new CmsError(400, 'Keine Datei (Feld „file")');
		const items = [];
		for (const file of files) items.push(await media.upload(file, actorOf(event)));
		return { items };
	});

/** GET /api/v1/media/<id> */
export const GET_ITEM = (event: RequestEvent) =>
	api(async () => {
		const item = await media.get(event.params.id ?? '');
		if (!item) throw new CmsError(404, 'Medium nicht gefunden');
		return item;
	});

/** PATCH /api/v1/media/<id>  { alt } */
export const PATCH_ITEM = (event: RequestEvent) =>
	api(async () => {
		const body = await readJsonBody(event, ['alt']);
		if (typeof body.alt !== 'string' || body.alt.length > 500) throw new CmsError(400, 'alt: Text bis 500 Zeichen');
		return media.updateAlt(event.params.id ?? '', body.alt);
	});

/** DELETE /api/v1/media/<id> */
export const DELETE_ITEM = (event: RequestEvent) =>
	api(async () => {
		await media.remove(event.params.id ?? '');
		return { ok: true };
	});
