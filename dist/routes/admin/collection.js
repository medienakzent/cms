import { error } from '@sveltejs/kit';
import { collection } from '../../server/content';
import { getRuntime } from '../../server/runtime';
export async function load({ params, url }) {
    const { registry, config } = getRuntime();
    const definition = registry.collections[params.collection ?? ''];
    if (!definition)
        error(404, 'Collection nicht gefunden');
    const requested = url.searchParams.get('lang');
    const lang = requested && config.languages.some((language) => language.code === requested)
        ? requested
        : config.defaultLanguage;
    const searchQuery = url.searchParams.get('q') ?? '';
    const result = await collection(definition.name).list({
        status: 'all',
        q: searchQuery || undefined,
        limit: 200
    });
    // One row per slug: prefer the selected language, otherwise the first one found.
    const bySlug = new Map();
    for (const row of result.items) {
        const entry = bySlug.get(row.slug) ?? { row, langs: [] };
        if (row.lang === lang)
            entry.row = row;
        entry.langs.push(row);
        bySlug.set(row.slug, entry);
    }
    return {
        lang,
        q: searchQuery,
        def: { name: definition.name, label: definition.label, labelPlural: definition.labelPlural },
        rows: [...bySlug.values()],
        breadcrumbs: [{ label: 'Übersicht', href: '/admin' }, { label: definition.labelPlural }]
    };
}
