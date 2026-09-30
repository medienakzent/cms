import { type CaptchaClientConfig } from '../captcha';
/** Configuration for the browser widget. */
export declare function captchaClientConfig(): CaptchaClientConfig;
/** GET /api/captcha/challenge: new challenge (public, own rate limit). */
export declare function captchaChallenge(): Promise<Response>;
/** Verifies the captcha answer in the form fields. Returns null on success, else a user-facing message. */
export declare function verifyCaptcha(fields: Record<string, unknown>): Promise<string | null>;
/** Keeps the captcha field out of mail and submission. */
export declare function stripCaptchaFields(fields: Record<string, unknown>): Record<string, unknown>;
