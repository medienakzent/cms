import { defineCollection, f } from '@medienakzent/cms';

export default defineCollection({
	name: 'pages',
	label: 'Seite',
	labelPlural: 'Seiten',
	icon: 'file-text',
	fields: {
		title: f.text({ label: 'Titel', localized: true, required: true }),
		seo: f.group(
			{
				description: f.textarea({ label: 'Meta-Beschreibung', localized: true, rows: 2, maxLength: 160 }),
				noindex: f.boolean({ label: 'Von Suchmaschinen ausschließen' })
			},
			{ label: 'SEO' }
		),
		showInNav: f.boolean({ label: 'In Navigation anzeigen', default: true }),
		navOrder: f.number({ label: 'Reihenfolge in Navigation', default: 0, integer: true })
	},
	blocks: ['hero', 'text', 'contact-form'],
	sortBy: { field: 'navOrder', direction: 'asc' },
	path: (slug) => (slug === 'home' ? '/' : `/${slug}`)
});
