import { actorOf, api, readJsonBody } from '../../server/api';
import { collection } from '../../server/content';
import { CmsError } from '../../server/errors';
import { getRuntime } from '../../server/runtime';
/** POST /api/v1/<collection>/<slug>/status  { lang, status: 'draft' | 'published' } */
export const POST = (event) => api(async () => {
    const { languages, config } = getRuntime();
    const body = await readJsonBody(event, ['lang', 'status']);
    const status = body.status;
    if (status !== 'draft' && status !== 'published')
        throw new CmsError(400, 'Ungültiger Status', [
            { path: 'status', message: 'draft oder published' }
        ]);
    if (body.lang !== undefined && !languages.includes(String(body.lang)))
        throw new CmsError(400, 'Unbekannte Sprache');
    return collection(event.params.collection ?? '').setStatus(event.params.slug ?? '', body.lang ?? config.defaultLanguage, status, actorOf(event));
});
