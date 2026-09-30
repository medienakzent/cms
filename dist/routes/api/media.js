import { actorOf, api, limitRequestBody, readJsonBody } from '../../server/api';
import { CmsError } from '../../server/errors';
import { media } from '../../server/media';
import { serverConfig } from '../../server/runtime';
function integerParam(value, fallback) {
    if (value === null)
        return fallback;
    if (!/^\d{1,9}$/.test(value))
        throw new CmsError(400, 'Ganzzahl erwartet');
    return Number(value);
}
/** GET /api/v1/media?kind=image&q=&limit=&offset= */
export const GET = (event) => api(async () => {
    const searchParams = event.url.searchParams;
    return media.list({
        kind: searchParams.get('kind') ?? undefined,
        q: searchParams.get('q') ?? undefined,
        limit: integerParam(searchParams.get('limit'), 60),
        offset: integerParam(searchParams.get('offset'), 0)
    });
});
/** POST /api/v1/media  multipart/form-data, field `file` (may repeat) */
export const POST = (event) => api(async () => {
    const maxBytes = serverConfig().maxUploadBytes;
    const form = await limitRequestBody(event.request, maxBytes * 4 + 64 * 1024)
        .formData()
        .catch((cause) => {
        throw cause instanceof CmsError ? cause : new CmsError(400, 'Ungültige Formulardaten');
    });
    const files = form.getAll('file').filter((entry) => entry instanceof File);
    if (!files.length)
        throw new CmsError(400, 'Keine Datei (Feld „file")');
    const items = [];
    for (const file of files)
        items.push(await media.upload(file, actorOf(event)));
    return { items };
});
/** GET /api/v1/media/<id> */
export const GET_ITEM = (event) => api(async () => {
    const item = await media.get(event.params.id ?? '');
    if (!item)
        throw new CmsError(404, 'Medium nicht gefunden');
    return item;
});
/** PATCH /api/v1/media/<id>  { alt } */
export const PATCH_ITEM = (event) => api(async () => {
    const body = await readJsonBody(event, ['alt']);
    if (typeof body.alt !== 'string' || body.alt.length > 500)
        throw new CmsError(400, 'alt: Text bis 500 Zeichen');
    return media.updateAlt(event.params.id ?? '', body.alt);
});
/** DELETE /api/v1/media/<id> */
export const DELETE_ITEM = (event) => api(async () => {
    await media.remove(event.params.id ?? '');
    return { ok: true };
});
