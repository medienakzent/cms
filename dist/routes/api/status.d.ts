import type { RequestEvent } from '@sveltejs/kit';
/** POST /api/v1/<collection>/<slug>/status  { lang, status: 'draft' | 'published' } */
export declare const POST: (event: RequestEvent) => Promise<Response>;
