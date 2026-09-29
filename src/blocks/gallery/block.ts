import { defineBlock, field } from '@medienakzent/cms';

export default defineBlock({
	name: 'gallery',
	label: 'Galerie',
	icon: 'images',
	fields: {
		title: field.text({ label: 'Überschrift', localized: true }),
		// Captions are localized, so the whole list is per language.
		items: field.list(
			field.group({
				image: field.media({ label: 'Bild', accept: 'image', required: true }),
				caption: field.text({ label: 'Bildunterschrift' })
			}),
			{ label: 'Bilder', itemLabel: 'Bild', localized: true, min: 1 }
		),
		columns: field.number({ label: 'Spalten', default: 3, min: 1, max: 6, integer: true })
	}
});
