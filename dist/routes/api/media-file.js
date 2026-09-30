import { error } from '@sveltejs/kit';
import { mediaFileResponse } from '../../server/media-response';
import { getStorage } from '../../server/storage';
/** GET /media/<path>: files from storage (no metadata sidecars, no hidden files), with byte ranges */
export const GET = async ({ params, request }) => {
    const path = `media/${params.path ?? ''}`;
    const hidden = path.split('/').some((segment) => segment.startsWith('.'));
    if (path.toLowerCase().endsWith('.json') || hidden)
        error(404);
    const response = await mediaFileResponse(getStorage(), path, request);
    if (!response)
        error(404);
    return response;
};
