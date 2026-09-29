/**
 * Bausteine für Formulare und Datenschutz auf der Website (client-sicher):
 *   <Captcha config={captcha} />          im Formular
 *   <Consent config={config.consent} />   im Layout
 *   consent.has('analytics'), openConsent(), track('name', {...})
 *   Tracking-Adapter: ga4(), matomo(), script()
 */
export { default as Captcha } from './Captcha.svelte';
export { default as Consent } from './Consent.svelte';
export { consent, openConsent, track } from './consent-store.svelte';
export { ga4, matomo, script } from '../tracking';
export type { ConsentService } from '../consent';
