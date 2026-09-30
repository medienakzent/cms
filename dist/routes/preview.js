import { error } from '@sveltejs/kit';
import { getRuntime } from '../server/runtime';
/**
 * Live preview frame of the editor, mounted inside the site layout so the customer's
 * stylesheet, fonts and layout data apply. Only signed-in users may open it.
 */
export async function load({ locals, params }) {
    if (!locals.user)
        error(404, 'Nicht gefunden');
    const { config } = getRuntime();
    return { title: 'Vorschau', lang: params.lang ?? config.defaultLanguage };
}
