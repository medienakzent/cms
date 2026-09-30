/**
 * Client-safe building blocks for forms and privacy on the website:
 *   <Captcha config={captcha} />          in the form
 *   <Consent config={config.consent} />   in the layout
 *   consent.has('analytics'), openConsent(), track('name', {...})
 *   tracking adapters: ga4(), matomo(), script()
 */
export { default as Captcha } from './Captcha.svelte';
export { default as Consent } from './Consent.svelte';
export { consent, openConsent, track } from './consent-store.svelte';
export { ga4, matomo, script } from '../tracking';
export type { ConsentService } from '../consent';
