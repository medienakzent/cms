import type { RequestEvent } from '@sveltejs/kit';
/**
 * GET /api/v1/<collection>
 *   ?lang=de&status=published|draft|all&q=text&limit=50&offset=0&sort=-updatedAt
 *   &filter[field]=value  &filter[field][op]=value   (op: eq ne in nin lt lte gt gte contains)
 */
export declare const GET: (event: RequestEvent) => Promise<Response>;
/** POST /api/v1/<collection>  { slug, lang?, status?, fields?, blocks? } */
export declare const POST: (event: RequestEvent) => Promise<Response>;
