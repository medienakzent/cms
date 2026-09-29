import { defineBlock, f } from '@medienakzent/cms';

export default defineBlock({
	name: 'contact-form',
	label: 'Kontaktformular',
	description: 'Sendet über die Mail-API (Vorlage src/mail/contact.ts).',
	icon: 'mail',
	fields: {
		title: f.text({ label: 'Überschrift', localized: true }),
		intro: f.richtext({ label: 'Einleitung', localized: true }),
		template: f.text({ label: 'Mail-Vorlage', default: 'contact', help: 'Name der Datei unter src/mail/' }),
		successText: f.text({ label: 'Text nach Versand', localized: true, default: 'Vielen Dank, Ihre Nachricht ist angekommen.' }),
		errorText: f.text({ label: 'Text bei Fehler', localized: true, default: 'Das hat leider nicht geklappt. Bitte versuchen Sie es später erneut.' })
	}
});
