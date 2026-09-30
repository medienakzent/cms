import { error } from '@sveltejs/kit';
import { hasPasswordLogin } from '../../server/auth';
import { serverConfig } from '../../server/runtime';
/** Second factor of the signed-in user: set up, renew backup codes, switch off. */
export async function load({ locals }) {
    const mode = serverConfig().twoFactor;
    if (mode === 'off' || !locals.user || locals.user.api)
        error(404, 'Nicht gefunden');
    return {
        mode,
        enabled: !!locals.user.twoFactorEnabled,
        passwordLogin: await hasPasswordLogin(locals.user.id),
        breadcrumbs: [{ label: 'Übersicht', href: '/admin' }, { label: 'Sicherheit' }]
    };
}
