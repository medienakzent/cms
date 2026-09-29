import { defineBlock, f } from '@compdata/cms';

export default defineBlock({
	name: 'gallery',
	label: 'Galerie',
	icon: 'images',
	fields: {
		title: f.text({ label: 'Überschrift', localized: true }),
		// Die Liste enthält lokalisierte Bildunterschriften → die ganze Liste ist pro Sprache.
		items: f.list(
			f.group({
				image: f.media({ label: 'Bild', accept: 'image', required: true }),
				caption: f.text({ label: 'Bildunterschrift' })
			}),
			{ label: 'Bilder', itemLabel: 'Bild', localized: true, min: 1 }
		),
		columns: f.number({ label: 'Spalten', default: 3, min: 1, max: 6, integer: true })
	}
});
