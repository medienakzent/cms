import { defineMail, f } from '@medienakzent/cms';

const MB = 1024 * 1024;

/** Beispiel für ein Formular mit Datei-Uploads (Bewerbung). */
export default defineMail({
	name: 'application',
	label: 'Bewerbung',
	fields: {
		name: f.text({ label: 'Name', required: true, maxLength: 120 }),
		email: f.text({ label: 'E-Mail', required: true, maxLength: 200 }),
		motivation: f.textarea({ label: 'Motivation', required: true, maxLength: 4000 }),
		portfolio: f.file({ label: 'Portfolio (PDF)', accept: ['application/pdf'], maxSize: 25 * MB, required: true }),
		cv: f.file({ label: 'Lebenslauf (PDF)', accept: ['application/pdf'], maxSize: 10 * MB })
	},
	replyToField: 'email',
	maxTotalSize: 32 * MB,
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
