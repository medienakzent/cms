import { defineMail, field } from '@medienakzent/cms';

const MEGABYTE = 1024 * 1024;

/** Example form with file uploads. */
export default defineMail({
	name: 'application',
	label: 'Bewerbung',
	fields: {
		name: field.text({ label: 'Name', required: true, maxLength: 120 }),
		email: field.text({ label: 'E-Mail', required: true, maxLength: 200 }),
		motivation: field.textarea({ label: 'Motivation', required: true, maxLength: 4000 }),
		portfolio: field.file({
			label: 'Portfolio (PDF)',
			accept: ['application/pdf'],
			maxSize: 25 * MEGABYTE,
			required: true
		}),
		cv: field.file({
			label: 'Lebenslauf (PDF)',
			accept: ['application/pdf'],
			maxSize: 10 * MEGABYTE
		})
	},
	replyToField: 'email',
	maxTotalSize: 32 * MEGABYTE,
	subject: 'Bewerbung von {{name}}',
	body: `## Neue Bewerbung

{{all}}

### Unterlagen

{{files}}

Die Links sind nur mit dieser Adresse aufrufbar.`,
	autoReply: {
		toField: 'email',
		subject: 'Ihre Bewerbung ist eingegangen',
		body: `Hallo {{name}},

vielen Dank für Ihre Bewerbung. Ihre Unterlagen:

{{files}}`
	}
});
