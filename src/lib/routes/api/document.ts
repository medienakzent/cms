import type { RequestEvent } from '@sveltejs/kit';
import { actorOf, api, parseDocumentBody, readJsonBody } from '../../server/api';
import { collection } from '../../server/content';
import { CmsError } from '../../server/errors';
import { getRuntime } from '../../server/runtime';

const ALLOWED_GET = ['lang', 'fallback', 'status', 'editable'];

function checkParams(searchParams: URLSearchParams, allowed: string[]) {
	const unknown = [...searchParams.keys()].filter((key) => !allowed.includes(key));
	if (unknown.length)
		throw new CmsError(
			400,
			'Unbekannte Parameter',
			unknown.map((key) => ({ path: key, message: `Erlaubt: ${allowed.join(', ')}` }))
		);
}
function langParam(searchParams: URLSearchParams): string {
	const { languages, config } = getRuntime();
	const lang = searchParams.get('lang') ?? config.defaultLanguage;
	if (!languages.includes(lang))
		throw new CmsError(400, 'Unbekannte Sprache', [
			{ path: 'lang', message: `Erlaubt: ${languages.join(', ')}` }
		]);
	return lang;
}

/** GET /api/v1/<collection>/<slug>?lang=de&fallback=0&status=all&editable=1 */
export const GET = (event: RequestEvent) =>
	api(async () => {
		const searchParams = event.url.searchParams;
		checkParams(searchParams, ALLOWED_GET);
		const lang = langParam(searchParams);
		const status = searchParams.get('status') ?? 'all';
		if (status !== 'draft' && status !== 'published' && status !== 'all')
			throw new CmsError(400, 'status: draft, published oder all');
		const documents = collection(event.params.collection ?? '');
		const slug = event.params.slug ?? '';
		if (searchParams.get('editable') === '1') {
			const editable = await documents.getEditable(slug, lang);
			if (!editable) throw new CmsError(404, 'Dokument nicht gefunden');
			return editable;
		}
		const result = await documents.get(slug, {
			lang,
			fallback: searchParams.get('fallback') !== '0',
			status
		});
		if (!result) throw new CmsError(404, 'Dokument nicht gefunden');
		return result;
	});

/** PUT /api/v1/<collection>/<slug>?lang=de  { fields, blocks, status? } */
export const PUT = (event: RequestEvent) =>
	api(async () => {
		checkParams(event.url.searchParams, ['lang']);
		const lang = langParam(event.url.searchParams);
		const documentInput = parseDocumentBody(
			await readJsonBody(event, ['fields', 'blocks', 'status'])
		);
		return collection(event.params.collection ?? '').save(
			event.params.slug ?? '',
			lang,
			{ fields: documentInput.fields, blocks: documentInput.blocks },
			{ actor: actorOf(event), status: documentInput.status }
		);
	});

/** DELETE /api/v1/<collection>/<slug>[?lang=de]; without lang the whole document is removed */
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
