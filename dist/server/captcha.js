/**
 * Form captcha: ALTCHA, self-hosted proof of work with no third party, no cookies
 * and no consent needed. The check lives centrally in `mail.send`, so it applies to
 * every form. `CAPTCHA=0` disables it for tests.
 */
import { CappedMap, create as createAltcha, deriveHmacKeySecret } from 'altcha-lib/frameworks/sveltekit';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import { CAPTCHA_FIELD } from '../captcha';
import { serverConfig } from './runtime';
let altcha = null;
let altchaReady = null;
// Replay protection: every solution is accepted once; bounded in-process map.
const usedSolutions = new CappedMap({ maxSize: 10_000 });
async function getAltcha() {
    if (altcha)
        return altcha;
    if (!altchaReady) {
        altchaReady = (async () => {
            const config = serverConfig().captcha;
            altcha = createAltcha({
                createChallengeParameters: () => ({
                    algorithm: 'PBKDF2/SHA-256',
                    cost: config.cost,
                    // Random counter determines the browser's proof-of-work time.
                    counter: Math.floor(Math.random() * 4_000) + 500,
                    expiresAt: new Date(Date.now() + 10 * 60_000)
                }),
                deriveKey,
                hmacSignatureSecret: config.secret,
                hmacKeySignatureSecret: await deriveHmacKeySecret(config.secret),
                store: usedSolutions
            });
            return altcha;
        })();
    }
    return altchaReady;
}
/** Configuration for the browser widget. */
export function captchaClientConfig() {
    return {
        enabled: serverConfig().captcha.enabled,
        challengeUrl: '/api/captcha/challenge',
        fieldName: CAPTCHA_FIELD
    };
}
/** GET /api/captcha/challenge: new challenge (public, own rate limit). */
export async function captchaChallenge() {
    if (!serverConfig().captcha.enabled) {
        return new Response(JSON.stringify({ error: 'Captcha ist abgeschaltet (CAPTCHA=0)' }), {
            status: 404,
            headers: { 'content-type': 'application/json' }
        });
    }
    const response = await (await getAltcha()).challengeHandler();
    response.headers.set('cache-control', 'no-store');
    return response;
}
/** Verifies the captcha answer in the form fields. Returns null on success, else a user-facing message. */
export async function verifyCaptcha(fields) {
    const config = serverConfig().captcha;
    if (!config.enabled)
        return null;
    const token = fields[CAPTCHA_FIELD];
    if (typeof token !== 'string' || !token)
        return 'Bitte bestätigen Sie, dass Sie kein Roboter sind.';
    const instance = await getAltcha();
    const result = await instance.verify(token, deriveKey, config.secret, await deriveHmacKeySecret(config.secret), usedSolutions);
    return result.error || !result.verification
        ? 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte erneut versuchen.'
        : null;
}
/** Keeps the captcha field out of mail and submission. */
export function stripCaptchaFields(fields) {
    const stripped = { ...fields };
    delete stripped[CAPTCHA_FIELD];
    return stripped;
}
