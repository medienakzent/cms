import { describe, expect, it } from 'vitest';
import { defineCollection } from './collection';
import { field } from './fields';
import { extractFacets } from './facets';
import { buildListQuery, parseListQuery, QueryError } from './query';

const articles = defineCollection({
	name: 'articles',
	fields: {
		title: field.text({ localized: true, required: true }),
		year: field.number(),
		published: field.date(),
		category: field.select(['news', 'blog']),
		tags: field.references('tags'),
		seo: field.group({ noindex: field.boolean() }),
		body: field.richtext()
	},
	sortBy: { field: 'published', direction: 'desc' }
});
const languages = ['de', 'en'];
const parse = (queryString: string) =>
	parseListQuery(articles, new URLSearchParams(queryString), languages);
const issuesOf = (callback: () => unknown) => {
	try {
		callback();
	} catch (error) {
		if (error instanceof QueryError) return error.issues.map((issue) => issue.path);
		throw error;
	}
	return [];
};

describe('parseListQuery', () => {
	it('typisiert Filter nach Feldart und setzt Vergleichsmodus', () => {
		const query = parse(
			'lang=de&filter[year][gte]=2024&filter[category]=news&filter[tags][in]=a,b&filter[seo.noindex]=false&sort=-year&limit=10'
		);
		expect(query.filters).toEqual([
			{ field: 'year', op: 'gte', value: 2024, mode: 'num' },
			{ field: 'category', op: 'eq', value: 'news', mode: 'text' },
			{ field: 'tags', op: 'in', value: ['a', 'b'], mode: 'text' },
			{ field: 'seo.noindex', op: 'eq', value: 0, mode: 'num' }
		]);
		expect(query.sort).toEqual({ field: 'year', direction: 'desc', kind: 'facet', mode: 'num' });
		expect(query.limit).toBe(10);
		expect(query.status).toBe('published');
	});

	it('nutzt die Standardsortierung der Collection', () => {
		expect(parse('').sort).toEqual({
			field: 'published',
			direction: 'desc',
			kind: 'facet',
			mode: 'num'
		});
	});

	it('lehnt Unbekanntes und falsche Typen mit Pfadangabe ab', () => {
		expect(issuesOf(() => parse('foo=1'))).toEqual(['foo']);
		expect(issuesOf(() => parse('filter[body]=x'))).toEqual(['filter[body]']);
		expect(issuesOf(() => parse('filter[year]=abc'))).toEqual(['filter[year][eq]']);
		expect(issuesOf(() => parse('filter[category]=other'))).toEqual(['filter[category][eq]']);
		expect(issuesOf(() => parse('filter[title][gt]=a'))).toEqual(['filter[title][gt]']);
		expect(issuesOf(() => parse('filter[year][contains]=1'))).toEqual(['filter[year][contains]']);
		expect(issuesOf(() => parse('sort=tags'))).toEqual(['sort']);
		expect(issuesOf(() => parse('lang=fr&limit=999&status=x'))).toEqual([
			'lang',
			'status',
			'limit'
		]);
	});

	it('akzeptiert Bibliotheks-Eingaben mit nativen Typen', () => {
		const query = buildListQuery(
			articles,
			{
				filters: [
					{ field: 'seo.noindex', value: true },
					{ field: 'year', op: 'in', value: [2024, 2025] }
				]
			},
			languages
		);
		expect(query.filters[0].value).toBe(1);
		expect(query.filters[1].value).toEqual([2024, 2025]);
	});
});

describe('extractFacets', () => {
	it('bildet dieselbe Feldmenge ab, die filterbar ist', () => {
		const facets = extractFacets(articles.fields, {
			title: 'Hallo',
			year: 2025,
			published: '2025-03-01',
			category: 'news',
			tags: ['a', 'b'],
			seo: { noindex: true },
			body: 'nicht indiziert'
		});
		expect(facets.map((facet) => facet.field)).toEqual([
			'title',
			'year',
			'published',
			'category',
			'tags',
			'tags',
			'seo.noindex'
		]);
		expect(facets.find((facet) => facet.field === 'published')?.num).toBe(Date.parse('2025-03-01'));
		expect(facets.find((facet) => facet.field === 'seo.noindex')).toEqual({
			field: 'seo.noindex',
			text: 'true',
			num: 1
		});
	});
});
