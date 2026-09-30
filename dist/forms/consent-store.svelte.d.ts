/**
 * Consent state in the browser: decision per category, cookie + localStorage, loading
 * services and reporting page changes. One module, one truth everywhere.
 */
import type { ConsentConfig, ConsentDecisions } from '../consent';
export declare const consent: {
    readonly decisions: ConsentDecisions | null;
    readonly open: boolean;
    readonly config: ConsentConfig | null;
    /** Called by the <Consent> element on mount. */
    init(consentConfig: ConsentConfig): void;
    has(category: string): boolean;
    set(decisions: ConsentDecisions): void;
    acceptAll(): void;
    rejectAll(): void;
    show(): void;
    hide(): void;
    /** Reports a page change to loaded services (<Consent> does this via afterNavigate). */
    pageview(url: string): void;
    /** Reports an event to loaded services, e.g. `consent.track('formular_gesendet', { formular: 'contact' })`. */
    track(name: string, props?: Record<string, unknown>): void;
};
/** For buttons like "Cookie-Einstellungen" in the footer. */
export declare const openConsent: () => void;
export declare const track: (name: string, props?: Record<string, unknown>) => void;
