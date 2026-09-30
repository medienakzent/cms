import { defineCollection, field } from '@medienakzent/cms';

export default defineCollection({
	name: 'pages',
	label: 'Seite',
	labelPlural: 'Seiten',
	icon: 'file-text',
	fields: {
		title: field.text({ label: 'Titel', localized: true, required: true }),
		seo: field.group(
			{
				description: field.textarea({
					label: 'Meta-Beschreibung',
					localized: true,
					rows: 2,
					maxLength: 160
				}),
				noindex: field.boolean({ label: 'Von Suchmaschinen ausschließen' })
			},
			{ label: 'SEO' }
		),
		showInNav: field.boolean({ label: 'In Navigation anzeigen', default: true }),
		navOrder: field.number({ label: 'Reihenfolge in Navigation', default: 0, integer: true })
	},
	blocks: ['hero', 'text', 'contact-form'],
	sortBy: { field: 'navOrder', direction: 'asc' },
	path: (slug) => (slug === 'home' ? '/' : `/${slug}`)
});
