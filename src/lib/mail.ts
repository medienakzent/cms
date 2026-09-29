/**
 * Mail-Vorlagen — je Kunde in `src/mail/<name>.ts` definiert, mit demselben
 * Feldsystem wie Blocks: Felder werden validiert, Betreff und Text sind
 * Markdown mit Platzhaltern (`{{name}}`, `{{seo.title}}`, `{{all}}`).
 *
 * Versand: `cms.mail.send('contact', data, { lang })` oder öffentlich
 * `POST /api/mail/contact` (Kontakt-/Anfrageformulare, mit Rate-Limit + Honeypot).
 */
import type { FieldMap } from './fields';
import type { InferFields } from './types';

/** Text je Sprache oder ein Text für alle Sprachen. */
export type LocalizedText = string | Record<string, string>;

export interface MailTemplateDefinition<F extends FieldMap = FieldMap> {
	/** Muss dem Dateinamen unter `src/mail/` entsprechen. */
	name: string;
	label: string;
	fields: F;
	/** Empfänger — fest oder abhängig von den Daten. Leer = `MAIL_TO_DEFAULT`. */
	to?: string[] | ((data: InferFields<F>) => string[]);
	/** Feld mit der E-Mail-Adresse des Absenders (wird Reply-To). */
	replyToField?: keyof F & string;
	subject: LocalizedText;
	/** Markdown mit Platzhaltern. `{{all}}` listet alle Felder auf. */
	body: LocalizedText;
	/** Automatische Bestätigung an den Absender. */
	autoReply?: {
		toField: keyof F & string;
		subject: LocalizedText;
		body: LocalizedText;
	};
	/** Name des unsichtbaren Formularfelds, das leer bleiben muss (Spam-Schutz). */
	honeypot: string;
	/** Obergrenze aller Datei-Uploads zusammen (Bytes). Default 32 MB. */
	maxTotalSize: number;
	/** Captcha (ALTCHA) verlangen — Default true. */
	captcha: boolean;
}

export interface MailTemplateOptions<F extends FieldMap> {
	name: string;
	label?: string;
	fields: F;
	to?: string[] | ((data: InferFields<F>) => string[]);
	replyToField?: keyof F & string;
	subject: LocalizedText;
	body: LocalizedText;
	autoReply?: MailTemplateDefinition<F>['autoReply'];
	honeypot?: string;
	maxTotalSize?: number;
	captcha?: boolean;
}

export function defineMail<const F extends FieldMap>(
	def: MailTemplateOptions<F>
): MailTemplateDefinition<F> {
	if (!/^[a-z][a-z0-9-]*$/.test(def.name)) {
		throw new Error(`Mail-Vorlage „${def.name}": Name nur a-z, 0-9, -`);
	}
	if (def.replyToField && !def.fields[def.replyToField]) {
		throw new Error(
			`Mail-Vorlage „${def.name}": replyToField „${def.replyToField}" fehlt in fields.`
		);
	}
	if (def.autoReply && !def.fields[def.autoReply.toField]) {
		throw new Error(
			`Mail-Vorlage „${def.name}": autoReply.toField „${def.autoReply.toField}" fehlt in fields.`
		);
	}
	return {
		name: def.name,
		label: def.label ?? def.name,
		fields: def.fields,
		to: def.to,
		replyToField: def.replyToField,
		subject: def.subject,
		body: def.body,
		autoReply: def.autoReply,
		honeypot: def.honeypot ?? 'website',
		maxTotalSize: def.maxTotalSize ?? 32 * 1024 * 1024,
		captcha: def.captcha ?? true
	};
}

export function localizedText(text: LocalizedText, lang: string, fallback: string): string {
	if (typeof text === 'string') return text;
	return text[lang] ?? text[fallback] ?? Object.values(text)[0] ?? '';
}
