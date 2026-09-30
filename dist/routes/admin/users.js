import { error } from '@sveltejs/kit';
import { apiKeys } from '../../server/api-keys';
import { getAuth } from '../../server/auth';
import { serverConfig } from '../../server/runtime';
/** User list, admins only (the auth plugin checks this as well). */
export async function load({ locals, request }) {
    if (locals.user?.role !== 'admin')
        error(403, 'Nur für Administratoren');
    const auth = await getAuth();
    const result = await auth.api.listUsers({
        query: { limit: 200, sortBy: 'createdAt', sortDirection: 'asc' },
        headers: request.headers
    });
    const users = result.users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role ?? 'editor',
        createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
        banned: !!user.banned,
        twoFactorEnabled: !!user.twoFactorEnabled
    }));
    return {
        users,
        twoFactor: serverConfig().twoFactor,
        apiKeys: await apiKeys.list(),
        breadcrumbs: [{ label: 'Übersicht', href: '/admin' }, { label: 'Nutzer' }]
    };
}
