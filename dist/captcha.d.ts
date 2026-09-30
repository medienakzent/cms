/** Captcha config for the client, provided by `cms.forms.captcha()` in the layout. */
export interface CaptchaClientConfig {
    /** false only when CAPTCHA=0 is set (tests). */
    enabled: boolean;
    /** URL that serves a new ALTCHA challenge. */
    challengeUrl: string;
    /** Name of the form field carrying the answer. */
    fieldName: string;
}
export declare const CAPTCHA_FIELD = "altcha";
