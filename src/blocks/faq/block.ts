import { defineBlock, f } from '@medienakzent/cms';

export default defineBlock({
	name: 'faq',
	label: 'FAQ',
	icon: 'circle-help',
	fields: {
		title: f.text({ label: 'Überschrift', localized: true }),
		items: f.list(
			f.group({
				question: f.text({ label: 'Frage', required: true }),
				answer: f.richtext({ label: 'Antwort', required: true })
			}),
			{ label: 'Fragen', itemLabel: 'Frage', localized: true }
		)
	}
});
