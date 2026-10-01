import { timingSafeEqual } from 'node:crypto';
import { jsonError } from './api';
import { getAuth, getSessionUser, hasPasswordLogin } from './auth';
import { ensureReady } from './init';
import { createRateLimiter } from './rate-limit';
import { initRuntime } from './runtime';
import { apiKeys } from './api-keys';
import { ANALYTICS_ENDPOINT, ANALYTICS_SCRIPT } from './analytics/script';
/**
 * SvelteKit error hook: logs unexpected errors and, only with DEBUG_ERRORS=1 (staging), shows
 * message and stack trace on the error page. Production pages keep the generic message.
 * In the customer project (hooks.server.ts):
 *
 *   export const handleError = createHandleError({ env });
 */
export function createHandleError(options) {
    const debug = options.env.DEBUG_ERRORS === '1';
    return ({ error, status, message }) => {
        if (status === 404)
            return { message };
        console.error(error);
        if (!debug)
            return { message };
        return { message: error instanceof Error ? (error.stack ?? error.message) : String(error) };
    };
}
/** Constant-time comparison for secrets. */
function safeEqual(left, right) {
    const leftBytes = Buffer.from(left);
    const rightBytes = Buffer.from(right);
    return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}
/** Protective headers for admin and API; the website itself is the customer's concern. */
function harden(response) {
    response.headers.set('x-content-type-options', 'nosniff');
    response.headers.set('x-frame-options', 'DENY');
    response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
    return response;
}
/**
 * SvelteKit announces every stylesheet and script of a page in a `Link` header (on rendered pages
 * only there, not in the HTML). Pages with many chunks (the admin) exceed nginx's default upstream
 * header buffer of 4 KB, which answers 502 ("upstream sent too big header"). The header is cut
 * after the entries that fit; SvelteKit lists stylesheets and entry scripts first, the browser
 * finds the remaining chunks through the imports.
 */
const MAX_LINK_HEADER = 2048;
export function limitLinkHeader(response) {
    const link = response.headers.get('link');
    if (!link || link.length <= MAX_LINK_HEADER)
        return response;
    const kept = [];
    let length = 0;
    for (const entry of link.split(/,\s*(?=<)/)) {
        const added = entry.length + (kept.length ? 2 : 0);
        if (length + added > MAX_LINK_HEADER)
            break;
        kept.push(entry);
        length += added;
    }
    try {
        if (kept.length)
            response.headers.set('link', kept.join(', '));
        else
            response.headers.delete('link');
    }
    catch {
        // Immutable headers (e.g. a proxied fetch response) carry no SvelteKit preloads.
    }
    return response;
}
/**
 * SvelteKit routes on the decoded path, so guards must decide on the decoded path
 * as well. Undecodable paths are rejected.
 */
function decodedPathname(pathname) {
    try {
        return decodeURIComponent(pathname);
    }
    catch {
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
export function createHandle(registry, options) {
    const runtime = initRuntime(registry, options.env);
    const rateLimit = runtime.server.rateLimit;
    const userLimiter = createRateLimiter({ windowMs: 60_000, max: rateLimit.perMinute });
    const anonLimiter = createRateLimiter({ windowMs: 60_000, max: rateLimit.anonPerMinute });
    const mailLimiter = createRateLimiter({ windowMs: 60_000, max: rateLimit.mailPerMinute });
    const captchaLimiter = createRateLimiter({ windowMs: 60_000, max: rateLimit.captchaPerMinute });
    const analyticsLimiter = createRateLimiter({
        windowMs: 60_000,
        max: rateLimit.analyticsPerMinute
    });
    const adminPath = options.adminPath ?? '/admin';
    const languageCodes = new Set(runtime.languages);
    /**
     * Language of a page for `<html lang="%lang%">` in app.html: the first path segment when it is a
     * configured language (`/en/…`), otherwise the default language. The admin is German.
     */
    function pageLanguage(pathname) {
        if (pathname === adminPath || pathname.startsWith(`${adminPath}/`))
            return 'de';
        const segment = pathname.split('/')[1] ?? '';
        return languageCodes.has(segment) ? segment : runtime.config.defaultLanguage;
    }
    /** Server-rendered HTML: language placeholder and, for counted visitors, the statistics script. */
    function renderOptions(pathname, countVisit) {
        const language = pageLanguage(pathname);
        return {
            transformPageChunk: ({ html }) => {
                const localized = html.replaceAll('%lang%', language);
                return countVisit ? localized.replace('</body>', `${ANALYTICS_SCRIPT}</body>`) : localized;
            }
        };
    }
    /** TWO_FACTOR=required: password accounts without a second factor may only set it up. */
    async function secondFactorMissing(user) {
        if (runtime.server.twoFactor !== 'required' || !user || user.api || user.twoFactorEnabled)
            return false;
        return hasPasswordLogin(user.id);
    }
    return async ({ event, resolve }) => {
        if (options.building)
            return resolve(event);
        await ensureReady();
        const auth = await getAuth();
        const pathname = decodedPathname(event.url.pathname);
        if (pathname === null)
            return jsonError(400, 'Ungültiger Pfad');
        // Auth endpoints (login, OAuth callbacks, session) are served by Better Auth directly.
        if (pathname.startsWith('/api/auth/'))
            return auth.handler(event.request);
        // Captcha challenges: public, own (more generous) rate limit per IP.
        if (pathname.startsWith('/api/captcha/')) {
            const result = captchaLimiter.check(`ip:${event.getClientAddress()}`);
            if (!result.ok)
                return jsonError(429, 'Zu viele Anfragen', { 'retry-after': String(result.retryAfter) });
            return resolve(event);
        }
        // Visitor statistics: public, rate limit per IP; the route skips signed-in users.
        if (pathname === ANALYTICS_ENDPOINT) {
            const result = analyticsLimiter.check(`ip:${event.getClientAddress()}`);
            if (!result.ok)
                return new Response(null, { status: 429 });
            event.locals.user = await getSessionUser(event.request.headers);
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
            }
            else {
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
        }
        else {
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
            if (!user)
                return jsonError(401, 'Nicht angemeldet', rateLimitHeaders);
            if (await secondFactorMissing(user))
                return jsonError(403, 'Bitte zuerst die Zwei-Faktor-Anmeldung einrichten', rateLimitHeaders);
            const response = harden(await resolve(event));
            for (const [name, value] of Object.entries(rateLimitHeaders))
                response.headers.set(name, value);
            return response;
        }
        if (pathname === adminPath || pathname.startsWith(`${adminPath}/`)) {
            const open = pathname === `${adminPath}/login` || pathname === `${adminPath}/reset`;
            if (!open &&
                pathname !== `${adminPath}/security` &&
                (await secondFactorMissing(event.locals.user)))
                return new Response(null, {
                    status: 303,
                    headers: { location: `${adminPath}/security` }
                });
            if (!open && !event.locals.user) {
                return new Response(null, {
                    status: 303,
                    headers: {
                        location: `${adminPath}/login?returnTo=${encodeURIComponent(pathname + event.url.search)}`
                    }
                });
            }
            return harden(limitLinkHeader(await resolve(event, renderOptions(pathname, false))));
        }
        // Website pages of visitors carry the statistics script; editors and the preview are not counted.
        if (runtime.server.analytics.enabled &&
            !event.locals.user &&
            event.request.method === 'GET' &&
            !pathname.startsWith('/api/') &&
            !pathname.endsWith('/cms-preview')) {
            return limitLinkHeader(await resolve(event, renderOptions(pathname, true)));
        }
        return limitLinkHeader(await resolve(event, renderOptions(pathname, false)));
    };
}
