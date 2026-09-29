import { defineCollection, field } from '@medienakzent/cms';

export default defineCollection({
	name: 'categories',
	label: 'Kategorie',
	labelPlural: 'Kategorien',
	icon: 'folder',
	fields: {
		title: field.text({ label: 'Name', localized: true, required: true }),
		description: field.textarea({ label: 'Beschreibung', localized: true })
	},
	blocks: false,
	sortBy: { field: 'title', direction: 'asc' }
});
