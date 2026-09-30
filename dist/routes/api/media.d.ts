import type { RequestEvent } from '@sveltejs/kit';
/** GET /api/v1/media?kind=image&q=&limit=&offset= */
export declare const GET: (event: RequestEvent) => Promise<Response>;
/** POST /api/v1/media  multipart/form-data, field `file` (may repeat) */
export declare const POST: (event: RequestEvent) => Promise<Response>;
/** GET /api/v1/media/<id> */
export declare const GET_ITEM: (event: RequestEvent) => Promise<Response>;
/** PATCH /api/v1/media/<id>  { alt } */
export declare const PATCH_ITEM: (event: RequestEvent) => Promise<Response>;
/** DELETE /api/v1/media/<id> */
export declare const DELETE_ITEM: (event: RequestEvent) => Promise<Response>;
