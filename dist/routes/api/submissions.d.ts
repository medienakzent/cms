import type { RequestEvent } from '@sveltejs/kit';
/**
 * GET /api/v1/submissions?template=&status=all|sent|failed|spam&limit=50&offset=0
 * Only with login or API token (hook); form data is never public.
 */
export declare const GET: (event: RequestEvent) => Promise<Response>;
/** GET /api/v1/submissions/<id> */
export declare const GET_ITEM: (event: RequestEvent) => Promise<Response>;
/** DELETE /api/v1/submissions/<id>: including uploaded files */
export declare const DELETE_ITEM: (event: RequestEvent) => Promise<Response>;
