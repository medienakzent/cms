import { type RequestEvent } from '@sveltejs/kit';
/** GET /media/<path>: files from storage (no metadata sidecars, no hidden files), with byte ranges */
export declare const GET: ({ params, request }: RequestEvent) => Promise<Response>;
