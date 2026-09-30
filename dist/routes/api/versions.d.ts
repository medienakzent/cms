import type { RequestEvent } from '@sveltejs/kit';
/** GET /api/v1/<collection>/<slug>/versions */
export declare const GET: (event: RequestEvent) => Promise<Response>;
/** POST /api/v1/<collection>/<slug>/versions/<version>/restore */
export declare const RESTORE: (event: RequestEvent) => Promise<Response>;
