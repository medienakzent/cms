import { error, fail, redirect, type RequestEvent, type ServerLoadEvent } from '@sveltejs/kit';
import { slugify } from '../../slug';
import { collection } from '../../server/content';
import { CmsError } from '../../server/errors';
import { getRuntime } from '../../server/runtime';

export async function load({ params, url }: ServerLoadEvent) {
	const { registry, config } = getRuntime();
	const definition = registry.collections[params.collection ?? ''];
	if (!definition) error(404, 'Collection nicht gefunden');
	return {
		lang: url.searchParams.get('lang') ?? config.defaultLanguage,
		def: {
			name: definition.name,
			label: definition.label,
			labelPlural: definition.labelPlural,
			titleField: definition.titleField
		},
		breadcrumbs: [
			{ label: 'Übersicht', href: '/admin' },
			{ label: definition.labelPlural, href: `/admin/${definition.name}` },
			{ label: 'Neu' }
		]
	};
}

export const actions = {
	default: async ({ params, request, locals }: RequestEvent) => {
		const { registry, config } = getRuntime();
		const definition = registry.collections[params.collection ?? ''];
		if (!definition) error(404);
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const slug = String(form.get('slug') ?? '').trim() || slugify(title);
		const lang = String(form.get('lang') ?? config.defaultLanguage);
		if (!title) return fail(400, { error: 'Titel fehlt', title, slug });
		try {
			await collection(definition.name).create({
				slug,
				lang,
				input: { fields: { [definition.titleField]: title } },
				actor: { id: locals.user!.id, name: locals.user!.name }
			});
		} catch (cause) {
			if (cause instanceof CmsError)
				return fail(cause.status, { error: cause.message, title, slug });
			throw cause;
		}
		redirect(303, `/admin/${definition.name}/${slug}?lang=${lang}`);
	}
};
