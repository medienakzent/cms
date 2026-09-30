import { type RequestEvent } from '@sveltejs/kit';
/**
 * POST /api/analytics: public, rate limited per IP. Receives page views and reading time
 * from the injected script; signed-in users are not counted.
 */
export declare const POST: (event: RequestEvent) => Promise<Response>;
/** GET /api/v1/analytics?days=30&path=/about: visitor statistics for the site or one page. */
export declare const REPORT: ({ url }: RequestEvent) => Promise<Response>;
/**
 * GET /api/v1/analytics/live: Server-Sent Events with the active visits. Sends the current
 * state at once, then on every change, plus a comment line as keep-alive for proxies.
 */
export declare const LIVE: ({ request }: RequestEvent) => Response;
