import { defineBlock, f } from '@compdata/cms';

export default defineBlock({
	name: 'hero',
	label: 'Hero',
	description: 'Großer Einstieg mit Titel, Untertitel und optionalem Bild.',
	icon: 'image',
	version: 2,
	fields: {
		title: f.text({ label: 'Titel', localized: true, required: true }),
		subtitle: f.textarea({ label: 'Untertitel', localized: true, rows: 3 }),
		image: f.media({ label: 'Bild', accept: 'image' }),
		layout: f.select(
			[
				{ value: 'left', label: 'Links' },
				{ value: 'center', label: 'Zentriert' }
			],
			{ label: 'Ausrichtung', default: 'left' }
		),
		cta: f.link({ label: 'Button', localized: true })
	},
	migrate: {
		// v1 hatte kein `layout`
		1: (data) => ({ ...data, layout: 'left' })
	}
});
