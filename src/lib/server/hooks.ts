import { timingSafeEqual } from 'node:crypto';
import type { Handle } from '@sveltejs/kit';
import type { Registry } from '../registry';
import { getAuth, getSessionUser } from './auth';
import type { Env } from './env';
import { ensureReady } from './init';
import { createRateLimiter } from './rate-limit';
import { initRuntime } from './runtime';
import { apiKeys } from './api-keys';

export interface HandleOptions {
	/** Umgebung — im Kundenprojekt `env` aus `$env/dynamic/private`. */
	env: Env;
	/** `building` aus `$app/environment`: beim Build keine Datenbank anfassen. */
	building?: boolean;
	/** Pfad des Admins (Default `/admin`). */
	adminPath?: string;
}

/** Konstantzeit-Vergleich für Geheimnisse. */
function safeEqual(a: string, b: string): boolean {
	const x = Buffer.from(a);
	const y = Buffer.from(b);
	return x.length === y.length && timingSafeEqual(x, y);
}

/** Schutz-Header für Admin und API — die Website bleibt unberührt (Kundensache). */
function harden(response: Response): Response {
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	return response;
}

const jsonError = (status: number, error: string, headers: Record<string, string> = {}) =>
	new Response(JSON.stringify({ error }), {
		status,
		headers: { 'content-type': 'application/json', ...headers }
	});

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
	const captchaLimiter = createRateLimiter({ windowMs: 60_000, max: rl.captchaPerMinute });
	const adminPath = options.adminPath ?? '/admin';

	return async ({ event, resolve }) => {
		if (options.building) return resolve(event);
		await ensureReady();
		const auth = await getAuth();
		const { pathname } = event.url;

		// Auth-Endpunkte (Login, OAuth-Callbacks, Session) bedient Better Auth direkt.
		if (pathname.startsWith('/api/auth/')) return auth.handler(event.request);

		// Captcha-Aufgaben: öffentlich, eigenes (großzügigeres) Rate-Limit je IP.
		if (pathname.startsWith('/api/captcha/')) {
			const r = captchaLimiter.check(`ip:${event.getClientAddress()}`);
			if (!r.ok)
				return jsonError(429, 'Zu viele Anfragen', { 'retry-after': String(r.retryAfter) });
			return resolve(event);
		}

		// Öffentliche Formular-API: nur Rate-Limit je IP, keine Anmeldung.
		if (pathname.startsWith('/api/mail/') && !pathname.startsWith('/api/mail/download/')) {
			const r = mailLimiter.check(`ip:${event.getClientAddress()}`);
			if (!r.ok)
				return jsonError(429, 'Zu viele Anfragen', { 'retry-after': String(r.retryAfter) });
			return resolve(event);
		}

		// API-Zugänge (Bearer) — nur für /api/v1: verwaltete Schlüssel mit Rolle (Admin → Nutzer),
		// optional der Bootstrap-Token API_TOKEN aus der Umgebung (Rolle admin, z. B. für den Seed).
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
			const r = user
				? userLimiter.check(`u:${user.id}`)
				: anonLimiter.check(`ip:${event.getClientAddress()}`);
			const rlHeaders = {
				'x-ratelimit-limit': String(r.limit),
				'x-ratelimit-remaining': String(r.remaining)
			};
			if (!r.ok)
				return jsonError(429, 'Zu viele Anfragen', {
					...rlHeaders,
					'retry-after': String(r.retryAfter)
				});
			if (!user) return jsonError(401, 'Nicht angemeldet', rlHeaders);
			const response = harden(await resolve(event));
			for (const [k, v] of Object.entries(rlHeaders)) response.headers.set(k, v);
			return response;
		}

		if (pathname.startsWith(adminPath)) {
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
