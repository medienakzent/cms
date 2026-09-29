import { error, fail, redirect, type RequestEvent, type ServerLoadEvent } from '@sveltejs/kit';
import { slugify } from '../../slug';
import { collection } from '../../server/content';
import { CmsError } from '../../server/errors';
import { getRuntime } from '../../server/runtime';

export async function load({ params, url }: ServerLoadEvent) {
	const { registry, config } = getRuntime();
	const def = registry.collections[params.collection ?? ''];
	if (!def) error(404, 'Collection nicht gefunden');
	return {
		lang: url.searchParams.get('lang') ?? config.defaultLanguage,
		def: { name: def.name, label: def.label, labelPlural: def.labelPlural, titleField: def.titleField },
		breadcrumbs: [
			{ label: 'Übersicht', href: '/admin' },
			{ label: def.labelPlural, href: `/admin/${def.name}` },
			{ label: 'Neu' }
		]
	};
}

export const actions = {
	default: async ({ params, request, locals }: RequestEvent) => {
		const { registry, config } = getRuntime();
		const def = registry.collections[params.collection ?? ''];
		if (!def) error(404);
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const slug = String(form.get('slug') ?? '').trim() || slugify(title);
		const lang = String(form.get('lang') ?? config.defaultLanguage);
		if (!title) return fail(400, { error: 'Titel fehlt', title, slug });
		try {
			await collection(def.name).create({
				slug,
				lang,
				input: { fields: { [def.titleField]: title } },
				actor: { id: locals.user!.id, name: locals.user!.name }
			});
		} catch (e) {
			if (e instanceof CmsError) return fail(e.status, { error: e.message, title, slug });
			throw e;
		}
		redirect(303, `/admin/${def.name}/${slug}?lang=${lang}`);
	}
};
