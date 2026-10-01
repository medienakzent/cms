import { error } from '@sveltejs/kit';
import { apiKeys } from '../../server/api-keys';
import { getAuth } from '../../server/auth';
import { getDb } from '../../server/db';
import { serverConfig } from '../../server/runtime';
/** Newest session start per user (ISO string), straight from the Better Auth session table. */
async function lastSignIns() {
    const rows = await (await getDb()).all('SELECT "userId" AS user_id, MAX("createdAt") AS last FROM "session" GROUP BY "userId"');
    return new Map(rows.map((row) => [
        row.user_id,
        row.last instanceof Date ? row.last.toISOString() : new Date(String(row.last)).toISOString()
    ]));
}
/** User list, admins only (the auth plugin checks this as well). */
export async function load({ locals, request }) {
    if (locals.user?.role !== 'admin')
        error(403, 'Nur für Administratoren');
    const auth = await getAuth();
    const result = await auth.api.listUsers({
        query: { limit: 200, sortBy: 'createdAt', sortDirection: 'asc' },
        headers: request.headers
    });
    const signIns = await lastSignIns();
    const users = result.users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role ?? 'editor',
        createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
        banned: !!user.banned,
        twoFactorEnabled: !!user.twoFactorEnabled,
        lastSignInAt: signIns.get(user.id) ?? null
    }));
    return {
        users,
        twoFactor: serverConfig().twoFactor,
        apiKeys: await apiKeys.list(),
        breadcrumbs: [{ label: 'Übersicht', href: '/admin' }, { label: 'Nutzer' }]
    };
}
