import type { Handle, HandleServerError } from '@sveltejs/kit';
import type { Registry } from '../registry';
import type { Env } from './env';
export interface HandleOptions {
    /** Environment; in the customer project `env` from `$env/dynamic/private`. */
    env: Env;
    /** `building` from `$app/environment`: never touch the database during the build. */
    building?: boolean;
    /** Admin path (default `/admin`). */
    adminPath?: string;
}
/**
 * SvelteKit error hook: logs unexpected errors and, only with DEBUG_ERRORS=1 (staging), shows
 * message and stack trace on the error page. Production pages keep the generic message.
 * In the customer project (hooks.server.ts):
 *
 *   export const handleError = createHandleError({ env });
 */
export declare function createHandleError(options: {
    env: Env;
}): HandleServerError;
/**
 * SvelteKit handle of the CMS: initialises the runtime, serves the auth endpoints,
 * loads the session, guards the admin and secures the API with token/session and rate limits.
 * In the customer project (hooks.server.ts):
 *
 *   export const handle = createHandle(registry, { env, building });
 */
export declare function createHandle(registry: Registry, options: HandleOptions): Handle;
