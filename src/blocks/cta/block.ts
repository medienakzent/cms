import { defineBlock, field } from '@medienakzent/cms';

export default defineBlock({
	name: 'cta',
	label: 'Call to Action',
	icon: 'megaphone',
	fields: {
		title: field.text({ label: 'Titel', localized: true, required: true }),
		text: field.textarea({ label: 'Text', localized: true }),
		link: field.link({ label: 'Link', localized: true, required: true }),
		tone: field.select(['primary', 'muted'], { label: 'Farbe', default: 'primary' })
	}
});
