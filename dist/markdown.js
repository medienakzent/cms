import { marked } from 'marked';
const SAFE_PROTOCOLS = /^(https?:|mailto:|tel:)/i;
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => {
        switch (character) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            default:
                return '&#39;';
        }
    });
}
/** Only relative links and http(s), mailto and tel targets are allowed. */
export function safeUrl(href) {
    const trimmed = href.trim();
    if (!trimmed)
        return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed))
        return SAFE_PROTOCOLS.test(trimmed) ? trimmed : null;
    return trimmed;
}
const renderer = new marked.Renderer();
renderer.html = ({ text }) => escapeHtml(text);
renderer.link = function (token) {
    const href = safeUrl(token.href);
    const inner = this.parser.parseInline(token.tokens);
    if (!href)
        return inner;
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
    const external = /^https?:/i.test(href) ? ' rel="noopener"' : '';
    return `<a href="${escapeHtml(href)}"${title}${external}>${inner}</a>`;
};
renderer.image = ({ href, title, text }) => {
    const source = safeUrl(href);
    if (!source)
        return escapeHtml(text);
    const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
    return `<img src="${escapeHtml(source)}" alt="${escapeHtml(text)}"${titleAttribute}>`;
};
/** Markdown from editors: raw HTML is escaped, link targets are restricted. */
export function renderMarkdown(source) {
    return marked.parse(source ?? '', { async: false, renderer });
}
