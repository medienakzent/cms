import { defineBlock, field } from '@medienakzent/cms';

export default defineBlock({
	name: 'image',
	label: 'Bild',
	icon: 'image',
	fields: {
		image: field.media({ label: 'Bild', accept: 'image', required: true }),
		caption: field.text({ label: 'Bildunterschrift', localized: true }),
		size: field.select(['content', 'full'], { label: 'Größe', default: 'content' })
	}
});
