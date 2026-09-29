/** Captcha-Konfiguration für den Client (kommt aus `cms.forms.captcha()` im Layout). */
export interface CaptchaClientConfig {
	/** false nur, wenn CAPTCHA=0 gesetzt ist (Tests). */
	enabled: boolean;
	/** URL, die eine neue ALTCHA-Aufgabe liefert. */
	challengeUrl: string;
	/** Name des Formularfelds, das die Antwort trägt. */
	fieldName: string;
}

export const CAPTCHA_FIELD = 'altcha';
