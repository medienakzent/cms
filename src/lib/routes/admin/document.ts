import { error, type ServerLoadEvent } from '@sveltejs/kit';
import { localizePath } from '../../config';
import { adminBlocks, toAdminCollection } from '../../server/admin';
import { collection } from '../../server/content';
import { getRuntime } from '../../server/runtime';

export async function load({ params, url }: ServerLoadEvent) {
	const { registry, config } = getRuntime();
	const def = registry.collections[params.collection ?? ''];
	if (!def) error(404, 'Collection nicht gefunden');
	const slug = params.slug ?? '';
	const lang = url.searchParams.get('lang') ?? config.defaultLanguage;
	if (!config.languages.some((l) => l.code === lang)) error(400, 'Unbekannte Sprache');
	const api = collection(def.name);
	const editable = await api.getEditable(slug, lang);
	if (!editable) error(404, `${def.label} „${slug}" nicht gefunden`);
	const path = def.path(slug, lang);
	return {
		lang,
		collection: toAdminCollection(def),
		blockDefs: adminBlocks(),
		doc: editable.doc,
		exists: editable.exists,
		versions: await api.versions(slug),
		previewHref: path ? `${localizePath(config, lang, path)}?preview=1` : null,
		breadcrumbs: [
			{ label: 'Übersicht', href: '/admin' },
			{ label: def.labelPlural, href: `/admin/${def.name}?lang=${lang}` },
			{ label: String(editable.doc.fields[def.titleField] ?? '') || slug }
		]
	};
}
