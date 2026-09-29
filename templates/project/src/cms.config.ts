import { defineConfig } from '@medienakzent/cms';

/** Sprachen, Routing, Medien. Struktur (Blocks, Collections) liegt in src/blocks und src/collections. */
export default defineConfig({
	site: { name: '__PROJECT_NAME__' },
	languages: [{ code: 'de', label: 'Deutsch' }],
	defaultLanguage: 'de',
	routing: { localePrefix: 'except-default', home: { collection: 'pages', slug: 'home' } },
	media: { imageVariants: { thumb: 320, md: 960, lg: 1920 }, imageQuality: 82 }
});
