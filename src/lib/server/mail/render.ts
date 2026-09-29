import { marked } from 'marked';
import type { Field, FieldMap } from '../../fields';
import { fieldLabel } from '../../fields';

/** Markdown-/HTML-relevante Zeichen in Nutzereingaben neutralisieren. */
export function escapeValue(v: unknown): string {
	const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join(', ') : String(v);
	return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c).replace(/([\\`*_{}[\]()#+!|~])/g, '\\$1');
}

function lookup(data: Record<string, unknown>, path: string): unknown {
	return path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), data);
}

function isFileRef(v: unknown): v is { name: string; size: number; url: string } {
	return typeof v === 'object' && v !== null && 'url' in v && 'size' in v && 'name' in v;
}

export function formatSize(bytes: number): string {
	const mb = bytes / 1048576;
	return mb < 0.1 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${mb.toFixed(1).replace('.', ',')} MB`;
}

/** Datei als Markdown-Link: Name (Größe). */
function fileMarkdown(v: { name: string; size: number; url: string }): string {
	return `[${escapeValue(v.name)}](${v.url}) (${formatSize(v.size)})`;
}

function valueToText(field: Field, v: unknown): string {
	if (field.kind === 'boolean') return v ? 'Ja' : 'Nein';
	if (field.kind === 'file') return isFileRef(v) ? `${v.name} (${formatSize(v.size)})` : '';
	if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' && x ? JSON.stringify(x) : String(x))).join(', ');
	if (v && typeof v === 'object') return JSON.stringify(v);
	return v === null || v === undefined ? '' : String(v);
}

/** Alle Felder als Markdown-Liste — für `{{all}}`. */
export function renderAllFields(fields: FieldMap, data: Record<string, unknown>, prefix = ''): string {
	const lines: string[] = [];
	for (const [key, field] of Object.entries(fields)) {
		const v = data?.[key];
		if (field.kind === 'group') {
			lines.push(renderAllFields(field.fields, (v as Record<string, unknown>) ?? {}, `${prefix}${fieldLabel(key, field)} › `));
			continue;
		}
		if (field.kind === 'file') {
			if (isFileRef(v)) lines.push(`**${prefix}${fieldLabel(key, field)}:** ${fileMarkdown(v)}`);
			continue;
		}
		const text = valueToText(field, v);
		if (!text) continue;
		const multiline = text.includes('\n');
		lines.push(multiline ? `**${prefix}${fieldLabel(key, field)}**\n\n${escapeValue(text).replace(/\n/g, '  \n')}\n` : `**${prefix}${fieldLabel(key, field)}:** ${escapeValue(text)}`);
	}
	return lines.join('\n');
}

/** Ersetzt `{{pfad}}` in einer Vorlage; Werte werden escaped, `{{all}}` listet alle Felder. */
export function renderTemplate(template: string, fields: FieldMap, data: Record<string, unknown>, extra: Record<string, string> = {}): string {
	return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, path: string) => {
		if (path === 'all') return renderAllFields(fields, data);
		if (path === 'files') return renderFiles(fields, data);
		if (path.startsWith('meta.')) return escapeValue(extra[path.slice(5)] ?? '');
		const v = lookup(data, path);
		if (v === undefined) return '';
		const field = path.split('.').reduce<Field | FieldMap | undefined>((acc, key) => {
			if (!acc) return undefined;
			if ('kind' in acc) return acc.kind === 'group' ? acc.fields[key] : undefined;
			return (acc as FieldMap)[key];
		}, fields);
		if (field && 'kind' in field && (field as Field).kind === 'file') return isFileRef(v) ? fileMarkdown(v) : '';
		const text = field && 'kind' in field ? valueToText(field as Field, v) : String(v);
		return escapeValue(text).replace(/\n/g, '  \n');
	});
}

/** Alle Datei-Felder als Liste — für `{{files}}`. */
export function renderFiles(fields: FieldMap, data: Record<string, unknown>): string {
	const lines: string[] = [];
	for (const [key, field] of Object.entries(fields)) {
		if (field.kind !== 'file') continue;
		const v = data?.[key];
		if (isFileRef(v)) lines.push(`- **${fieldLabel(key, field)}:** ${fileMarkdown(v)}`);
	}
	return lines.join('\n');
}

/** Markdown → HTML-Mail mit minimalem Inline-Stil. */
export function toHtml(markdown: string): string {
	const body = marked.parse(markdown, { async: false }) as string;
	return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:640px;margin:0 auto;padding:24px">${body}</body></html>`;
}

/** Markdown → Text-Fassung (Markup entfernt, Escapes aufgelöst). */
export function toText(markdown: string): string {
	return markdown
		.replace(/\\([\\`*_{}[\]()#+!|~])/g, '$1')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 <$2>')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/ {2}\n/g, '\n');
}
