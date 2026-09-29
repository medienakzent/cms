import type { RequestEvent } from '@sveltejs/kit';
import { localizePath } from '../../config';
import { collection } from '../../server/content';
import { getRuntime } from '../../server/runtime';

/**
 * GET /llms.txt — Überblick für KI-Suchsysteme (Konvention llmstxt.org): Name, Beschreibung
 * und die veröffentlichten Seiten mit Titel und URL. Ergänzt sitemap.xml und JSON-LD.
 */
export const GET = async (_event: RequestEvent) => {
	const { registry, config, server } = getRuntime();
	const base = server.origin;
	const lines: string[] = [`# ${config.site.name}`, ''];
	for (const def of Object.values(registry.collections)) {
		const rows = await collection(def.name).list({
			status: 'published',
			lang: config.defaultLanguage,
			limit: 200,
			sort: 'title'
		});
		const items = rows.items
			.map((r) => {
				const path = def.path(r.slug, r.lang);
				if (!path) return null;
				const excerpt = r.excerpt ? `: ${r.excerpt.replace(/\s+/g, ' ').trim()}` : '';
				return `- [${r.title || r.slug}](${base}${localizePath(config, r.lang, path)})${excerpt}`;
			})
			.filter((x): x is string => x !== null);
		if (!items.length) continue;
		lines.push(`## ${def.labelPlural}`, '', ...items, '');
	}
	lines.push(`Sitemap: ${base}/sitemap.xml`);
	return new Response(lines.join('\n') + '\n', {
		headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=600' }
	});
};
