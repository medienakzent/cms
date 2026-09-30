export interface LanguageConfig {
    code: string;
    label: string;
}
import type { ConsentConfig } from './consent';
export interface CmsConfig {
    site: {
        name: string;
        /** Icon of the site, also shown as logo in the admin sidebar. */
        favicon: string;
    };
    /** Privacy banner and services (see consent.ts, defineConsent); `null` = no banner. */
    consent: ConsentConfig | null;
    languages: LanguageConfig[];
    defaultLanguage: string;
    routing: {
        /** `except-default`: /about (de) and /en/about; `always`: /de/about and /en/about */
        localePrefix: 'except-default' | 'always';
        /** Collection and slug of the start page */
        home: {
            collection: string;
            slug: string;
        };
    };
    media: {
        /** Width per image variant (webp). */
        imageVariants: Record<string, number>;
        imageQuality: number;
    };
}
export interface CmsConfigInput {
    /** `favicon` defaults to `/favicon.svg` from `static/`. */
    site: {
        name: string;
        favicon?: string;
    };
    consent?: ConsentConfig;
    languages: LanguageConfig[];
    defaultLanguage?: string;
    routing?: Partial<CmsConfig['routing']>;
    media?: Partial<CmsConfig['media']>;
}
export declare function defineConfig(input: CmsConfigInput): CmsConfig;
/** Public path with language prefix according to `routing.localePrefix`. */
export declare function localizePath(config: CmsConfig, lang: string, path: string): string;
