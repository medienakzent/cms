import { adminCollections } from '../../server/admin';
import { authOptions } from '../../server/auth';
import { getRuntime } from '../../server/runtime';
export async function load({ locals }) {
    const { config } = getRuntime();
    return {
        user: locals.user,
        collections: adminCollections(),
        languages: config.languages,
        defaultLanguage: config.defaultLanguage,
        siteName: config.site.name,
        siteFavicon: config.site.favicon,
        auth: authOptions()
    };
}
