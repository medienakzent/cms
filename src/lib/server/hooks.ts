import type { Handle } from '@sveltejs/kit';
import type { Registry } from '../registry';
import { getAuth, getSessionUser } from './auth';
import type { Env } from './env';
import { ensureReady } from './init';
import { createRateLimiter } from './rate-limit';
import { initRuntime } from './runtime';

export interface HandleOptions {
	/** Umgebung — im Kundenprojekt `env` aus `$env/dynamic/private`. */
	env: Env;
	/** `building` aus `$app/environment`: beim Build keine Datenbank anfassen. */
	building?: boolean;
	/** Pfad des Admins (Default `/admin`). */
	adminPath?: string;
}

const jsonError = (status: number, error: string, headers: Record<string, string> = {}) =>
	new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json', ...headers } });

/**
 * SvelteKit-Handle des CMS: Laufzeit initialisieren, Auth-Endpunkte bedienen,
 * Session laden, Admin schützen, API mit Token/Session und Rate-Limit absichern.
 * Im Kundenprojekt (hooks.server.ts):
 *
 *   export const handle = createHandle(registry, { env, building });
 */
export function createHandle(registry: Registry, options: HandleOptions): Handle {
	const runtime = initRuntime(registry, options.env);
	const rl = runtime.server.rateLimit;
	const userLimiter = createRateLimiter({ windowMs: 60_000, max: rl.perMinute });
	const anonLimiter = createRateLimiter({ windowMs: 60_000, max: rl.anonPerMinute });
	const mailLimiter = createRateLimiter({ windowMs: 60_000, max: rl.mailPerMinute });
	const adminPath = options.adminPath ?? '/admin';

	return async ({ event, resolve }) => {
		if (options.building) return resolve(event);
		await ensureReady();
		const auth = await getAuth();
		const { pathname } = event.url;

		// Auth-Endpunkte (Login, OAuth-Callbacks, Session) bedient Better Auth direkt.
		if (pathname.startsWith('/api/auth/')) return auth.handler(event.request);

		// Öffentliche Formular-API: nur Rate-Limit je IP, keine Anmeldung.
		if (pathname.startsWith('/api/mail/') && !pathname.startsWith('/api/mail/download/')) {
			const r = mailLimiter.check(`ip:${event.getClientAddress()}`);
			if (!r.ok) return jsonError(429, 'Zu viele Anfragen', { 'retry-after': String(r.retryAfter) });
			return resolve(event);
		}

		// API-Token für Skripte/CI — nur für /api/v1.
		const bearer = event.request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
		if (pathname.startsWith('/api/v1/') && bearer && runtime.server.apiToken && bearer === runtime.server.apiToken) {
			event.locals.user = { id: 'api', name: 'API', email: '', image: '', role: 'admin' };
		} else {
			event.locals.user = await getSessionUser(event.request.headers);
		}

		if (pathname.startsWith('/api/v1/')) {
			const user = event.locals.user;
			const r = user ? userLimiter.check(`u:${user.id}`) : anonLimiter.check(`ip:${event.getClientAddress()}`);
			const rlHeaders = { 'x-ratelimit-limit': String(r.limit), 'x-ratelimit-remaining': String(r.remaining) };
			if (!r.ok) return jsonError(429, 'Zu viele Anfragen', { ...rlHeaders, 'retry-after': String(r.retryAfter) });
			if (!user) return jsonError(401, 'Nicht angemeldet', rlHeaders);
			const response = await resolve(event);
			for (const [k, v] of Object.entries(rlHeaders)) response.headers.set(k, v);
			return response;
		}

		if (pathname.startsWith(adminPath) && pathname !== `${adminPath}/login` && !event.locals.user) {
			// Plain Response statt redirect(): funktioniert auch, wenn Kit doppelt aufgelöst wird (lokale Links).
			return new Response(null, { status: 303, headers: { location: `${adminPath}/login?returnTo=${encodeURIComponent(pathname + event.url.search)}` } });
		}
		return resolve(event);
	};
}
