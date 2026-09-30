/**
 * Inline script injected into website pages. It stores nothing in the browser: it reports
 * each page path (client navigations included) and the visible reading time of that page.
 * History is patched before SvelteKit starts, so the router picks up the patched methods.
 */
export declare const ANALYTICS_ENDPOINT = "/api/analytics";
export declare const ANALYTICS_SCRIPT: string;
