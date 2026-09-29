import { defineConfig, defineConsent } from '@medienakzent/cms';
import { script } from '@medienakzent/cms/forms';

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
	},
	// Spielwiese: ein Beispiel-Dienst, damit der Banner sichtbar ist.
	consent: defineConsent({
		version: 1,
		privacyHref: '/datenschutz',
		categories: [
			{
				id: 'analytics',
				label: { de: 'Statistik', en: 'Analytics' },
				description: { de: 'Anonyme Reichweitenmessung.', en: 'Anonymous usage statistics.' }
			}
		],
		services: [
			script({
				id: 'demo',
				name: 'Demo-Statistik',
				category: 'analytics',
				inline: "console.log('[demo] Statistik geladen')"
			})
		]
	})
});
