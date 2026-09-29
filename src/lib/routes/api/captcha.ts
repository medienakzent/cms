import { captchaChallenge } from '../../server/captcha';

/** GET /api/captcha/challenge — neue ALTCHA-Aufgabe */
export const GET = () => captchaChallenge();
