/**
 * Captcha für Formulare: ALTCHA — selbst gehostetes Proof-of-Work, keine
 * Drittanbieter, keine Cookies, keine Einwilligung nötig. Die Prüfung sitzt
 * zentral in `mail.send` und gilt damit für jedes Formular. `CAPTCHA=0` schaltet
 * sie für Tests ab.
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
			altcha = createAltcha({
				createChallengeParameters: () => ({
					algorithm: 'PBKDF2/SHA-256',
					cost: cfg.cost,
					// Zufälliger Zähler: bestimmt die Rechenzeit des Browsers (Proof of Work).
					counter: Math.floor(Math.random() * 4_000) + 500,
					expiresAt: new Date(Date.now() + 10 * 60_000)
				}),
				deriveKey,
				hmacSignatureSecret: cfg.secret,
				hmacKeySignatureSecret: await deriveHmacKeySecret(cfg.secret),
				store: usedSolutions
			});
			return altcha;
		})();
	}
	return altchaReady;
}

/** Konfiguration für das Widget im Browser. */
export function captchaClientConfig(): CaptchaClientConfig {
	return { enabled: serverConfig().captcha.enabled, challengeUrl: '/api/captcha/challenge', fieldName: CAPTCHA_FIELD };
}

/** GET /api/captcha/challenge — neue Aufgabe (öffentlich, eigenes Rate-Limit). */
export async function captchaChallenge(): Promise<Response> {
	if (!serverConfig().captcha.enabled) {
		return new Response(JSON.stringify({ error: 'Captcha ist abgeschaltet (CAPTCHA=0)' }), { status: 404, headers: { 'content-type': 'application/json' } });
	}
	const res = await (await getAltcha()).challengeHandler();
	res.headers.set('cache-control', 'no-store');
	return res;
}

/**
 * Prüft die Captcha-Antwort in den Formularfeldern. Liefert `null` bei Erfolg,
 * sonst eine Fehlermeldung für den Nutzer.
 */
export async function verifyCaptcha(fields: Record<string, unknown>): Promise<string | null> {
	const cfg = serverConfig().captcha;
	if (!cfg.enabled) return null;
	const token = fields[CAPTCHA_FIELD];
	if (typeof token !== 'string' || !token) return 'Bitte bestätigen Sie, dass Sie kein Roboter sind.';
	const a = await getAltcha();
	const result = await a.verify(token, deriveKey, cfg.secret, await deriveHmacKeySecret(cfg.secret), usedSolutions);
	return result.error || !result.verification ? 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte erneut versuchen.' : null;
}

/** Captcha-Feld nicht in Mail und Einsendung übernehmen. */
export function stripCaptchaFields(fields: Record<string, unknown>): Record<string, unknown> {
	const out = { ...fields };
	delete out[CAPTCHA_FIELD];
	return out;
}
