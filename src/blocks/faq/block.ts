import { defineBlock, field } from '@medienakzent/cms';

export default defineBlock({
	name: 'faq',
	label: 'FAQ',
	icon: 'circle-help',
	fields: {
		title: field.text({ label: 'Überschrift', localized: true }),
		items: field.list(
			field.group({
				question: field.text({ label: 'Frage', required: true }),
				answer: field.richtext({ label: 'Antwort', required: true })
			}),
			{ label: 'Fragen', itemLabel: 'Frage', localized: true }
		)
	}
});
