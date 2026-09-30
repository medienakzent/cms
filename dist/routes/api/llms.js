import { localizePath } from '../../config';
import { collection } from '../../server/content';
import { getRuntime } from '../../server/runtime';
/**
 * GET /llms.txt: overview for AI search systems (llmstxt.org convention) with site name,
 * description and the published pages (title and URL). Complements sitemap.xml and JSON-LD.
 */
export const GET = async (_event) => {
    const { registry, config, server } = getRuntime();
    const base = server.origin;
    const lines = [`# ${config.site.name}`, ''];
    for (const definition of Object.values(registry.collections)) {
        const rows = await collection(definition.name).list({
            status: 'published',
            lang: config.defaultLanguage,
            limit: 200,
            sort: 'title'
        });
        const items = rows.items
            .map((row) => {
            const path = definition.path(row.slug, row.lang);
            if (!path)
                return null;
            const excerpt = row.excerpt ? `: ${row.excerpt.replace(/\s+/g, ' ').trim()}` : '';
            return `- [${row.title || row.slug}](${base}${localizePath(config, row.lang, path)})${excerpt}`;
        })
            .filter((line) => line !== null);
        if (!items.length)
            continue;
        lines.push(`## ${definition.labelPlural}`, '', ...items, '');
    }
    lines.push(`Sitemap: ${base}/sitemap.xml`);
    return new Response(lines.join('\n') + '\n', {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=600' }
    });
};
