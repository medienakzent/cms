import { error } from '@sveltejs/kit';
/** Form page for a new account; admins with a browser session only. */
export async function load({ locals }) {
    if (locals.user?.role !== 'admin' || locals.user.api)
        error(403, 'Nur für Administratoren');
    return {
        breadcrumbs: [
            { label: 'Übersicht', href: '/admin' },
            { label: 'Nutzer', href: '/admin/users' },
            { label: 'Konto anlegen' }
        ]
    };
}
