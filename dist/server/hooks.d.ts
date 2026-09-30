import type { Handle } from '@sveltejs/kit';
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
 * SvelteKit handle of the CMS: initialises the runtime, serves the auth endpoints,
 * loads the session, guards the admin and secures the API with token/session and rate limits.
 * In the customer project (hooks.server.ts):
 *
 *   export const handle = createHandle(registry, { env, building });
 */
export declare function createHandle(registry: Registry, options: HandleOptions): Handle;
