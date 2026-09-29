import { defineMail, f } from '@compdata/cms';

/**
 * Kontaktformular. Empfänger über `to` oder MAIL_TO_DEFAULT; Reply-To ist die
 * Adresse des Absenders. Öffentlich erreichbar unter POST /api/mail/contact.
 */
export default defineMail({
	name: 'contact',
	label: 'Kontaktanfrage',
	fields: {
		name: f.text({ label: 'Name', required: true, maxLength: 120 }),
		email: f.text({ label: 'E-Mail', required: true, maxLength: 200 }),
		phone: f.text({ label: 'Telefon', maxLength: 60 }),
		message: f.textarea({ label: 'Nachricht', required: true, maxLength: 5000 })
	},
	replyToField: 'email',
	subject: { de: 'Kontaktanfrage von {{name}}', en: 'Contact request from {{name}}' },
	body: {
		de: `## Neue Kontaktanfrage

{{all}}

---
Gesendet am {{meta.date}} über {{meta.url}}`,
		en: `## New contact request

{{all}}

---
Sent {{meta.date}} via {{meta.url}}`
	},
	autoReply: {
		toField: 'email',
		subject: { de: 'Ihre Anfrage ist eingegangen', en: 'We received your request' },
		body: {
			de: `Hallo {{name}},

vielen Dank für Ihre Nachricht. Wir melden uns so schnell wie möglich.

> {{message}}`,
			en: `Hello {{name}},

thank you for your message. We will get back to you as soon as possible.

> {{message}}`
		}
	}
});
