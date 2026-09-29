import type { RequestEvent } from '@sveltejs/kit';
import { localizePath } from '../../config';
import { collection } from '../../server/content';
import { getRuntime } from '../../server/runtime';

const esc = (s: string) =>
	s.replace(
		/[<>&'"]/g,
		(c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c
	);

/**
 * GET /sitemap.xml — alle veröffentlichten Dokumente aller Collections mit Pfad,
 * je Sprache mit hreflang-Alternativen. Basis-URL ist ORIGIN.
 */
export const GET = async (_event: RequestEvent) => {
	const { registry, config, server } = getRuntime();
	const base = server.origin;
	const entries: string[] = [];
	for (const def of Object.values(registry.collections)) {
		const rows = await collection(def.name).list({ status: 'published', limit: 200, sort: 'slug' });
		const bySlug = new Map<string, { lang: string; updatedAt: string }[]>();
		for (const r of rows.items) {
			const list = bySlug.get(r.slug) ?? [];
			list.push({ lang: r.lang, updatedAt: r.updatedAt });
			bySlug.set(r.slug, list);
		}
		for (const [slug, langs] of bySlug) {
			const path = def.path(slug, config.defaultLanguage);
			if (!path) continue;
			for (const { lang, updatedAt } of langs) {
				const loc = base + localizePath(config, lang, def.path(slug, lang) ?? path);
				const alternates = langs
					.map(
						(l) =>
							`<xhtml:link rel="alternate" hreflang="${l.lang}" href="${esc(base + localizePath(config, l.lang, def.path(slug, l.lang) ?? path))}"/>`
					)
					.join('');
				entries.push(
					`<url><loc>${esc(loc)}</loc><lastmod>${updatedAt.slice(0, 10)}</lastmod>${langs.length > 1 ? alternates : ''}</url>`
				);
			}
		}
	}
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`;
	return new Response(xml, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=600'
		}
	});
};
