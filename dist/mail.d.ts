/**
 * Mail templates, defined per customer in `src/mail/<name>.ts` with the same field
 * system as blocks: fields are validated, subject and body are Markdown with
 * placeholders (`{{name}}`, `{{seo.title}}`, `{{all}}`).
 *
 * Sending: `cms.mail.send('contact', data, { lang })` or publicly via
 * `POST /api/mail/contact` (contact/request forms, with rate limit and honeypot).
 */
import type { FieldMap } from './fields';
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
export declare function defineMail<const Fields extends FieldMap>(options: MailTemplateOptions<Fields>): MailTemplateDefinition<Fields>;
export declare function localizedText(text: LocalizedText, lang: string, fallback: string): string;
