import { redirect } from '@sveltejs/kit';
import { getDb } from '../../server/db';
import { serverConfig } from '../../server/runtime';
/** Only site-internal targets are accepted as return address after login. */
function safeReturnTo(value) {
    return value && /^\/[^/\\]/.test(value) ? value : '/admin';
}
export async function load({ locals, url }) {
    const returnTo = safeReturnTo(url.searchParams.get('returnTo'));
    if (locals.user)
        redirect(303, returnTo);
    // Offer signup when allowed or when no account exists yet (the first user becomes admin).
    let signup = serverConfig().allowSignup;
    if (!signup) {
        try {
            const row = await (await getDb()).get('SELECT COUNT(*) AS count FROM "user"');
            signup = Number(row?.count ?? 0) === 0;
        }
        catch {
            signup = false;
        }
    }
    return { returnTo, signup, breadcrumbs: [{ label: 'Anmelden' }] };
}
