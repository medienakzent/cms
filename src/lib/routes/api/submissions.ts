import type { RequestEvent } from '@sveltejs/kit';
import { api } from '../../server/api';
import { CmsError } from '../../server/errors';
import { mail, type MailSubmission } from '../../server/mail';

const STATUS = ['all', 'sent', 'failed', 'spam'];
const ALLOWED = ['template', 'status', 'limit', 'offset'];

/**
 * GET /api/v1/submissions?template=&status=all|sent|failed|spam&limit=50&offset=0
 * Only with login or API token (hook); form data is never public.
 */
export const GET = (event: RequestEvent) =>
	api(async () => {
		const searchParams = event.url.searchParams;
		const unknown = [...searchParams.keys()].filter((key) => !ALLOWED.includes(key));
		if (unknown.length)
			throw new CmsError(
				400,
				'Unbekannte Parameter',
				unknown.map((key) => ({ path: key, message: `Erlaubt: ${ALLOWED.join(', ')}` }))
			);
		const status = searchParams.get('status') ?? 'all';
		if (!STATUS.includes(status)) throw new CmsError(400, 'status: all, sent, failed oder spam');
		const template = searchParams.get('template') ?? undefined;
		if (template && !mail.templates[template])
			throw new CmsError(400, `Mail-Vorlage „${template}" nicht gefunden`);
		const integerParam = (key: string, fallback: number) => {
			const value = searchParams.get(key);
			if (value === null) return fallback;
			if (!/^\d+$/.test(value)) throw new CmsError(400, `${key}: Ganzzahl erwartet`);
			return Number(value);
		};
		return mail.submissions({
			template,
			status: status as MailSubmission['status'] | 'all',
			limit: integerParam('limit', 50),
			offset: integerParam('offset', 0)
		});
	});

/** GET /api/v1/submissions/<id> */
export const GET_ITEM = (event: RequestEvent) =>
	api(async () => {
		const submission = await mail.submission(event.params.id ?? '');
		if (!submission) throw new CmsError(404, 'Einsendung nicht gefunden');
		return submission;
	});

/** DELETE /api/v1/submissions/<id>: including uploaded files */
export const DELETE_ITEM = (event: RequestEvent) =>
	api(async () => {
		await mail.deleteSubmission(event.params.id ?? '');
		return { ok: true };
	});
