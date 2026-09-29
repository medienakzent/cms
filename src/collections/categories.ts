import { defineCollection, f } from '@medienakzent/cms';

export default defineCollection({
	name: 'categories',
	label: 'Kategorie',
	labelPlural: 'Kategorien',
	icon: 'folder',
	fields: {
		title: f.text({ label: 'Name', localized: true, required: true }),
		description: f.textarea({ label: 'Beschreibung', localized: true })
	},
	blocks: false,
	sortBy: { field: 'title', direction: 'asc' }
});
