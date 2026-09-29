import { defineCollection, field } from '@medienakzent/cms';

export default defineCollection({
	name: 'tags',
	label: 'Tag',
	labelPlural: 'Tags',
	icon: 'tag',
	fields: {
		title: field.text({ label: 'Name', localized: true, required: true })
	},
	blocks: false,
	sortBy: { field: 'title', direction: 'asc' }
});
