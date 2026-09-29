import { defineBlock, f } from '@compdata/cms';

export default defineBlock({
	name: 'text',
	label: 'Text',
	description: 'Fließtext in Markdown.',
	icon: 'text',
	fields: {
		body: f.richtext({ label: 'Text', localized: true, required: true }),
		width: f.select(['narrow', 'wide'], { label: 'Breite', default: 'narrow' })
	}
});
