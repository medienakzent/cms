import type { RequestEvent } from '@sveltejs/kit';
/**
 * GET /llms.txt: overview for AI search systems (llmstxt.org convention) with site name,
 * description and the published pages (title and URL). Complements sitemap.xml and JSON-LD.
 */
export declare const GET: (_event: RequestEvent) => Promise<Response>;
