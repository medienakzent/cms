import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { api, limitRequestBody } from '../../server/api';
import { CmsError } from '../../server/errors';
import { mail } from '../../server/mail';
import { resolveUpload } from '../../server/mail/uploads';
import { getRuntime } from '../../server/runtime';

const MAX_TEXT_BODY = 64 * 1024;

/** Reads the body as JSON, urlencoded form or multipart; files are returned separately. */
async function readInput(
	request: Request,
	maxTotal: number
): Promise<{ fields: Record<string, unknown>; files: Record<string, File> }> {
	const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
	const files: Record<string, File> = {};
	request = limitRequestBody(
		request,
		contentType.startsWith('multipart/') ? maxTotal + MAX_TEXT_BODY : MAX_TEXT_BODY
	);
	if (contentType.startsWith('application/json')) {
		const body = await request.json().catch((cause: unknown) => {
			if (cause instanceof CmsError) throw cause;
			return null;
		});
		if (typeof body !== 'object' || body === null || Array.isArray(body))
			throw new CmsError(400, 'JSON-Objekt erwartet');
		return { fields: body as Record<string, unknown>, files };
	}
	if (
		contentType.startsWith('application/x-www-form-urlencoded') ||
		contentType.startsWith('multipart/form-data')
	) {
		const form = await request.formData().catch((cause: unknown) => {
			throw cause instanceof CmsError ? cause : new CmsError(413, 'Anfrage zu groß oder ungültig');
		});
		const fields: Record<string, unknown> = {};
		for (const [key, value] of form.entries()) {
			if (typeof value === 'string') fields[key] = value;
			else if (value.size > 0) files[key] = value;
		}
		return { fields, files };
	}
	throw new CmsError(415, 'JSON oder Formulardaten erwartet');
}

/**
 * POST /api/mail/<template>: public (contact and request forms).
 * Fields per template, optional `_lang` and `_redirect` (for forms without JS).
 */
export const POST = async (event: RequestEvent) => {
	const { registry, config } = getRuntime();
	const definition = registry.mail[event.params.template ?? ''];
	if (!definition)
		return api(async () => {
			throw new CmsError(404, `Mail-Vorlage „${event.params.template}" nicht gefunden`);
		});
	const redirectTarget: { to: string | null } = { to: null };
	const result = await api(async () => {
		const input = await readInput(event.request, definition.maxTotalSize);
		const { _lang, _redirect, ...fields } = input.fields;
		redirectTarget.to =
			typeof _redirect === 'string' && /^\/[^/\\]/.test(_redirect) ? _redirect : null;
		return mail.send(event.params.template ?? '', fields, {
			lang: typeof _lang === 'string' ? _lang : config.defaultLanguage,
			files: input.files,
			meta: {
				origin: event.url.origin,
				ip: event.getClientAddress(),
				userAgent: event.request.headers.get('user-agent') ?? '',
				url: event.request.headers.get('referer') ?? ''
			}
		});
	});
	const redirectTo = redirectTarget.to;
	if (redirectTo)
		redirect(
			303,
			`${redirectTo}${redirectTo.includes('?') ? '&' : '?'}mail=${result.ok ? 'ok' : 'error'}`
		);
	return result;
};

function attachmentDisposition(name: string): string {
	const ascii = name.replace(/[^\w.\- ]/g, '_');
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** GET /api/mail/download/<token>/<name>: only with the token from the mail */
export const DOWNLOAD = async ({ params }: RequestEvent) => {
	const file = await resolveUpload(params.token ?? '', params.name ?? '');
	if (!file) error(404, 'Diese Datei ist nicht (mehr) verfügbar.');
	return new Response(new Uint8Array(file.bytes), {
		headers: {
			'content-type': file.mime,
			'content-length': String(file.bytes.length),
			'content-disposition': attachmentDisposition(file.name),
			'x-content-type-options': 'nosniff',
			'cache-control': 'no-store',
			'x-robots-tag': 'noindex, nofollow'
		}
	});
};
