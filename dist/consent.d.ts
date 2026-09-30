/**
 * Privacy consent: categories, services and texts, configured in `cms.config.ts` under
 * `consent`. Without optional services no banner is shown.
 *
 * Services load only after consent for their category; page changes are reported to
 * loaded services. Adapters: `ga4`, `matomo`, `script` from `@medienakzent/cms/forms`.
 */
export interface ConsentCategory {
    id: string;
    label: string | Record<string, string>;
    description?: string | Record<string, string>;
    /** Technically necessary: always on, cannot be deselected. */
    required?: boolean;
}
export interface ConsentService {
    id: string;
    name: string;
    /** Category id whose consent enables the service. */
    category: string;
    /** Loads the service; runs exactly once after consent, browser only. */
    load: () => void | Promise<void>;
    /** Reports a page view (client navigation). */
    pageview?: (url: string) => void;
    event?: (name: string, props?: Record<string, unknown>) => void;
}
export interface ConsentTexts {
    title: string;
    text: string;
    acceptAll: string;
    rejectAll: string;
    settings: string;
    save: string;
    required: string;
    privacyLink: string;
}
export interface ConsentConfig {
    /** Bump when services or categories change; visitors are then asked again. */
    version: number;
    cookieName: string;
    /** Validity of the decision in days. */
    days: number;
    privacyHref: string;
    categories: ConsentCategory[];
    services: ConsentService[];
    texts: Record<string, Partial<ConsentTexts>>;
}
export type ConsentDecisions = Record<string, boolean>;
export declare const DEFAULT_CONSENT_TEXTS: Record<string, ConsentTexts>;
export declare function defineConsent(input: Partial<ConsentConfig> & {
    categories?: ConsentCategory[];
    services?: ConsentService[];
}): ConsentConfig;
export declare function consentText(config: ConsentConfig, lang: string, key: keyof ConsentTexts): string;
export declare function localized(value: string | Record<string, string> | undefined, lang: string): string;
