/** Captcha-Konfiguration für den Client (kommt aus `cms.forms.captcha()` im Layout). */
export type CaptchaProvider = 'none' | 'altcha' | 'turnstile';

export interface CaptchaClientConfig {
	provider: CaptchaProvider;
	/** ALTCHA: URL, die eine neue Aufgabe liefert. */
	challengeUrl?: string;
	/** Turnstile: öffentlicher Site-Key. */
	siteKey?: string;
	/** Name des Formularfelds, das die Antwort trägt. */
	fieldName: string;
}

export const CAPTCHA_FIELD: Record<Exclude<CaptchaProvider, 'none'>, string> = {
	altcha: 'altcha',
	turnstile: 'cf-turnstile-response'
};
