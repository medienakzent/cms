import { defineCollection, f } from '@compdata/cms';

export default defineCollection({
	name: 'tags',
	label: 'Tag',
	labelPlural: 'Tags',
	icon: 'tag',
	fields: {
		title: f.text({ label: 'Name', localized: true, required: true })
	},
	blocks: false,
	sortBy: { field: 'title', direction: 'asc' }
});
