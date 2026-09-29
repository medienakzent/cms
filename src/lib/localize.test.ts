import { describe, expect, it } from 'vitest';
import { defineBlock } from './block';
import { field } from './fields';
import { mergeBlocks, mergeFields, splitBlocks, splitFields } from './localize';
import { validateFields } from './validate';

const fields = {
	title: field.text({ localized: true, required: true }),
	count: field.number({ default: 3 }),
	seo: field.group({ description: field.textarea({ localized: true }), noindex: field.boolean() }),
	tags: field.references('tags')
};

describe('splitFields / mergeFields', () => {
	it('trennt lokalisierte Werte und führt sie mit Fallback wieder zusammen', () => {
		const value = {
			title: 'Hallo',
			count: 5,
			seo: { description: 'Desc', noindex: true },
			tags: ['a']
		};
		const { base, local } = splitFields(fields, value);
		expect(base).toEqual({ count: 5, seo: { noindex: true }, tags: ['a'] });
		expect(local).toEqual({ title: 'Hallo', seo: { description: 'Desc' } });

		const english = mergeFields(fields, base, { title: 'Hello', seo: {} }, local);
		expect(english).toEqual({
			title: 'Hello',
			count: 5,
			seo: { description: 'Desc', noindex: true },
			tags: ['a']
		});

		const empty = mergeFields(fields, undefined, undefined, undefined);
		expect(empty).toEqual({
			title: '',
			count: 3,
			seo: { description: '', noindex: false },
			tags: []
		});
	});
});

describe('Blocks', () => {
	const hero = defineBlock({
		name: 'hero',
		version: 2,
		fields: {
			title: field.text({ localized: true }),
			layout: field.select(['left', 'center'], { default: 'left' })
		},
		migrate: { 1: (data) => ({ ...data, layout: 'center' }) }
	});
	const definitions = { hero };

	it('splittet Block-Daten nach ID und migriert alte Versionen beim Lesen', () => {
		const { base, local } = splitBlocks(definitions, [
			{ id: 'b1', type: 'hero', data: { title: 'T', layout: 'left' } }
		]);
		expect(base[0]).toEqual({ id: 'b1', type: 'hero', version: 2, data: { layout: 'left' } });
		expect(local).toEqual({ b1: { title: 'T' } });

		const merged = mergeBlocks(
			definitions,
			[{ id: 'b1', type: 'hero', version: 1, data: {} }],
			{ b1: { title: 'X' } },
			undefined
		);
		expect(merged[0].data).toEqual({ title: 'X', layout: 'center' });
	});
});

describe('validateFields', () => {
	it('erzwingt Pflichtfelder nur im strikten Modus', () => {
		const value = { title: '', count: null, seo: { description: '', noindex: false }, tags: [] };
		expect(validateFields(fields, value, { strict: false, blocks: {} })).toEqual([]);
		expect(validateFields(fields, value, { strict: true, blocks: {} })).toEqual([
			{ path: 'title', message: 'Pflichtfeld' }
		]);
	});
});
