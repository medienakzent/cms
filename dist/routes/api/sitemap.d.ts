import type { RequestEvent } from '@sveltejs/kit';
/**
 * GET /sitemap.xml: all published documents of all collections that have a path,
 * per language with hreflang alternates. Base URL is ORIGIN.
 */
export declare const GET: (_event: RequestEvent) => Promise<Response>;
