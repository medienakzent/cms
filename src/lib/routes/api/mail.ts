import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { api } from '../../server/api';
import { CmsError } from '../../server/errors';
import { mail } from '../../server/mail';
import { resolveUpload } from '../../server/mail/uploads';
import { getRuntime } from '../../server/runtime';

const MAX_TEXT_BODY = 64 * 1024;

/** Body als JSON, Formular (urlencoded) oder multipart lesen; Dateien getrennt. */
async function readInput(
	request: Request,
	maxTotal: number
): Promise<{ fields: Record<string, unknown>; files: Record<string, File> }> {
	const ct = (request.headers.get('content-type') ?? '').toLowerCase();
	const len = Number(request.headers.get('content-length') ?? 0);
	const files: Record<string, File> = {};
	if (len > (ct.startsWith('multipart/') ? maxTotal + MAX_TEXT_BODY : MAX_TEXT_BODY))
		throw new CmsError(413, 'Anfrage zu groß');
	if (ct.startsWith('application/json')) {
		const body = await request.json().catch(() => null);
		if (typeof body !== 'object' || body === null || Array.isArray(body))
			throw new CmsError(400, 'JSON-Objekt erwartet');
		return { fields: body as Record<string, unknown>, files };
	}
	if (ct.startsWith('application/x-www-form-urlencoded') || ct.startsWith('multipart/form-data')) {
		const form = await request.formData().catch(() => {
			throw new CmsError(413, 'Anfrage zu groß oder ungültig');
		});
		const out: Record<string, unknown> = {};
		for (const [k, v] of form.entries()) {
			if (typeof v === 'string') out[k] = v;
			else if (v.size > 0) files[k] = v;
		}
		return { fields: out, files };
	}
	throw new CmsError(415, 'JSON oder Formulardaten erwartet');
}

/**
 * POST /api/mail/<vorlage> — öffentlich (Kontakt-/Anfrageformulare).
 * Felder laut Vorlage, optional `_lang` und `_redirect` (für Formulare ohne JS).
 */
export const POST = async (event: RequestEvent) => {
	const { registry, config } = getRuntime();
	const def = registry.mail[event.params.template ?? ''];
	if (!def)
		return api(async () => {
			throw new CmsError(404, `Mail-Vorlage „${event.params.template}" nicht gefunden`);
		});
	const input = await readInput(event.request, def.maxTotalSize).catch((e) => e as CmsError);
	if (input instanceof CmsError)
		return api(async () => {
			throw input;
		});
	const { _lang, _redirect, ...fields } = input.fields;
	const redirectTo =
		typeof _redirect === 'string' && /^\/[^/\\]/.test(_redirect) ? _redirect : null;

	const result = await api(() =>
		mail.send(event.params.template ?? '', fields, {
			lang: typeof _lang === 'string' ? _lang : config.defaultLanguage,
			files: input.files,
			meta: {
				origin: event.url.origin,
				ip: event.getClientAddress(),
				userAgent: event.request.headers.get('user-agent') ?? '',
				url: event.request.headers.get('referer') ?? ''
			}
		})
	);
	if (redirectTo)
		redirect(
			303,
			`${redirectTo}${redirectTo.includes('?') ? '&' : '?'}mail=${result.ok ? 'ok' : 'error'}`
		);
	return result;
};

/** GET /api/mail/download/<token>/<name> — nur mit Token aus der Mail. */
export const DOWNLOAD = async ({ params }: RequestEvent) => {
	const file = await resolveUpload(params.token ?? '', params.name ?? '');
	if (!file) error(404, 'Diese Datei ist nicht (mehr) verfügbar.');
	return new Response(new Uint8Array(file.bytes), {
		headers: {
			'content-type': file.mime,
			'content-length': String(file.bytes.length),
			'content-disposition': `attachment; filename="${file.name.replace(/["\r\n]/g, '')}"`,
			'x-content-type-options': 'nosniff',
			'cache-control': 'no-store',
			'x-robots-tag': 'noindex, nofollow'
		}
	});
};
