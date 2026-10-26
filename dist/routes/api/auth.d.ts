import type { RequestEvent } from '@sveltejs/kit';
/**
 * /api/auth/…: Better Auth. The hook answers these requests before routing; the route exists so
 * that a site catch-all with `trailingSlash = 'always'` does not match and redirect them.
 */
declare function handler({ request }: RequestEvent): Promise<Response>;
export declare const GET: typeof handler;
export declare const POST: typeof handler;
export {};
