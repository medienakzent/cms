import { localizePath } from '@medienakzent/cms';
import { cms } from '@medienakzent/cms/server';
import type { LayoutServerLoad } from './$types';

/** Site layout: navigation from the published pages of the current language. */
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
		nav: pages.items.map((page) => ({
			slug: page.slug,
			title: page.title,
			href: localizePath(config, lang, page.slug === 'home' ? '/' : `/${page.slug}`)
		})),
		preview: !!locals.user,
		// Captcha config for forms (provider, site key, challenge URL)
		captcha: cms.forms.captcha()
	};
};
