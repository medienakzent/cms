import type { RequestEvent } from '@sveltejs/kit';
import { api } from '../../server/api';
import { CmsError } from '../../server/errors';
import { mail, type MailSubmission } from '../../server/mail';

const STATUS = ['all', 'sent', 'failed', 'spam'];
const ALLOWED = ['template', 'status', 'limit', 'offset'];

/**
 * GET /api/v1/submissions?template=&status=all|sent|failed|spam&limit=50&offset=0
 * Nur mit Anmeldung oder API-Token (Hook) — Formulardaten sind nie öffentlich.
 */
export const GET = (event: RequestEvent) =>
	api(async () => {
		const p = event.url.searchParams;
		const unknown = [...p.keys()].filter((k) => !ALLOWED.includes(k));
		if (unknown.length) throw new CmsError(400, 'Unbekannte Parameter', unknown.map((k) => ({ path: k, message: `Erlaubt: ${ALLOWED.join(', ')}` })));
		const status = p.get('status') ?? 'all';
		if (!STATUS.includes(status)) throw new CmsError(400, 'status: all, sent, failed oder spam');
		const template = p.get('template') ?? undefined;
		if (template && !mail.templates[template]) throw new CmsError(404, `Mail-Vorlage „${template}" nicht gefunden`);
		const num = (k: string, d: number) => {
			const v = p.get(k);
			if (v === null) return d;
			if (!/^\d+$/.test(v)) throw new CmsError(400, `${k}: Ganzzahl erwartet`);
			return Number(v);
		};
		return mail.submissions({ template, status: status as MailSubmission['status'] | 'all', limit: num('limit', 50), offset: num('offset', 0) });
	});

/** GET /api/v1/submissions/<id> */
export const GET_ITEM = (event: RequestEvent) =>
	api(async () => {
		const sub = await mail.submission(event.params.id ?? '');
		if (!sub) throw new CmsError(404, 'Einsendung nicht gefunden');
		return sub;
	});

/** DELETE /api/v1/submissions/<id> — samt hochgeladener Dateien */
export const DELETE_ITEM = (event: RequestEvent) =>
	api(async () => {
		await mail.deleteSubmission(event.params.id ?? '');
		return { ok: true };
	});
