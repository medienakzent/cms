import { cms } from '@medienakzent/cms/server';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Public delivery: path -> collection + slug. Adjust per project, e.g. `/blog/<slug>` -> a
 * collection `articles`. Signed-in users also see drafts with `?preview=1`.
 */
export const load: PageServerLoad = async ({ params, url, locals }) => {
	const config = cms.config;
	const lang = params.lang ?? config.defaultLanguage;
	if (config.routing.localePrefix === 'except-default' && params.lang === config.defaultLanguage) {
		redirect(301, `/${params.slug}`.replace(/\/+$/, '') || '/');
	}
	const segments = params.slug.split('/').filter(Boolean);
	if (segments.length > 1) error(404, 'Seite nicht gefunden');
	const collection = config.routing.home.collection;
	const slug = segments[0] ?? config.routing.home.slug;

	const preview = url.searchParams.has('preview') && !!locals.user;
	const doc = await cms
		.collection(collection)
		.get(slug, { lang, status: preview ? 'all' : 'published' });
	if (!doc) error(404, 'Seite nicht gefunden');
	const definition = cms.collections[collection];
	return {
		doc,
		title: String(doc.fields[definition.titleField] ?? ''),
		docPath: definition.path(slug, lang) ?? '/',
		preview
	};
};
