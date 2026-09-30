import type { RequestEvent } from '@sveltejs/kit';
/** GET /api/v1/<collection>/<slug>?lang=de&fallback=0&status=all&editable=1 */
export declare const GET: (event: RequestEvent) => Promise<Response>;
/** PUT /api/v1/<collection>/<slug>?lang=de  { fields, blocks, status? } */
export declare const PUT: (event: RequestEvent) => Promise<Response>;
/** DELETE /api/v1/<collection>/<slug>[?lang=de]; without lang the whole document is removed */
export declare const DELETE: (event: RequestEvent) => Promise<Response>;
