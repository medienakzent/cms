import type { RequestEvent } from '@sveltejs/kit';
import { localizePath } from '../../config';
import { collection } from '../../server/content';
import { getRuntime } from '../../server/runtime';

const escapeXml = (text: string) =>
	text.replace(
		/[<>&'"]/g,
		(character) =>
			({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] ??
			character
	);

/**
 * GET /sitemap.xml: all published documents of all collections that have a path,
 * per language with hreflang alternates. Base URL is ORIGIN.
 */
export const GET = async (_event: RequestEvent) => {
	const { registry, config, server } = getRuntime();
	const base = server.origin;
	const entries: string[] = [];
	for (const definition of Object.values(registry.collections)) {
		const rows = await collection(definition.name).list({
			status: 'published',
			limit: 200,
			sort: 'slug'
		});
		const bySlug = new Map<string, { lang: string; updatedAt: string }[]>();
		for (const row of rows.items) {
			const list = bySlug.get(row.slug) ?? [];
			list.push({ lang: row.lang, updatedAt: row.updatedAt });
			bySlug.set(row.slug, list);
		}
		for (const [slug, langs] of bySlug) {
			const path = definition.path(slug, config.defaultLanguage);
			if (!path) continue;
			for (const { lang, updatedAt } of langs) {
				const pageUrl = base + localizePath(config, lang, definition.path(slug, lang) ?? path);
				const alternates = langs
					.map(
						(alternate) =>
							`<xhtml:link rel="alternate" hreflang="${alternate.lang}" href="${escapeXml(base + localizePath(config, alternate.lang, definition.path(slug, alternate.lang) ?? path))}"/>`
					)
					.join('');
				entries.push(
					`<url><loc>${escapeXml(pageUrl)}</loc><lastmod>${updatedAt.slice(0, 10)}</lastmod>${langs.length > 1 ? alternates : ''}</url>`
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
