import { captchaChallenge } from '../../server/captcha';
/** GET /api/captcha/challenge: new ALTCHA challenge */
export const GET = () => captchaChallenge();
