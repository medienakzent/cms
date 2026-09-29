import { error, type ServerLoadEvent } from '@sveltejs/kit';
import { localizePath } from '../../config';
import { adminBlocks, toAdminCollection } from '../../server/admin';
import { collection } from '../../server/content';
import { getRuntime } from '../../server/runtime';

export async function load({ params, url }: ServerLoadEvent) {
	const { registry, config } = getRuntime();
	const definition = registry.collections[params.collection ?? ''];
	if (!definition) error(404, 'Collection nicht gefunden');
	const slug = params.slug ?? '';
	const lang = url.searchParams.get('lang') ?? config.defaultLanguage;
	if (!config.languages.some((language) => language.code === lang))
		error(400, 'Unbekannte Sprache');
	const documents = collection(definition.name);
	const editable = await documents.getEditable(slug, lang);
	if (!editable) error(404, `${definition.label} „${slug}" nicht gefunden`);
	const path = definition.path(slug, lang);
	return {
		lang,
		collection: toAdminCollection(definition),
		blockDefs: adminBlocks(),
		doc: editable.doc,
		exists: editable.exists,
		versions: await documents.versions(slug),
		previewHref: path ? `${localizePath(config, lang, path)}?preview=1` : null,
		breadcrumbs: [
			{ label: 'Übersicht', href: '/admin' },
			{ label: definition.labelPlural, href: `/admin/${definition.name}?lang=${lang}` },
			{ label: String(editable.doc.fields[definition.titleField] ?? '') || slug }
		]
	};
}
