import { timingSafeEqual } from 'node:crypto';
import { jsonError } from './api';
import type { Handle } from '@sveltejs/kit';
import type { Registry } from '../registry';
import { getAuth, getSessionUser } from './auth';
import type { Env } from './env';
import { ensureReady } from './init';
import { createRateLimiter } from './rate-limit';
import { initRuntime } from './runtime';
import { apiKeys } from './api-keys';

export interface HandleOptions {
	/** Environment; in the customer project `env` from `$env/dynamic/private`. */
	env: Env;
	/** `building` from `$app/environment`: never touch the database during the build. */
	building?: boolean;
	/** Admin path (default `/admin`). */
	adminPath?: string;
}

/** Constant-time comparison for secrets. */
function safeEqual(left: string, right: string): boolean {
	const leftBytes = Buffer.from(left);
	const rightBytes = Buffer.from(right);
	return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

/** Protective headers for admin and API; the website itself is the customer's concern. */
function harden(response: Response): Response {
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	return response;
}

/**
 * SvelteKit routes on the decoded path, so guards must decide on the decoded path
 * as well. Undecodable paths are rejected.
 */
function decodedPathname(pathname: string): string | null {
	try {
		return decodeURIComponent(pathname);
	} catch {
		return null;
	}
}

/**
 * SvelteKit handle of the CMS: initialises the runtime, serves the auth endpoints,
 * loads the session, guards the admin and secures the API with token/session and rate limits.
 * In the customer project (hooks.server.ts):
 *
 *   export const handle = createHandle(registry, { env, building });
 */
export function createHandle(registry: Registry, options: HandleOptions): Handle {
	const runtime = initRuntime(registry, options.env);
	const rateLimit = runtime.server.rateLimit;
	const userLimiter = createRateLimiter({ windowMs: 60_000, max: rateLimit.perMinute });
	const anonLimiter = createRateLimiter({ windowMs: 60_000, max: rateLimit.anonPerMinute });
	const mailLimiter = createRateLimiter({ windowMs: 60_000, max: rateLimit.mailPerMinute });
	const captchaLimiter = createRateLimiter({ windowMs: 60_000, max: rateLimit.captchaPerMinute });
	const adminPath = options.adminPath ?? '/admin';

	return async ({ event, resolve }) => {
		if (options.building) return resolve(event);
		await ensureReady();
		const auth = await getAuth();
		const pathname = decodedPathname(event.url.pathname);
		if (pathname === null) return jsonError(400, 'Ungültiger Pfad');

		// Auth endpoints (login, OAuth callbacks, session) are served by Better Auth directly.
		if (pathname.startsWith('/api/auth/')) return auth.handler(event.request);

		// Captcha challenges: public, own (more generous) rate limit per IP.
		if (pathname.startsWith('/api/captcha/')) {
			const result = captchaLimiter.check(`ip:${event.getClientAddress()}`);
			if (!result.ok)
				return jsonError(429, 'Zu viele Anfragen', { 'retry-after': String(result.retryAfter) });
			return resolve(event);
		}

		// Public form API: rate limit per IP only, no sign-in.
		if (pathname.startsWith('/api/mail/') && !pathname.startsWith('/api/mail/download/')) {
			const result = mailLimiter.check(`ip:${event.getClientAddress()}`);
			if (!result.ok)
				return jsonError(429, 'Zu viele Anfragen', { 'retry-after': String(result.retryAfter) });
			return resolve(event);
		}

		// Bearer keys, /api/v1 only: managed keys with a role, optionally the bootstrap
		// token API_TOKEN from the environment (role admin, e.g. for seeding).
		const bearer = event.request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
		event.locals.user = null;
		if (pathname.startsWith('/api/v1/') && bearer) {
			if (runtime.server.apiToken && safeEqual(bearer, runtime.server.apiToken)) {
				event.locals.user = {
					id: 'api:env',
					name: 'API-Token (Umgebung)',
					email: '',
					image: '',
					role: 'admin',
					api: true
				};
			} else {
				const key = await apiKeys.verify(bearer);
				if (key)
					event.locals.user = {
						id: `api:${key.id}`,
						name: key.name,
						email: '',
						image: '',
						role: key.role,
						api: true
					};
			}
		} else {
			event.locals.user = await getSessionUser(event.request.headers);
		}

		if (pathname.startsWith('/api/v1/')) {
			const user = event.locals.user;
			const result = user
				? userLimiter.check(`u:${user.id}`)
				: anonLimiter.check(`ip:${event.getClientAddress()}`);
			const rateLimitHeaders = {
				'x-ratelimit-limit': String(result.limit),
				'x-ratelimit-remaining': String(result.remaining)
			};
			if (!result.ok)
				return jsonError(429, 'Zu viele Anfragen', {
					...rateLimitHeaders,
					'retry-after': String(result.retryAfter)
				});
			if (!user) return jsonError(401, 'Nicht angemeldet', rateLimitHeaders);
			const response = harden(await resolve(event));
			for (const [name, value] of Object.entries(rateLimitHeaders))
				response.headers.set(name, value);
			return response;
		}

		if (pathname === adminPath || pathname.startsWith(`${adminPath}/`)) {
			const open = pathname === `${adminPath}/login` || pathname === `${adminPath}/reset`;
			if (!open && !event.locals.user) {
				return new Response(null, {
					status: 303,
					headers: {
						location: `${adminPath}/login?returnTo=${encodeURIComponent(pathname + event.url.search)}`
					}
				});
			}
			return harden(await resolve(event));
		}
		return resolve(event);
	};
}
