import type { FieldMap } from '../../fields';
/** Neutralizes Markdown/HTML-relevant characters in user input. */
export declare function escapeValue(value: unknown): string;
/** All fields as a Markdown list, used by `{{all}}`. */
export declare function renderAllFields(fields: FieldMap, data: Record<string, unknown>, prefix?: string): string;
/** Replaces `{{path}}` in a template; values are escaped, `{{all}}` lists all fields. */
export declare function renderTemplate(template: string, fields: FieldMap, data: Record<string, unknown>, extra?: Record<string, string>): string;
/** All file fields as a list, used by `{{files}}`. */
export declare function renderFiles(fields: FieldMap, data: Record<string, unknown>): string;
/** Markdown to HTML mail with minimal inline style. */
export declare function toHtml(markdown: string): string;
/** Markdown to plain text (markup removed, escapes resolved). */
export declare function toText(markdown: string): string;
