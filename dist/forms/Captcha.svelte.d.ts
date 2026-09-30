import type { CaptchaClientConfig } from '../captcha';
/**
 * ALTCHA widget for forms. In the layout load: `captcha: cms.forms.captcha()`, then in
 * the form `<Captcha config={page.data.captcha} />`. The widget writes its solution as
 * a hidden field into the surrounding <form>; the server verifies it in mail.send.
 * Needs a secure context (https or localhost).
 */
type Props = {
    /** Missing config (e.g. admin preview) renders nothing. */
    config?: CaptchaClientConfig;
    language?: string;
    class?: string;
    hideFooter?: boolean;
};
declare const Captcha: import("svelte").Component<Props, {}, "">;
type Captcha = ReturnType<typeof Captcha>;
export default Captcha;
