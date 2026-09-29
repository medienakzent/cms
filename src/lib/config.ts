export interface LanguageConfig {
	code: string;
	label: string;
}

import type { ConsentConfig } from './consent';

export interface CmsConfig {
	site: { name: string };
	/** Privacy banner and services (see consent.ts, defineConsent); `null` = no banner. */
	consent: ConsentConfig | null;
	languages: LanguageConfig[];
	defaultLanguage: string;
	routing: {
		/** `except-default`: /about (de) and /en/about; `always`: /de/about and /en/about */
		localePrefix: 'except-default' | 'always';
		/** Collection and slug of the start page */
		home: { collection: string; slug: string };
	};
	media: {
		/** Width per image variant (webp). */
		imageVariants: Record<string, number>;
		imageQuality: number;
	};
}

export interface CmsConfigInput {
	site: { name: string };
	consent?: ConsentConfig;
	languages: LanguageConfig[];
	defaultLanguage?: string;
	routing?: Partial<CmsConfig['routing']>;
	media?: Partial<CmsConfig['media']>;
}

export function defineConfig(input: CmsConfigInput): CmsConfig {
	const defaultLanguage = input.defaultLanguage ?? input.languages[0]?.code;
	if (!defaultLanguage || !input.languages.some((language) => language.code === defaultLanguage)) {
		throw new Error('cms.config: defaultLanguage muss in languages enthalten sein.');
	}
	return {
		site: input.site,
		consent: input.consent ?? null,
		languages: input.languages,
		defaultLanguage,
		routing: {
			localePrefix: 'except-default',
			home: { collection: 'pages', slug: 'home' },
			...input.routing
		},
		media: {
			imageVariants: { thumb: 320, md: 960, lg: 1920 },
			imageQuality: 82,
			...input.media
		}
	};
}

/** Public path with language prefix according to `routing.localePrefix`. */
export function localizePath(config: CmsConfig, lang: string, path: string): string {
	const clean = path.startsWith('/') ? path : `/${path}`;
	if (config.routing.localePrefix === 'except-default' && lang === config.defaultLanguage)
		return clean;
	return clean === '/' ? `/${lang}` : `/${lang}${clean}`;
}
