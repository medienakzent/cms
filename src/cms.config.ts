import { defineConfig } from '@compdata/cms';

/**
 * Projektweite CMS-Konfiguration. Struktur (Blocks, Collections) liegt in
 * src/blocks und src/collections — hier nur Sprachen, Routing, Medien.
 */
export default defineConfig({
	site: { name: 'CMS' },
	languages: [
		{ code: 'de', label: 'Deutsch' },
		{ code: 'en', label: 'English' }
	],
	defaultLanguage: 'de',
	routing: {
		localePrefix: 'except-default',
		home: { collection: 'pages', slug: 'home' }
	},
	media: {
		imageVariants: { thumb: 320, md: 960, lg: 1920 },
		imageQuality: 82
	}
});
