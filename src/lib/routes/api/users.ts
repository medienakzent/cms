import type { RequestEvent } from '@sveltejs/kit';
import { api, readJsonBody } from '../../server/api';
import { getAuth } from '../../server/auth';
import { CmsError } from '../../server/errors';

const ROLES = ['admin', 'editor'];

function requireSessionAdmin(event: RequestEvent) {
	// Nutzerverwaltung nur mit echter Sitzung eines Administrators — nicht per API-Token.
	if (event.locals.user?.role !== 'admin' || event.locals.user.api)
		throw new CmsError(403, 'Nur für angemeldete Administratoren');
}

/** POST /api/v1/users  { name, email, password, role } */
export const POST = (event: RequestEvent) =>
	api(async () => {
		requireSessionAdmin(event);
		const body = await readJsonBody(event, ['name', 'email', 'password', 'role']);
		if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
			throw new CmsError(400, 'Gültige E-Mail-Adresse erwartet');
		if (typeof body.password !== 'string' || body.password.length < 8)
			throw new CmsError(400, 'Passwort: mindestens 8 Zeichen');
		const role = typeof body.role === 'string' && ROLES.includes(body.role) ? body.role : 'editor';
		const auth = await getAuth();
		const created = await auth.api.createUser({
			body: {
				email: body.email,
				password: body.password,
				name: typeof body.name === 'string' && body.name ? body.name : body.email,
				role: role as 'admin' | 'editor'
			},
			headers: event.request.headers
		});
		return { id: created.user.id };
	});

/** PATCH /api/v1/users/<id>  { role?, password?, name? } */
export const PATCH_ITEM = (event: RequestEvent) =>
	api(async () => {
		requireSessionAdmin(event);
		const id = event.params.id ?? '';
		const body = await readJsonBody(event, ['role', 'password', 'name', 'banned']);
		const auth = await getAuth();
		if (body.role !== undefined) {
			if (typeof body.role !== 'string' || !ROLES.includes(body.role))
				throw new CmsError(400, 'role: admin oder editor');
			if (id === event.locals.user!.id && body.role !== 'admin')
				throw new CmsError(400, 'Die eigene Admin-Rolle kann nicht entfernt werden');
			await auth.api.setRole({
				body: { userId: id, role: body.role as 'admin' | 'editor' },
				headers: event.request.headers
			});
		}
		if (body.password !== undefined) {
			if (typeof body.password !== 'string' || body.password.length < 8)
				throw new CmsError(400, 'Passwort: mindestens 8 Zeichen');
			await auth.api.setUserPassword({
				body: { userId: id, newPassword: body.password },
				headers: event.request.headers
			});
		}
		if (body.banned !== undefined) {
			if (typeof body.banned !== 'boolean') throw new CmsError(400, 'banned: true oder false');
			if (id === event.locals.user!.id)
				throw new CmsError(400, 'Das eigene Konto kann nicht gesperrt werden');
			if (body.banned)
				await auth.api.banUser({
					body: { userId: id, banReason: 'Vom Administrator gesperrt' },
					headers: event.request.headers
				});
			else await auth.api.unbanUser({ body: { userId: id }, headers: event.request.headers });
		}
		if (body.name !== undefined) {
			if (typeof body.name !== 'string' || !body.name.trim()) throw new CmsError(400, 'Name fehlt');
			await auth.api.adminUpdateUser({
				body: { userId: id, data: { name: body.name.trim() } },
				headers: event.request.headers
			});
		}
		return { ok: true };
	});

/** DELETE /api/v1/users/<id> */
export const DELETE_ITEM = (event: RequestEvent) =>
	api(async () => {
		requireSessionAdmin(event);
		const id = event.params.id ?? '';
		if (id === event.locals.user!.id)
			throw new CmsError(400, 'Das eigene Konto kann nicht gelöscht werden');
		const auth = await getAuth();
		await auth.api.removeUser({ body: { userId: id }, headers: event.request.headers });
		return { ok: true };
	});
