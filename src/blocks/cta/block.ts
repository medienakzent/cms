import { defineBlock, f } from '@medienakzent/cms';

export default defineBlock({
	name: 'cta',
	label: 'Call to Action',
	icon: 'megaphone',
	fields: {
		title: f.text({ label: 'Titel', localized: true, required: true }),
		text: f.textarea({ label: 'Text', localized: true }),
		link: f.link({ label: 'Link', localized: true, required: true }),
		tone: f.select(['primary', 'muted'], { label: 'Farbe', default: 'primary' })
	}
});
