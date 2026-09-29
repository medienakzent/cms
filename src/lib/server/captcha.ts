/**
 * Captcha-Prüfung für Formulare. Provider per `CAPTCHA_PROVIDER`:
 *   altcha    (Default) selbst gehostetes Proof-of-Work, keine Drittanbieter, keine Cookies
 *   turnstile Cloudflare Turnstile (Site-Key + Secret)
 *   none      aus (nur für Entwicklung/Tests)
 * Die Prüfung sitzt zentral in `mail.send` und gilt damit für jedes Formular.
 */
import { CappedMap, create as createAltcha, deriveHmacKeySecret } from 'altcha-lib/frameworks/sveltekit';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import { CAPTCHA_FIELD, type CaptchaClientConfig } from '../captcha';
import { serverConfig } from './runtime';

type Altcha = ReturnType<typeof createAltcha>;
let altcha: Altcha | null = null;
let altchaReady: Promise<Altcha> | null = null;
// Jede Lösung nur einmal (Replay-Schutz) — begrenzte Map im Prozessspeicher.
const usedSolutions = new CappedMap({ maxSize: 10_000 });

async function getAltcha(): Promise<Altcha> {
	if (altcha) return altcha;
	if (!altchaReady) {
		altchaReady = (async () => {
			const cfg = serverConfig().captcha;
			const hmacSignatureSecret = cfg.secret;
			const hmacKeySignatureSecret = await deriveHmacKeySecret(cfg.secret);
			altcha = createAltcha({
				createChallengeParameters: () => ({
					algorithm: 'PBKDF2/SHA-256',
					cost: cfg.altchaCost,
					// Zufälliger Zähler: bestimmt die Rechenzeit des Browsers (Proof of Work).
					counter: Math.floor(Math.random() * 4_000) + 500,
					expiresAt: new Date(Date.now() + 10 * 60_000)
				}),
				deriveKey,
				hmacSignatureSecret,
				hmacKeySignatureSecret,
				store: usedSolutions
			});
			return altcha;
		})();
	}
	return altchaReady;
}

/** Konfiguration für das Widget im Browser. */
export function captchaClientConfig(): CaptchaClientConfig {
	const cfg = serverConfig().captcha;
	if (cfg.provider === 'turnstile') return { provider: 'turnstile', siteKey: cfg.turnstileSiteKey, fieldName: CAPTCHA_FIELD.turnstile };
	if (cfg.provider === 'altcha') return { provider: 'altcha', challengeUrl: '/api/captcha/challenge', fieldName: CAPTCHA_FIELD.altcha };
	return { provider: 'none', fieldName: '' };
}

/** GET /api/captcha/challenge — neue ALTCHA-Aufgabe (öffentlich, eigenes Rate-Limit). */
export async function captchaChallenge(): Promise<Response> {
	const cfg = serverConfig().captcha;
	if (cfg.provider !== 'altcha') return new Response(JSON.stringify({ error: 'Captcha-Provider ist nicht altcha' }), { status: 404, headers: { 'content-type': 'application/json' } });
	const res = await (await getAltcha()).challengeHandler();
	res.headers.set('cache-control', 'no-store');
	return res;
}

/**
 * Prüft die Captcha-Antwort in den Formularfeldern. Liefert `null` bei Erfolg,
 * sonst eine Fehlermeldung für den Nutzer.
 */
export async function verifyCaptcha(fields: Record<string, unknown>, ip: string): Promise<string | null> {
	const cfg = serverConfig().captcha;
	if (cfg.provider === 'none') return null;
	const fieldName = CAPTCHA_FIELD[cfg.provider];
	const token = fields[fieldName];
	if (typeof token !== 'string' || !token) return 'Bitte bestätigen Sie, dass Sie kein Roboter sind.';

	if (cfg.provider === 'altcha') {
		const a = await getAltcha();
		const hmacKeySignatureSecret = await deriveHmacKeySecret(cfg.secret);
		const result = await a.verify(token, deriveKey, cfg.secret, hmacKeySignatureSecret, usedSolutions);
		return result.error || !result.verification ? 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte erneut versuchen.' : null;
	}

	// Turnstile: Token bei Cloudflare prüfen.
	const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ secret: cfg.turnstileSecret, response: token, remoteip: ip })
	}).catch(() => null);
	const json = res ? ((await res.json().catch(() => null)) as { success?: boolean } | null) : null;
	return json?.success ? null : 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte erneut versuchen.';
}

/** Felder, die zum Captcha gehören — nicht in Mail und Einsendung übernehmen. */
export function stripCaptchaFields(fields: Record<string, unknown>): Record<string, unknown> {
	const out = { ...fields };
	for (const name of Object.values(CAPTCHA_FIELD)) delete out[name];
	return out;
}
