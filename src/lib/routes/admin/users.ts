import { error, type ServerLoadEvent } from '@sveltejs/kit';
import { getAuth } from '../../server/auth';

export interface AdminUser {
	id: string;
	name: string;
	email: string;
	role: string;
	createdAt: string;
	banned: boolean;
}

/** Nutzerliste — nur für Administratoren (das Auth-Plugin prüft zusätzlich selbst). */
export async function load({ locals, request }: ServerLoadEvent) {
	if (locals.user?.role !== 'admin') error(403, 'Nur für Administratoren');
	const auth = await getAuth();
	const result = await auth.api.listUsers({
		query: { limit: 200, sortBy: 'createdAt', sortDirection: 'asc' },
		headers: request.headers
	});
	const users: AdminUser[] = result.users.map((u) => ({
		id: u.id,
		name: u.name,
		email: u.email,
		role: (u as { role?: string | null }).role ?? 'editor',
		createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
		banned: !!(u as { banned?: boolean | null }).banned
	}));
	return { users, breadcrumbs: [{ label: 'Übersicht', href: '/admin' }, { label: 'Nutzer' }] };
}
