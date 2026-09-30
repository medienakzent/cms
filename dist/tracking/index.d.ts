import type { ConsentService } from '../consent';
declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
        _paq?: unknown[][];
    }
}
/**
 * Google Analytics 4 with Consent Mode: consent is set before loading, IP anonymization
 * is the GA4 default. Page changes are reported manually.
 */
export declare function ga4(options: {
    measurementId: string;
    category?: string;
    name?: string;
}): ConsentService;
/** Matomo (self-hosted). `url` with trailing slash, e.g. https://stats.example.de/ */
export declare function matomo(options: {
    url: string;
    siteId: string | number;
    category?: string;
    name?: string;
}): ConsentService;
/** Any script (chat widget, maps, ...), loaded only after consent. */
export declare function script(options: {
    id: string;
    name: string;
    category: string;
    src?: string;
    inline?: string;
    attrs?: Record<string, string>;
}): ConsentService;
