import { defineConfig, defineConsent } from '@medienakzent/cms';
// Tracking adapters: import { ga4, matomo, script } from '@medienakzent/cms/forms';

/** Languages, routing, media. Structure (blocks, collections) lives in src/blocks and src/collections. */
export default defineConfig({
	site: { name: '__PROJECT_NAME__' },
	languages: [{ code: 'de', label: 'Deutsch' }],
	defaultLanguage: 'de',
	routing: { localePrefix: 'except-default', home: { collection: 'pages', slug: 'home' } },
	media: { imageVariants: { thumb: 320, md: 960, lg: 1920 }, imageQuality: 82 },
	/**
	 * Consent banner: categories and services. Without optional services no banner is shown.
	 * Example with Matomo:
	 *   consent: defineConsent({
	 *     version: 1,
	 *     privacyHref: '/datenschutz',
	 *     categories: [{ id: 'analytics', label: { de: 'Statistik', en: 'Analytics' }, description: { de: 'Anonyme Reichweitenmessung.', en: 'Anonymous usage statistics.' } }],
	 *     services: [matomo({ url: 'https://stats.example.de/', siteId: 1 })]
	 *   })
	 */
	consent: defineConsent({ categories: [], services: [] })
});
