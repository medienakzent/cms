import { describe, expect, it } from 'vitest';
import { defineCollection } from './collection';
import { defineConfig } from './config';
import { field } from './fields';
import { defineRegistry } from './registry';

const config = defineConfig({
	site: { name: 'Test' },
	languages: [{ code: 'de', label: 'Deutsch' }]
});
const pages = defineCollection({ name: 'pages', fields: { title: field.text() } });
const artists = defineCollection({
	name: 'artists',
	fields: { name: field.text() },
	titleField: 'name'
});
const collections = { './collections/pages.ts': pages, './collections/artists.ts': artists };
const PreviewComponent = () => {};

describe('defineRegistry previews', () => {
	it('maps previews by file name onto collections', () => {
		const registry = defineRegistry({
			config,
			blocks: {},
			components: {},
			collections,
			previews: { './previews/artists.svelte': PreviewComponent }
		});
		expect(registry.previews).toEqual({ artists: PreviewComponent });
	});

	it('works without previews', () => {
		expect(defineRegistry({ config, blocks: {}, components: {}, collections }).previews).toEqual(
			{}
		);
	});

	it('rejects a preview without a matching collection', () => {
		expect(() =>
			defineRegistry({
				config,
				blocks: {},
				components: {},
				collections,
				previews: { './previews/artist.svelte': PreviewComponent }
			})
		).toThrowError(/keine Collection „artist"/);
	});
});
