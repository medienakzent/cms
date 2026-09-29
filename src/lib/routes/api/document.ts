import type { RequestEvent } from '@sveltejs/kit';
import { actorOf, api, parseDocumentBody, readJsonBody } from '../../server/api';
import { collection } from '../../server/content';
import { CmsError } from '../../server/errors';
import { getRuntime } from '../../server/runtime';

const ALLOWED_GET = ['lang', 'fallback', 'status', 'editable'];

function checkParams(p: URLSearchParams, allowed: string[]) {
	const unknown = [...p.keys()].filter((k) => !allowed.includes(k));
	if (unknown.length)
		throw new CmsError(
			400,
			'Unbekannte Parameter',
			unknown.map((k) => ({ path: k, message: `Erlaubt: ${allowed.join(', ')}` }))
		);
}
function langParam(p: URLSearchParams): string {
	const { languages, config } = getRuntime();
	const lang = p.get('lang') ?? config.defaultLanguage;
	if (!languages.includes(lang))
		throw new CmsError(400, 'Unbekannte Sprache', [
			{ path: 'lang', message: `Erlaubt: ${languages.join(', ')}` }
		]);
	return lang;
}

/** GET /api/v1/<collection>/<slug>?lang=de&fallback=0&status=all&editable=1 */
export const GET = (event: RequestEvent) =>
	api(async () => {
		const p = event.url.searchParams;
		checkParams(p, ALLOWED_GET);
		const lang = langParam(p);
		const status = p.get('status') ?? 'all';
		if (status !== 'draft' && status !== 'published' && status !== 'all')
			throw new CmsError(400, 'status: draft, published oder all');
		const c = collection(event.params.collection ?? '');
		const slug = event.params.slug ?? '';
		if (p.get('editable') === '1') {
			const r = await c.getEditable(slug, lang);
			if (!r) throw new CmsError(404, 'Dokument nicht gefunden');
			return r;
		}
		const doc = await c.get(slug, { lang, fallback: p.get('fallback') !== '0', status });
		if (!doc) throw new CmsError(404, 'Dokument nicht gefunden');
		return doc;
	});

/** PUT /api/v1/<collection>/<slug>?lang=de  { fields, blocks, status? } */
export const PUT = (event: RequestEvent) =>
	api(async () => {
		checkParams(event.url.searchParams, ['lang']);
		const lang = langParam(event.url.searchParams);
		const doc = parseDocumentBody(await readJsonBody(event, ['fields', 'blocks', 'status']));
		return collection(event.params.collection ?? '').save(
			event.params.slug ?? '',
			lang,
			{ fields: doc.fields, blocks: doc.blocks },
			{ actor: actorOf(event), status: doc.status }
		);
	});

/** DELETE /api/v1/<collection>/<slug>[?lang=de]  — ohne lang: ganzes Dokument */
export const DELETE = (event: RequestEvent) =>
	api(async () => {
		checkParams(event.url.searchParams, ['lang']);
		const lang = event.url.searchParams.has('lang') ? langParam(event.url.searchParams) : undefined;
		await collection(event.params.collection ?? '').remove(event.params.slug ?? '', {
			lang,
			actor: actorOf(event)
		});
		return { ok: true };
	});
