import { defineBlock, field } from '@medienakzent/cms';

export default defineBlock({
	name: 'text',
	label: 'Text',
	description: 'Fließtext in Markdown.',
	icon: 'text',
	fields: {
		body: field.richtext({ label: 'Text', localized: true, required: true }),
		width: field.select(['narrow', 'wide'], { label: 'Breite', default: 'narrow' })
	}
});
