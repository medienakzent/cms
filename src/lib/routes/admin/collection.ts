import { error, type ServerLoadEvent } from '@sveltejs/kit';
import { collection } from '../../server/content';
import { getRuntime } from '../../server/runtime';
import type { IndexRow } from '../../types';

export async function load({ params, url }: ServerLoadEvent) {
	const { registry, config } = getRuntime();
	const def = registry.collections[params.collection ?? ''];
	if (!def) error(404, 'Collection nicht gefunden');
	const lang = url.searchParams.get('lang') ?? config.defaultLanguage;
	const q = url.searchParams.get('q') ?? '';
	const all = await collection(def.name).list({ status: 'all', q: q || undefined, limit: 200 });

	// Eine Zeile je Slug: bevorzugt die gewählte Sprache; sonst die erste vorhandene.
	const bySlug = new Map<string, { row: IndexRow; langs: IndexRow[] }>();
	for (const row of all.items) {
		const entry = bySlug.get(row.slug) ?? { row, langs: [] };
		if (row.lang === lang) entry.row = row;
		entry.langs.push(row);
		bySlug.set(row.slug, entry);
	}
	return {
		lang,
		q,
		def: { name: def.name, label: def.label, labelPlural: def.labelPlural },
		rows: [...bySlug.values()],
		breadcrumbs: [{ label: 'Übersicht', href: '/admin' }, { label: def.labelPlural }]
	};
}
