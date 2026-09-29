import type { RequestEvent } from '@sveltejs/kit';
import { parseListQuery } from '../../query';
import { isValidSlug } from '../../slug';
import { actorOf, api, parseDocumentBody, readJsonBody } from '../../server/api';
import { collection } from '../../server/content';
import { CmsError } from '../../server/errors';
import { getRuntime } from '../../server/runtime';

/**
 * GET /api/v1/<collection>
 *   ?lang=de&status=published|draft|all&q=text&limit=50&offset=0&sort=-updatedAt
 *   &filter[feld]=wert  &filter[feld][op]=wert   (op: eq ne in nin lt lte gt gte contains)
 */
export const GET = (event: RequestEvent) =>
	api(async () => {
		const { registry, languages } = getRuntime();
		const def = registry.collections[event.params.collection ?? ''];
		if (!def) throw new CmsError(404, `Collection „${event.params.collection}" nicht gefunden`);
		return collection(def.name).list(parseListQuery(def, event.url.searchParams, languages));
	});

/** POST /api/v1/<collection>  { slug, lang?, status?, fields?, blocks? } */
export const POST = (event: RequestEvent) =>
	api(async () => {
		const { languages, config } = getRuntime();
		const body = await readJsonBody(event, ['slug', 'lang', 'status', 'fields', 'blocks']);
		if (typeof body.slug !== 'string' || !isValidSlug(body.slug))
			throw new CmsError(400, 'Ungültiger Slug', [
				{ path: 'slug', message: 'a-z, 0-9, Bindestriche' }
			]);
		if (
			body.lang !== undefined &&
			(typeof body.lang !== 'string' || !languages.includes(body.lang))
		)
			throw new CmsError(400, 'Unbekannte Sprache', [
				{ path: 'lang', message: `Erlaubt: ${languages.join(', ')}` }
			]);
		const doc = parseDocumentBody(body);
		return collection(event.params.collection ?? '').create({
			slug: body.slug,
			lang: (body.lang as string | undefined) ?? config.defaultLanguage,
			status: doc.status,
			input: { fields: doc.fields, blocks: doc.blocks },
			actor: actorOf(event)
		});
	});
