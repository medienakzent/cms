import { marked } from 'marked';
import { fieldLabel } from '../../fields';
import { formatBytes } from '../../format';
/** Neutralizes Markdown/HTML-relevant characters in user input. */
export function escapeValue(value) {
    const text = value === null || value === undefined
        ? ''
        : Array.isArray(value)
            ? value.join(', ')
            : String(value);
    return text
        .replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character] ?? character)
        .replace(/([\\`*_{}[\]()#+!|~])/g, '\\$1');
}
function lookup(data, path) {
    return path
        .split('.')
        .reduce((current, key) => current && typeof current === 'object'
        ? current[key]
        : undefined, data);
}
function isFileRef(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'url' in value &&
        'size' in value &&
        'name' in value);
}
/** File as Markdown link: name (size). */
function fileMarkdown(file) {
    return `[${escapeValue(file.name)}](${file.url}) (${formatBytes(file.size)})`;
}
function valueToText(field, value) {
    if (field.kind === 'boolean')
        return value ? 'Ja' : 'Nein';
    if (field.kind === 'file')
        return isFileRef(value) ? `${value.name} (${formatBytes(value.size)})` : '';
    if (Array.isArray(value))
        return value
            .map((item) => (typeof item === 'object' && item ? JSON.stringify(item) : String(item)))
            .join(', ');
    if (value && typeof value === 'object')
        return JSON.stringify(value);
    return value === null || value === undefined ? '' : String(value);
}
/** All fields as a Markdown list, used by `{{all}}`. */
export function renderAllFields(fields, data, prefix = '') {
    const lines = [];
    for (const [key, field] of Object.entries(fields)) {
        const value = data?.[key];
        if (field.kind === 'group') {
            lines.push(renderAllFields(field.fields, value ?? {}, `${prefix}${fieldLabel(key, field)} › `));
            continue;
        }
        if (field.kind === 'file') {
            if (isFileRef(value))
                lines.push(`**${prefix}${fieldLabel(key, field)}:** ${fileMarkdown(value)}`);
            continue;
        }
        const text = valueToText(field, value);
        if (!text)
            continue;
        const multiline = text.includes('\n');
        lines.push(multiline
            ? `**${prefix}${fieldLabel(key, field)}**\n\n${escapeValue(text).replace(/\n/g, '  \n')}\n`
            : `**${prefix}${fieldLabel(key, field)}:** ${escapeValue(text)}`);
    }
    return lines.join('\n');
}
/** Replaces `{{path}}` in a template; values are escaped, `{{all}}` lists all fields. */
export function renderTemplate(template, fields, data, extra = {}) {
    return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, path) => {
        if (path === 'all')
            return renderAllFields(fields, data);
        if (path === 'files')
            return renderFiles(fields, data);
        if (path.startsWith('meta.'))
            return escapeValue(extra[path.slice(5)] ?? '');
        const value = lookup(data, path);
        if (value === undefined)
            return '';
        const field = path.split('.').reduce((current, key) => {
            if (!current)
                return undefined;
            if ('kind' in current)
                return current.kind === 'group' ? current.fields[key] : undefined;
            return current[key];
        }, fields);
        if (field && 'kind' in field && field.kind === 'file')
            return isFileRef(value) ? fileMarkdown(value) : '';
        const text = field && 'kind' in field ? valueToText(field, value) : String(value);
        return escapeValue(text).replace(/\n/g, '  \n');
    });
}
/** All file fields as a list, used by `{{files}}`. */
export function renderFiles(fields, data) {
    const lines = [];
    for (const [key, field] of Object.entries(fields)) {
        if (field.kind !== 'file')
            continue;
        const value = data?.[key];
        if (isFileRef(value))
            lines.push(`- **${fieldLabel(key, field)}:** ${fileMarkdown(value)}`);
    }
    return lines.join('\n');
}
/** Markdown to HTML mail with minimal inline style. */
export function toHtml(markdown) {
    const body = marked.parse(markdown, { async: false });
    return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:640px;margin:0 auto;padding:24px">${body}</body></html>`;
}
/** Markdown to plain text (markup removed, escapes resolved). */
export function toText(markdown) {
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
