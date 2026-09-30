import { defineBlock, field } from '@medienakzent/cms';

export default defineBlock({
	name: 'hero',
	label: 'Hero',
	description: 'Großer Einstieg mit Titel, Untertitel und optionalem Bild.',
	icon: 'image',
	version: 2,
	fields: {
		title: field.text({ label: 'Titel', localized: true, required: true }),
		subtitle: field.textarea({ label: 'Untertitel', localized: true, rows: 3 }),
		image: field.media({ label: 'Bild', accept: 'image' }),
		layout: field.select(
			[
				{ value: 'left', label: 'Links' },
				{ value: 'center', label: 'Zentriert' }
			],
			{ label: 'Ausrichtung', default: 'left' }
		),
		cta: field.link({ label: 'Button', localized: true })
	},
	migrate: {
		// v1 had no `layout`
		1: (data) => ({ ...data, layout: 'left' })
	}
});
