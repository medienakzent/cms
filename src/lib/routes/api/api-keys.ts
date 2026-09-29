import type { RequestEvent } from '@sveltejs/kit';
import { api, readJsonBody } from '../../server/api';
import { apiKeys } from '../../server/api-keys';
import { CmsError } from '../../server/errors';

function requireSessionAdmin(event: RequestEvent) {
	if (event.locals.user?.role !== 'admin' || event.locals.user.api)
		throw new CmsError(403, 'Nur für angemeldete Administratoren');
}

/** GET /api/v1/api-keys — Liste (ohne Geheimnisse) */
export const GET = (event: RequestEvent) =>
	api(async () => {
		requireSessionAdmin(event);
		return { items: await apiKeys.list() };
	});

/** POST /api/v1/api-keys { name, role } → { info, key } — der Schlüssel ist nur einmal sichtbar */
export const POST = (event: RequestEvent) =>
	api(async () => {
		requireSessionAdmin(event);
		const body = await readJsonBody(event, ['name', 'role']);
		const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
		if (!name) throw new CmsError(400, 'Name fehlt');
		const role = body.role === 'admin' ? 'admin' : body.role === 'editor' ? 'editor' : null;
		if (!role) throw new CmsError(400, 'role: admin oder editor');
		return apiKeys.create(name, role, event.locals.user!.name);
	});

/** DELETE /api/v1/api-keys/<id> — widerrufen (bleibt als widerrufen in der Liste) */
export const DELETE_ITEM = (event: RequestEvent) =>
	api(async () => {
		requireSessionAdmin(event);
		if (!(await apiKeys.revoke(event.params.id ?? '')))
			throw new CmsError(404, 'API-Zugang nicht gefunden');
		return { ok: true };
	});
