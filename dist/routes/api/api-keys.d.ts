import type { RequestEvent } from '@sveltejs/kit';
/** GET /api/v1/api-keys: list without secrets */
export declare const GET: (event: RequestEvent) => Promise<Response>;
/** POST /api/v1/api-keys { name, role } -> { info, key }; the key is shown only once */
export declare const POST: (event: RequestEvent) => Promise<Response>;
/** DELETE /api/v1/api-keys/<id>: revoke (stays in the list as revoked) */
export declare const DELETE_ITEM: (event: RequestEvent) => Promise<Response>;
