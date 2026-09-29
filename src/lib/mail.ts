/**
 * Mail templates, defined per customer in `src/mail/<name>.ts` with the same field
 * system as blocks: fields are validated, subject and body are Markdown with
 * placeholders (`{{name}}`, `{{seo.title}}`, `{{all}}`).
 *
 * Sending: `cms.mail.send('contact', data, { lang })` or publicly via
 * `POST /api/mail/contact` (contact/request forms, with rate limit and honeypot).
 */
import type { FieldMap } from './fields';
import { isValidName } from './name';
import type { InferFields } from './types';

/** Text per language, or one text for all languages. */
export type LocalizedText = string | Record<string, string>;

export interface MailTemplateDefinition<Fields extends FieldMap = FieldMap> {
	/** Must match the file name under `src/mail/`. */
	name: string;
	label: string;
	fields: Fields;
	/** Recipients, fixed or derived from the data. Empty = `MAIL_TO_DEFAULT`. */
	to?: string[] | ((data: InferFields<Fields>) => string[]);
	/** Field holding the sender's e-mail address (becomes Reply-To). */
	replyToField?: keyof Fields & string;
	subject: LocalizedText;
	/** Markdown with placeholders; `{{all}}` lists every field. */
	body: LocalizedText;
	/** Automatic confirmation to the sender. */
	autoReply?: {
		toField: keyof Fields & string;
		subject: LocalizedText;
		body: LocalizedText;
	};
	/** Name of the invisible form field that must stay empty (spam protection). */
	honeypot: string;
	/** Upper bound for all file uploads together (bytes). Default 32 MB. */
	maxTotalSize: number;
	/** Require a captcha (ALTCHA). Default true. */
	captcha: boolean;
}

export interface MailTemplateOptions<Fields extends FieldMap> {
	name: string;
	label?: string;
	fields: Fields;
	to?: string[] | ((data: InferFields<Fields>) => string[]);
	replyToField?: keyof Fields & string;
	subject: LocalizedText;
	body: LocalizedText;
	autoReply?: MailTemplateDefinition<Fields>['autoReply'];
	honeypot?: string;
	maxTotalSize?: number;
	captcha?: boolean;
}

export function defineMail<const Fields extends FieldMap>(
	options: MailTemplateOptions<Fields>
): MailTemplateDefinition<Fields> {
	if (!isValidName(options.name)) {
		throw new Error(`Mail-Vorlage „${options.name}": Name nur a-z, 0-9, -`);
	}
	if (options.replyToField && !options.fields[options.replyToField]) {
		throw new Error(
			`Mail-Vorlage „${options.name}": replyToField „${options.replyToField}" fehlt in fields.`
		);
	}
	if (options.autoReply && !options.fields[options.autoReply.toField]) {
		throw new Error(
			`Mail-Vorlage „${options.name}": autoReply.toField „${options.autoReply.toField}" fehlt in fields.`
		);
	}
	return {
		name: options.name,
		label: options.label ?? options.name,
		fields: options.fields,
		to: options.to,
		replyToField: options.replyToField,
		subject: options.subject,
		body: options.body,
		autoReply: options.autoReply,
		honeypot: options.honeypot ?? 'website',
		maxTotalSize: options.maxTotalSize ?? 32 * 1024 * 1024,
		captcha: options.captcha ?? true
	};
}

export function localizedText(text: LocalizedText, lang: string, fallback: string): string {
	if (typeof text === 'string') return text;
	return text[lang] ?? text[fallback] ?? Object.values(text)[0] ?? '';
}
