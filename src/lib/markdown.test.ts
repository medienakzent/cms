import { describe, expect, it } from 'vitest';
import { renderMarkdown, safeUrl } from './markdown';

describe('renderMarkdown', () => {
	it('escapes raw HTML from editors', () => {
		const html = renderMarkdown('Hallo <img src=x onerror="alert(1)"> Welt');
		expect(html).not.toContain('<img');
		expect(html).toContain('&lt;img');
	});

	it('escapes HTML blocks', () => {
		expect(renderMarkdown('<script>alert(1)</script>')).not.toContain('<script>');
	});

	it('drops javascript links but keeps the text', () => {
		const html = renderMarkdown('[klick](javascript:alert(1))');
		expect(html).not.toContain('javascript:');
		expect(html).toContain('klick');
	});

	it('keeps http links, relative links and mail links', () => {
		expect(renderMarkdown('[a](https://example.com)')).toContain('href="https://example.com"');
		expect(renderMarkdown('[a](/seite)')).toContain('href="/seite"');
		expect(renderMarkdown('[a](mailto:x@example.com)')).toContain('href="mailto:x@example.com"');
	});

	it('renders images only with safe sources', () => {
		expect(renderMarkdown('![alt](javascript:x)')).not.toContain('<img');
		expect(renderMarkdown('![alt](/media/a.webp)')).toContain(
			'<img src="/media/a.webp" alt="alt">'
		);
	});

	it('still renders formatting', () => {
		expect(renderMarkdown('**fett** und *kursiv*')).toBe(
			'<p><strong>fett</strong> und <em>kursiv</em></p>\n'
		);
	});
});

describe('safeUrl', () => {
	it('rejects unknown protocols', () => {
		expect(safeUrl('data:text/html,x')).toBeNull();
		expect(safeUrl('vbscript:x')).toBeNull();
		expect(safeUrl(' JAVASCRIPT:alert(1)')).toBeNull();
	});
	it('accepts anchors and relative paths', () => {
		expect(safeUrl('#top')).toBe('#top');
		expect(safeUrl('bilder/a.png')).toBe('bilder/a.png');
	});
});
