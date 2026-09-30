import { defineBlock, field } from '@medienakzent/cms';

export default defineBlock({
	name: 'contact-form',
	label: 'Kontaktformular',
	description: 'Sendet über die Mail-API (Vorlage src/mail/contact.ts).',
	icon: 'mail',
	fields: {
		title: field.text({ label: 'Überschrift', localized: true }),
		intro: field.richtext({ label: 'Einleitung', localized: true }),
		template: field.text({
			label: 'Mail-Vorlage',
			default: 'contact',
			help: 'Name der Datei unter src/mail/'
		}),
		successText: field.text({
			label: 'Text nach Versand',
			localized: true,
			default: 'Vielen Dank, Ihre Nachricht ist angekommen.'
		}),
		errorText: field.text({
			label: 'Text bei Fehler',
			localized: true,
			default: 'Das hat leider nicht geklappt. Bitte versuchen Sie es später erneut.'
		})
	}
});
