import { localizePath } from '@medienakzent/cms';
import { cms } from '@medienakzent/cms/server';
import type { LayoutServerLoad } from './$types';

/** Website-Layout: Navigation aus veröffentlichten Seiten der aktuellen Sprache. */
export const load: LayoutServerLoad = async ({ params, locals }) => {
	const config = cms.config;
	const lang = (params as { lang?: string }).lang ?? config.defaultLanguage;
	const pages = await cms.collection('pages').list({
		lang,
		status: 'published',
		limit: 100,
		sort: 'navOrder',
		filters: [{ field: 'showInNav', value: true }]
	});
	return {
		lang,
		languages: config.languages,
		siteName: config.site.name,
		nav: pages.items.map((p) => ({ slug: p.slug, title: p.title, href: localizePath(config, lang, p.slug === 'home' ? '/' : `/${p.slug}`) })),
		preview: !!locals.user,
		// Captcha-Konfiguration für Formulare (Provider, Site-Key, Challenge-URL)
		captcha: cms.forms.captcha()
	};
};
