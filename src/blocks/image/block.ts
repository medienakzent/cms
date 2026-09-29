import { defineBlock, f } from '@compdata/cms';

export default defineBlock({
	name: 'image',
	label: 'Bild',
	icon: 'image',
	fields: {
		image: f.media({ label: 'Bild', accept: 'image', required: true }),
		caption: f.text({ label: 'Bildunterschrift', localized: true }),
		size: f.select(['content', 'full'], { label: 'Größe', default: 'content' })
	}
});
